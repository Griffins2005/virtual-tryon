import React, { useMemo, useState } from 'react';
import { useStore }       from '../store/useStore';
import { getItemsByMode } from '../assets/catalog';
import type { TryOnMode, Landmark } from '../types';

// ─── Static catalog string — computed once, cached in system prompt ───────────
const MODES: TryOnMode[] = ['glasses', 'makeup', 'clothing', 'accessories'];
const CATALOG = MODES.flatMap(cat =>
  getItemsByMode(cat).map(i => `${cat}/${i.id} "${i.name}" [${i.colors.slice(0,3).join(',')}]`)
).join('\n');

// System prompt is static → eligible for Anthropic prompt caching
const SYSTEM_PROMPT = `You are an expert personal stylist embedded in a virtual try-on app.

CATALOG (category/id "name" [sample colors]):
${CATALOG}

RULES:
- Respond ONLY with valid JSON — no markdown fences, no explanation outside the JSON
- Schema: {"recommendations":[{"item":"<name>","itemId":"<id>","color":"<hex>","reason":"<≤15 words>","vibe":"<2–3 words>"}],"overall_vibe":"<3–5 words>","style_tip":"<≤18 words>","face_insight":"<≤20 words, only if face_shape provided>"}
- Exactly 3 recommendations; itemId must exist in CATALOG
- Choose colors that complement the user's skin tone and face shape when provided
- Face shape guidance: oval=any frame; round=angular/square frames; square=round/oval frames; heart=light bottom-heavy frames; oblong=wide oversized frames`;

