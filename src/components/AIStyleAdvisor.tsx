import React, { useState } from 'react';
import { useStore }       from '../store/useStore';
import { getItemsByMode } from '../assets/catalog';
import type { TryOnMode } from '../types';

interface Recommendation {
  item: string;
  itemId: string;
  color: string;
  reason: string;
  vibe: string;
}

interface AIResponse {
  recommendations: Recommendation[];
  overall_vibe: string;
  style_tip: string;
}

export const AIStyleAdvisor: React.FC = () => {
  const { mode, selectedItemId, config, setMode, setSelectedItem, setConfig } = useStore();
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<AIResponse | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [prompt,  setPrompt]  = useState('');

  const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
  const API_URL = import.meta.env.VITE_ANTHROPIC_API_URL ?? 'https://api.anthropic.com/v1/messages';
  const hasApiKey = Boolean(API_KEY);

  const currentItem = getItemsByMode(mode).find(i => i.id === selectedItemId);
  const modes: TryOnMode[] = ['glasses','makeup','clothing','accessories'];

  const getRecommendations = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    if (!API_KEY) {
      setError('AI Style Advisor requires VITE_ANTHROPIC_API_KEY in your .env file.');
      setLoading(false);
      return;
    }

    const catalog = modes.flatMap((cat) =>
      getItemsByMode(cat).map(i => `${cat}/${i.id}: ${i.name}`)
    ).join(', ');

    const userContext = prompt.trim()
      ? `User described themselves as: "${prompt}".`
      : `User is currently wearing: ${currentItem?.name ?? 'nothing'} in ${mode} category, color ${config.color}.`;

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `You are a personal fashion stylist AI embedded in a virtual try-on app.
Available items: ${catalog}.
Respond ONLY with valid JSON matching this schema exactly, no markdown, no explanation:
{
  "recommendations": [
    {"item": "<display name>", "itemId": "<id>", "color": "<hex>", "reason": "<one sentence>", "vibe": "<2-3 word vibe tag>"}
  ],
  "overall_vibe": "<2-4 word style description>",
  "style_tip": "<one actionable tip under 20 words>"
}
Give exactly 3 recommendations. itemId must be from the available items list. Colors as hex.`,
          messages: [{ role: 'user', content: userContext }],
        }),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(`API error ${res.status}: ${message.slice(0, 120)}`);
      }

      const data = await res.json();
      const text = typeof data?.completion === 'string'
        ? data.completion
        : data?.content?.[0]?.text
          ?? data?.output?.[0]?.content?.[0]?.text
          ?? data?.results?.[0]?.content?.[0]?.text
          ?? '';

      if (!text.trim()) throw new Error('Empty AI response');

      let parsed: AIResponse;
      try {
        parsed = JSON.parse(text);
      } catch (error) {
        throw new Error(`Failed to parse AI JSON response: ${text}`, { cause: error });
      }

      setResult(parsed);
    } catch (e) {
      setError('Style advisor unavailable — please verify your Anthropic API key and network connection.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const applyRecommendation = (rec: Recommendation) => {
    const allItems = modes.flatMap(getItemsByMode);
    const found = allItems.find(i => i.id === rec.itemId);
    if (found) {
      if (found.category !== mode) setMode(found.category);
      setSelectedItem(rec.itemId);
      if (rec.color) setConfig({ color: rec.color });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '2px', color: '#6baaff', textTransform: 'uppercase' }}>
        AI Style Advisor
      </div>

      {/* Prompt input */}
      <div>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Describe your style, occasion, or ask anything... (optional)"
          style={{
            width: '100%', background: '#0f0f18', border: '1px solid #2a2a35',
            borderRadius: '8px', color: '#c0c0c0', fontFamily: 'inherit',
            fontSize: '12px', padding: '8px 10px', resize: 'none',
            lineHeight: 1.5, outline: 'none', minHeight: '60px',
          }}
          onFocus={e => (e.target.style.borderColor = '#6baaff')}
          onBlur={e  => (e.target.style.borderColor = '#2a2a35')}
        />
      </div>

      <button
        onClick={getRecommendations}
        disabled={loading || !hasApiKey}
        style={{
          padding: '9px 0', background: loading || !hasApiKey ? '#1a1a2e' : 'linear-gradient(135deg, #6baaff22, #c8ff0022)',
          border: '1px solid #6baaff44', borderRadius: '8px',
          color: loading || !hasApiKey ? '#444' : '#6baaff', fontFamily: 'inherit',
          fontSize: '12px', fontWeight: 600, cursor: loading || !hasApiKey ? 'not-allowed' : 'pointer',
          letterSpacing: '0.5px', transition: 'all 0.2s',
        }}
      >
        {loading ? '✦ Consulting AI stylist...' : !hasApiKey ? '✦ API key required' : '✦ Get Style Advice'}
      </button>

      {!hasApiKey && (
        <p style={{ fontSize: '11px', color: '#c8ff00', lineHeight: 1.5, padding: '8px', background: '#1d1d28', borderRadius: '6px', border: '1px solid #6baaff22' }}>
          Set `VITE_ANTHROPIC_API_KEY` in `.env` to enable the AI Style Advisor.
        </p>
      )}

      {error && (
        <p style={{ fontSize: '11px', color: '#ff6b6b', lineHeight: 1.5, padding: '8px', background: '#ff6b6b11', borderRadius: '6px', border: '1px solid #ff6b6b22' }}>
          {error}
        </p>
      )}

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Vibe banner */}
          <div style={{
            padding: '8px 12px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #c8ff0015, #6baaff15)',
            border: '1px solid #c8ff0030',
          }}>
            <span style={{ fontSize: '10px', color: '#666', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Vibe </span>
            <span style={{ fontSize: '13px', color: '#c8ff00', fontWeight: 700 }}>{result.overall_vibe}</span>
            <p style={{ fontSize: '11px', color: '#888', marginTop: '4px', lineHeight: 1.5 }}>{result.style_tip}</p>
          </div>

          {/* Recommendations */}
          {result.recommendations.map((rec, i) => (
            <div key={i} style={{
              padding: '10px', borderRadius: '8px', background: '#0f0f18',
              border: '1px solid #1e1e28', cursor: 'pointer', transition: 'all 0.15s',
            }}
              onClick={() => applyRecommendation(rec)}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#6baaff')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1e28')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: rec.color, border: '1.5px solid #333', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#d0d0d0' }}>{rec.item}</span>
                <span style={{ marginLeft: 'auto', fontSize: '9px', padding: '2px 7px', borderRadius: '20px', background: '#1c1c26', color: '#666', letterSpacing: '0.5px' }}>{rec.vibe}</span>
              </div>
              <p style={{ fontSize: '11px', color: '#555', lineHeight: 1.5 }}>{rec.reason}</p>
              <span style={{ fontSize: '10px', color: '#6baaff', display: 'block', marginTop: '5px' }}>↩ Tap to apply</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
