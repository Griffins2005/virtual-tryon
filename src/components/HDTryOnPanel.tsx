import React, { useRef, useState } from 'react';
import { useStore }         from '../store/useStore';
import { useHistory }       from '../store/useHistory';
import { generateHDTryOn }  from '../utils/hdTryOn';
import { cameraEls }        from '../store/cameraRefs';

type Status = 'idle' | 'generating' | 'done' | 'error';

const STEPS = [
  'Rendering garment flat-lay…',
  'Generating torso mask from pose…',
  'Connecting to CatVTON…',
  'Running diffusion (30-60 s)…',
  'Compositing result…',
];

export const HDTryOnPanel: React.FC = () => {
  const { mode, selectedItemId, config, cameraActive, detection } = useStore();
  const { addSnapshot } = useHistory();

  const [status,   setStatus]   = useState<Status>('idle');
  const [stepIdx,  setStepIdx]  = useState(0);
  const [resultUrl, setResult]  = useState<string | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poseLandmarks = useRef<import('../types/pose').PoseLandmark[] | null>(null);

  // Access latest pose from the store (detection only has face, pose goes via onResults callback)
  // We keep a module-level latest-pose ref updated by CameraViewport — instead, we pull it from
  // the tracking hook via a custom event that CameraViewport dispatches.
  React.useEffect(() => {
    const handler = (e: Event) => {
      poseLandmarks.current = (e as CustomEvent).detail?.poseLandmarks ?? null;
    };
    window.addEventListener('tracking-results', handler);
    return () => window.removeEventListener('tracking-results', handler);
  }, []);

  const canGenerate = cameraActive && mode === 'clothing' && detection.detected && !!selectedItemId;

  const animateSteps = () => {
    let idx = 0;
    setStepIdx(0);
    intervalRef.current = setInterval(() => {
      idx++;
      if (idx < STEPS.length) setStepIdx(idx);
      else { clearInterval(intervalRef.current!); intervalRef.current = null; }
    }, 5000);
  };

  const handleGenerate = async () => {
    const video  = cameraEls.video;
    const canvas = cameraEls.canvas;
    if (!video || !canvas || !selectedItemId) return;

    setStatus('generating');
    setError(null);
    setResult(null);
    animateSteps();

    try {
      const result = await generateHDTryOn({
        videoEl:       video,
        canvasEl:      canvas,
        itemId:        selectedItemId,
        color:         config.color,
        poseLandmarks: poseLandmarks.current,
      });

      setResult(result.dataUrl);
      setStatus('done');

      // Auto-add to history
      addSnapshot({
        id:        `hd-${Date.now()}`,
        dataUrl:   result.dataUrl,
        mode:      'clothing',
        item:      `HD: ${selectedItemId}`,
        timestamp: Date.now(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.includes('404') || msg.includes('not found')
        ? 'CatVTON Space is currently unavailable. Try again in a few minutes or check your VITE_CATVTON_SPACE config.'
        : msg.includes('token') || msg.includes('401')
        ? 'HF token invalid. Set VITE_HF_TOKEN in your .env for authenticated access.'
        : `Generation failed: ${msg}`
      );
      setStatus('error');
    } finally {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setResult(null);
    setError(null);
    setStepIdx(0);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:'2px', color:'var(--purple)', textTransform:'uppercase', marginBottom:4 }}>
            Photorealistic
          </div>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>HD Try-On</div>
        </div>
        <div style={{
          padding:'3px 10px', borderRadius:'var(--r-full)',
          background:'rgba(139,111,240,0.12)', border:'1px solid rgba(139,111,240,0.25)',
          fontSize:10, color:'var(--purple)', fontWeight:600,
        }}>
          CatVTON
        </div>
      </div>

      {/* Info card */}
      <div style={{
        background:'var(--surface2)', border:'1px solid var(--border)',
        borderRadius:'var(--r-sm)', padding:'10px 12px',
        fontSize:11, color:'var(--text3)', lineHeight:1.7,
      }}>
        Generates a photorealistic photo of you wearing the selected garment using
        the <span style={{color:'var(--purple)'}}>CatVTON</span> diffusion model.
        Requires a live camera feed with pose detected. Takes 30–60 s.
      </div>

      {/* Idle state */}
      {status === 'idle' && (
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          style={{
            width:'100%',
            padding:'12px 0',
            background: canGenerate
              ? 'linear-gradient(135deg, rgba(139,111,240,0.25), rgba(200,255,0,0.12))'
              : 'var(--surface2)',
            border: canGenerate
              ? '1px solid rgba(139,111,240,0.4)'
              : '1px solid var(--border)',
            borderRadius:'var(--r-sm)',
            color: canGenerate ? 'var(--text)' : 'var(--text3)',
            fontFamily:'inherit',
            fontSize:13, fontWeight:600,
            cursor: canGenerate ? 'pointer' : 'not-allowed',
            transition:'all 0.15s',
          }}
          onMouseEnter={e => { if (canGenerate) e.currentTarget.style.borderColor = 'rgba(139,111,240,0.7)'; }}
          onMouseLeave={e => { if (canGenerate) e.currentTarget.style.borderColor = 'rgba(139,111,240,0.4)'; }}
        >
          {!cameraActive
            ? '⚠ Start camera first'
            : !detection.detected
            ? '⚠ Waiting for pose detection…'
            : mode !== 'clothing'
            ? '⚠ Switch to Clothing mode'
            : '✦ Generate HD Preview'}
        </button>
      )}

      {/* Generating state */}
      {status === 'generating' && (
        <div style={{
          background:'var(--surface2)', border:'1px solid rgba(139,111,240,0.2)',
          borderRadius:'var(--r-sm)', padding:'14px',
          display:'flex', flexDirection:'column', gap:10,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Spinner />
            <span style={{ fontSize:12, color:'var(--text2)', fontWeight:500 }}>
              {STEPS[stepIdx]}
            </span>
          </div>
          {/* Step dots */}
          <div style={{ display:'flex', gap:5, paddingLeft:26 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                width:6, height:6, borderRadius:'50%',
                background: i <= stepIdx ? 'var(--purple)' : 'var(--surface3)',
                transition:'background 0.3s',
              }} />
            ))}
          </div>
          <div style={{ fontSize:10, color:'var(--text3)', paddingLeft:26 }}>
            Results are added to History automatically.
          </div>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{
            background:'rgba(255,92,92,0.07)', border:'1px solid rgba(255,92,92,0.2)',
            borderRadius:'var(--r-sm)', padding:'10px 12px',
            fontSize:11, color:'#ff9090', lineHeight:1.6,
          }}>
            {error}
          </div>
          <button
            onClick={handleReset}
            className="button-outline"
            style={{ width:'100%' }}
          >
            Try again
          </button>
        </div>
      )}

      {/* Done state */}
      {status === 'done' && resultUrl && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{
            borderRadius:'var(--r-sm)', overflow:'hidden',
            border:'1px solid rgba(139,111,240,0.3)',
            aspectRatio:'3/4', background:'#000',
          }}>
            <img src={resultUrl} alt="HD try-on result" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button
              className="button-primary"
              style={{ flex:1, fontSize:12 }}
              onClick={() => {
                const a = document.createElement('a');
                a.download = `hd-tryon-${Date.now()}.png`;
                a.href     = resultUrl;
                a.click();
              }}
            >
              ↓ Save
            </button>
            <button
              className="button-outline"
              style={{ flex:1, fontSize:12 }}
              onClick={handleReset}
            >
              New
            </button>
          </div>
          <div style={{ fontSize:10, color:'var(--text3)', textAlign:'center' }}>
            Also saved to History tab ↑
          </div>
        </div>
      )}

      {/* Config hint */}
      {!import.meta.env.VITE_HF_TOKEN && status === 'idle' && (
        <div style={{
          fontSize:10, color:'var(--text3)', padding:'8px 10px',
          background:'var(--surface2)', borderRadius:'var(--r-xs)',
          border:'1px solid var(--border)', lineHeight:1.6,
        }}>
          Add <code style={{color:'var(--accent)',fontSize:10}}>VITE_HF_TOKEN=hf_…</code> to{' '}
          <code style={{color:'var(--accent)',fontSize:10}}>.env</code> for higher rate limits.
        </div>
      )}
    </div>
  );
};

const Spinner: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" style={{ animation:'spin 1s linear infinite', flexShrink:0 }}>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    <circle cx="8" cy="8" r="6" fill="none" stroke="var(--purple)" strokeWidth="2" strokeDasharray="24" strokeDashoffset="8" />
  </svg>
);