// ─── Face shape detection from MediaPipe landmarks ───────────────────────────
function detectFaceShape(lm: Landmark[]): string | null {
  const le   = lm[234]; const re   = lm[454]; // ears
  const fore = lm[10];  const chin = lm[152]; // forehead / chin
  const lJaw = lm[172]; const rJaw = lm[397]; // jaw corners
  if (!le || !re || !fore || !chin) return null;

  const faceW = Math.abs(re.x - le.x);
  const faceH = Math.abs(chin.y - fore.y);
  if (faceW < 0.01 || faceH < 0.01) return null;

  const jawW   = (lJaw && rJaw) ? Math.abs(rJaw.x - lJaw.x) : faceW * 0.72;
  const ratio  = faceW / faceH;
  const jawRat = jawW  / faceW;

  if (ratio  > 0.87)  return 'round';
  if (ratio  < 0.64)  return 'oblong';
  if (jawRat > 0.80)  return 'square';
  if (ratio  < 0.74 && jawRat < 0.67) return 'heart';
  return 'oval';
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Rec {
  item: string; itemId: string; color: string; reason: string; vibe: string;
}
interface AIResp {
  recommendations: Rec[];
  overall_vibe: string;
  style_tip: string;
  face_insight?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export const AIStyleAdvisor: React.FC = () => {
  const { mode, selectedItemId, config, detection, setMode, setSelectedItem, setConfig } = useStore();

  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<AIResp | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [prompt,  setPrompt]  = useState('');

  const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
  const API_URL = (import.meta.env.VITE_ANTHROPIC_API_URL as string | undefined)
    ?? 'https://api.anthropic.com/v1/messages';
  const hasKey  = Boolean(API_KEY);

  const currentItem = getItemsByMode(mode).find(i => i.id === selectedItemId);

  // Compute face shape live from current landmarks
  const faceShape = useMemo(
    () => detection.landmarks ? detectFaceShape(detection.landmarks) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [detection.detected] // recompute when detection state changes
  );

  const getAdvice = async () => {
    if (!API_KEY) return;
    setLoading(true); setError(null); setResult(null);

    // Dynamic user context — goes in message, not system (system is cached)
    const ctx = [
      faceShape ? `Detected face shape: ${faceShape}.` : '',
      `Currently trying: ${currentItem?.name ?? 'nothing'} (${mode}), color ${config.color}.`,
      prompt.trim() ? `User says: "${prompt.trim()}"` : '',
    ].filter(Boolean).join(' ');

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'content-type':                           'application/json',
          'x-api-key':                              API_KEY,
          'anthropic-version':                      '2023-06-01',
          'anthropic-beta':                         'prompt-caching-2024-07-31',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model:      'claude-sonnet-4-6',
          max_tokens: 1024,
          system: [
            {
              type: 'text',
              text: SYSTEM_PROMPT,
              cache_control: { type: 'ephemeral' },  // cache the long static system prompt
            },
          ],
          messages: [{ role: 'user', content: ctx }],
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        const msg  = (() => {
          try { return (JSON.parse(body) as { error?: { message?: string } }).error?.message ?? body; }
          catch { return body.slice(0, 200); }
        })();
        throw new Error(`${res.status}: ${msg}`);
      }

      const data = await res.json() as { content?: { type: string; text: string }[] };
      const text = data?.content?.[0]?.text ?? '';
      if (!text.trim()) throw new Error('Empty response from Claude.');

      // Strip any accidental markdown fences
      const clean = text.replace(/^```json\s*/i, '').replace(/```$/g, '').trim();
      setResult(JSON.parse(clean) as AIResp);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        msg.includes('401')  ? 'Invalid API key — check VITE_ANTHROPIC_API_KEY in .env.' :
        msg.includes('403')  ? 'Forbidden — ensure direct browser access is enabled for your key.' :
        msg.includes('529')  ? 'Claude is overloaded right now. Try again in a moment.' :
        `Style advice failed: ${msg}`
      );
      console.error('[AIStyleAdvisor]', e);
    } finally {
      setLoading(false);
    }
  };

  const apply = (rec: Rec) => {
    const all   = MODES.flatMap(getItemsByMode);
    const found = all.find(i => i.id === rec.itemId);
    if (!found) return;
    if (found.category !== mode) setMode(found.category);
    setSelectedItem(rec.itemId);
    if (rec.color) setConfig({ color: rec.color });
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Header row */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:'2.5px', color:'var(--blue)', textTransform:'uppercase', marginBottom:3 }}>
            AI Stylist
          </div>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>Style Advisor</div>
        </div>
        {faceShape && (
          <div style={{
            padding:'3px 10px', borderRadius:'var(--r-full)',
            background:'rgba(77,158,255,0.10)', border:'1px solid rgba(77,158,255,0.22)',
            fontSize:10, color:'var(--blue)', fontWeight:600, textTransform:'capitalize',
          }}>
            {faceShape} face
          </div>
        )}
      </div>

      {/* Prompt */}
      <textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder="Describe your style, occasion, or anything… (optional)"
        className="text-area"
        style={{ minHeight:60 }}
        rows={2}
      />

      {/* CTA button */}
      <button
        onClick={getAdvice}
        disabled={loading || !hasKey}
        style={{
          width:'100%', padding:'11px 0',
          background: (loading || !hasKey)
            ? 'var(--surface2)'
            : 'linear-gradient(135deg, rgba(77,158,255,0.18), rgba(200,255,0,0.10))',
          border: (loading || !hasKey)
            ? '1px solid var(--border)'
            : '1px solid rgba(77,158,255,0.35)',
          borderRadius:'var(--r-sm)',
          color: (loading || !hasKey) ? 'var(--text3)' : 'var(--blue)',
          fontFamily:'inherit', fontSize:13, fontWeight:600,
          cursor: (loading || !hasKey) ? 'not-allowed' : 'pointer',
          letterSpacing:'0.4px', transition:'all 0.15s',
        }}
      >
        {loading ? <LoadingDots /> : !hasKey ? '✦ API key required' : '✦ Get Style Advice'}
      </button>

      {/* No API key hint */}
      {!hasKey && (
        <div style={{
          fontSize:11, color:'var(--text3)', lineHeight:1.6,
          padding:'8px 10px', background:'var(--surface2)',
          borderRadius:'var(--r-xs)', border:'1px solid var(--border)',
        }}>
          Add <code style={{color:'var(--accent)',fontSize:10}}>VITE_ANTHROPIC_API_KEY=sk-ant-…</code> to{' '}
          <code style={{color:'var(--accent)',fontSize:10}}>.env</code> to enable the stylist.
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          fontSize:11, color:'#ff9090', lineHeight:1.6,
          padding:'8px 10px', background:'rgba(255,92,92,0.07)',
          borderRadius:'var(--r-xs)', border:'1px solid rgba(255,92,92,0.2)',
        }}>
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>

          {/* Vibe banner */}
          <div style={{
            padding:'10px 12px', borderRadius:'var(--r-sm)',
            background:'linear-gradient(135deg, rgba(200,255,0,0.06), rgba(77,158,255,0.06))',
            border:'1px solid rgba(200,255,0,0.16)',
          }}>
            <div style={{ display:'flex', alignItems:'baseline', gap:6, marginBottom:4 }}>
              <span style={{ fontSize:9, color:'var(--text3)', fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase' }}>Vibe</span>
              <span style={{ fontSize:14, color:'var(--accent)', fontWeight:700 }}>{result.overall_vibe}</span>
            </div>
            <p style={{ fontSize:11, color:'var(--text2)', lineHeight:1.55, margin:0 }}>{result.style_tip}</p>
            {result.face_insight && (
              <p style={{ fontSize:10, color:'var(--blue)', lineHeight:1.5, marginTop:6, margin:0 }}>
                ◎ {result.face_insight}
              </p>
            )}
          </div>

          {/* Recommendation cards */}
          {result.recommendations.map((rec, i) => (
            <RecCard key={i} rec={rec} onApply={() => apply(rec)} />
          ))}

          <button
            onClick={() => setResult(null)}
            className="button-small"
            style={{ alignSelf:'center', marginTop:2 }}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const RecCard: React.FC<{ rec: Rec; onApply: () => void }> = ({ rec, onApply }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onApply}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding:'10px 12px', borderRadius:'var(--r-sm)',
        background:'var(--surface2)',
        border: hovered ? '1px solid rgba(77,158,255,0.5)' : '1px solid var(--border)',
        cursor:'pointer', transition:'border-color 0.13s, background 0.13s',
      }}
    >
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
        <div style={{
          width:16, height:16, borderRadius:'50%', flexShrink:0,
          background: rec.color,
          border:'1.5px solid rgba(255,255,255,0.12)',
          boxShadow:'0 2px 6px rgba(0,0,0,0.4)',
        }} />
        <span style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>{rec.item}</span>
        <span style={{
          marginLeft:'auto', fontSize:9, padding:'2px 7px',
          borderRadius:'var(--r-full)', background:'var(--surface3)',
          color:'var(--text3)', letterSpacing:'0.5px', fontWeight:600,
        }}>
          {rec.vibe}
        </span>
      </div>
      <p style={{ fontSize:11, color:'var(--text3)', lineHeight:1.55, margin:0 }}>{rec.reason}</p>
      <span style={{ fontSize:10, color:'var(--blue)', display:'block', marginTop:5 }}>
        ↩ Tap to apply
      </span>
    </div>
  );
};

const LoadingDots: React.FC = () => (
  <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
    <span>✦ Styling</span>
    {[0,1,2].map(i => (
      <span key={i} style={{
        width:4, height:4, borderRadius:'50%', background:'var(--blue)',
        display:'inline-block',
        animation:`ai-dot 1.2s ${i*0.2}s ease-in-out infinite`,
      }} />
    ))}
    <style>{`@keyframes ai-dot{0%,80%,100%{opacity:.2;transform:scale(0.8)}40%{opacity:1;transform:scale(1)}}`}</style>
  </span>
);
