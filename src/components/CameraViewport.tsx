import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTracking, type TrackingResults } from '../hooks/useTracking';
import { renderFrame }    from '../renderers';
import { useStore }       from '../store/useStore';
import { useHistory }     from '../store/useHistory';
import { getItemsByMode } from '../assets/catalog';
import { ItemChip }       from './ItemThumbnail';
import { cameraEls }      from '../store/cameraRefs';
import { preloadSVGs }    from '../utils/AssetGenerator';
import { sampleSkinTone, resetSkinTone } from '../utils/skinTone';

export const CameraViewport: React.FC = () => {
  const { mode, selectedItemId, config, cameraActive, detection, setCameraActive, setSelectedItem } = useStore();
  const { addSnapshot } = useHistory();
  const overlayCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const currentItemName = getItemsByMode(mode).find((i) => i.id === selectedItemId)?.name ?? 'Current look';
  const items = getItemsByMode(mode);

  // Keep mutable refs for values read inside the RAF-driven handleResults callback.
  // Without this, the running tracking loop captures stale closures and doesn't
  // pick up mode / item / config changes after the camera starts.
  const modeRef         = useRef(mode);
  const selectedItemRef = useRef(selectedItemId);
  const configRef       = useRef(config);
  modeRef.current         = mode;          // sync every render
  selectedItemRef.current = selectedItemId;
  configRef.current       = config;

  // Stable callback — never changes identity, always reads latest via refs above
  const handleResults = useCallback(
    ({ faceLandmarks, poseLandmarks, handLandmarks, W, H }: TrackingResults) => {
      window.dispatchEvent(new CustomEvent('tracking-results', { detail: { poseLandmarks } }));
      if (!overlayCtxRef.current || !faceLandmarks) return;
      // Sample skin tone from video every ~10 s for adaptive makeup rendering
      if (videoRef.current) {
        sampleSkinTone(videoRef.current, faceLandmarks, W, H);
      }
      renderFrame(
        overlayCtxRef.current, faceLandmarks, W, H,
        modeRef.current, selectedItemRef.current ?? '', configRef.current,
        poseLandmarks, handLandmarks
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // intentionally stable — reads latest values via refs above
  );

  const { videoRef, canvasRef, startCamera, stopCamera } = useTracking(handleResults);
  const [cameraError, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // Preload SVG assets for the selected item whenever mode or item changes
  useEffect(() => {
    if (!selectedItemId) return;
    const item = getItemsByMode(mode).find(i => i.id === selectedItemId);
    if (item?.colors?.length) preloadSVGs(selectedItemId, item.colors);
  }, [mode, selectedItemId]);

  // Expose live elements to HDTryOnPanel via the module-level store
  useEffect(() => {
    cameraEls.video  = videoRef.current;
    cameraEls.canvas = canvasRef.current;
    return () => { cameraEls.video = null; cameraEls.canvas = null; };
  });

  const doCapture = useCallback(() => {
    const video = videoRef.current; const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const merged = document.createElement('canvas');
    merged.width = canvas.width; merged.height = canvas.height;
    const mctx = merged.getContext('2d')!;
    mctx.save(); mctx.scale(-1,1); mctx.drawImage(video,-merged.width,0,merged.width,merged.height); mctx.restore();
    mctx.drawImage(canvas, 0, 0);
    const dataUrl  = merged.toDataURL('image/png');
    const itemName = getItemsByMode(mode).find(i => i.id === selectedItemId)?.name ?? selectedItemId ?? '?';
    addSnapshot({ id: `snap-${Date.now()}`, dataUrl, mode, item: itemName, timestamp: Date.now() });
    const a = document.createElement('a'); a.download = `tryon-${Date.now()}.png`; a.href = dataUrl; a.click();
  }, [videoRef, canvasRef, mode, selectedItemId, addSnapshot]);

  // Mobile nav capture event
  useEffect(() => {
    const handler = () => { if (cameraActive) doCapture(); };
    window.addEventListener('mob-capture', handler);
    return () => window.removeEventListener('mob-capture', handler);
  }, [cameraActive, doCapture]);

  const handleStart = async () => {
    setError(null);
    setIsStarting(true);
    const error = await startCamera();
    setIsStarting(false);
    if (error) { setError(error); return; }
    if (canvasRef.current) overlayCtxRef.current = canvasRef.current.getContext('2d');
  };

  const handleStop = () => {
    stopCamera(); overlayCtxRef.current = null; setCameraActive(false); setError(null);
    resetSkinTone();
  };

  const modeLabel: Record<string, string> = {
    glasses: 'FaceMesh', makeup: 'FaceMesh 468pt', clothing: 'Pose + FaceMesh', accessories: 'Hands + FaceMesh',
  };

  const placeholderText = cameraError
    ? 'Camera unavailable — check permissions and retry.'
    : 'Start the camera to try on items in real time.';

  return (
    <div className="camera-stage">
      <div className="camera-sheet">
        <div className="camera-card">
          <video ref={videoRef} className="camera-video" style={{ display: cameraActive ? 'block' : 'none' }} autoPlay playsInline muted />
          <canvas ref={canvasRef} className="camera-canvas" style={{ display: cameraActive ? 'block' : 'none' }} />

          {/* Corner brackets */}
          <div className="camera-corner camera-corner--tl" />
          <div className="camera-corner camera-corner--tr" />
          <div className="camera-corner camera-corner--bl" />
          <div className="camera-corner camera-corner--br" />

          {cameraActive && (
            <div className="cam-badge detection-badge">
              <span className={`dot-status ${detection.detected ? 'dot-status--on' : 'dot-status--off'}`} />
              <span style={{ color: detection.detected ? 'var(--accent)' : 'var(--text3)' }}>
                {detection.detected ? 'Detected' : 'Scanning...'}
              </span>
              {detection.fps > 0 && (
                <span style={{ color: 'var(--text3)', marginLeft: 3 }}>{detection.fps} fps</span>
              )}
            </div>
          )}

          {cameraActive && <div className="cam-badge mode-badge">{modeLabel[mode] ?? mode}</div>}
          {cameraActive && <div className="cam-badge item-badge">{currentItemName}</div>}

          {!cameraActive && (
            <div className="camera-placeholder">
              <div className="placeholder-icon">◎</div>
              <p className="placeholder-text">{placeholderText}</p>
              <button
                className={`button-primary ${isStarting ? 'button-disabled' : ''}`}
                onClick={handleStart}
                disabled={isStarting}
              >
                {isStarting ? '◐ Starting...' : '▶ Start Camera'}
              </button>
              <p className="placeholder-hint">
                Allow camera access — soft front lighting gives the best results.
              </p>
            </div>
          )}

          {cameraError && <div className="error-banner">{cameraError}</div>}
        </div>
      </div>

      {/* Mobile items strip */}
      <div className="mobile-items-strip">
        {items.map(item => (
          <ItemChip
            key={item.id}
            item={item}
            selected={selectedItemId === item.id}
            onClick={() => setSelectedItem(item.id)}
          />
        ))}
      </div>

      {/* Desktop footer */}
      <div className="camera-footer">
        {!cameraActive ? (
          <>
            <button
              className={`button-primary ${isStarting ? 'button-disabled' : ''}`}
              onClick={handleStart}
              disabled={isStarting}
            >
              {isStarting ? '◐ Starting camera...' : '▶ Start Camera'}
            </button>
            {cameraError && (
              <button className="button-outline" onClick={handleStart} disabled={isStarting}>
                Retry
              </button>
            )}
          </>
        ) : (
          <>
            <button className="button-outline" onClick={doCapture}>📸 Capture</button>
            <div className="camera-footer-spacer" />
            <button className="button-outline" onClick={handleStop}>✕ Stop</button>
          </>
        )}
      </div>
    </div>
  );
};
