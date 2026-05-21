import React, { useCallback, useRef, useState } from 'react';
import { useTracking, type TrackingResults } from '../hooks/useTracking';
import { renderFrame }    from '../renderers';
import { useStore }       from '../store/useStore';
import { useHistory }     from '../store/useHistory';
import { getItemsByMode } from '../assets/catalog';

export const CameraViewport: React.FC = () => {
  const { mode, selectedItemId, config, cameraActive, detection, setCameraActive } = useStore();
  const { addSnapshot } = useHistory();
  const overlayCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const currentItemName = getItemsByMode(mode).find((i) => i.id === selectedItemId)?.name ?? 'Current look';

  const handleResults = useCallback(
    ({ faceLandmarks, poseLandmarks, handLandmarks, W, H }: TrackingResults) => {
      if (!overlayCtxRef.current || !faceLandmarks) return;
      renderFrame(overlayCtxRef.current, faceLandmarks, W, H, mode, selectedItemId ?? '', config, poseLandmarks, handLandmarks);
    },
    [mode, selectedItemId, config]
  );

  const { videoRef, canvasRef, startCamera, stopCamera } = useTracking(handleResults);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const placeholderText = cameraError
    ? 'Camera unavailable — check permission, lighting, and retry.'
    : 'Click Start Camera to begin virtual try-on.';
  const readinessText = cameraActive
    ? detection.detected
      ? 'Face lock engaged. Small head moves improve fit.'
      : 'Face not detected yet — keep your head centered.'
    : 'Allow camera access and use soft front lighting for best results.';

  const handleStart = async () => {
    setCameraError(null);
    setIsStarting(true);
    const error = await startCamera();
    setIsStarting(false);

    if (error) {
      setCameraError(error);
      return;
    }

    if (canvasRef.current) overlayCtxRef.current = canvasRef.current.getContext('2d');
  };

  const handleStop  = () => {
    stopCamera(); overlayCtxRef.current = null; setCameraActive(false); setCameraError(null);
  };

  const handleCapture = () => {
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
  };

  const modeLabel: Record<string, string> = {
    glasses: 'FaceMesh', makeup: 'FaceMesh 468pt', clothing: 'Pose + FaceMesh', accessories: 'Hands + FaceMesh',
  };

  return (
    <div className="camera-stage">
      <div className="camera-sheet">
        <div className="camera-card">
          <video ref={videoRef} className="camera-video" style={{ display: cameraActive ? 'block' : 'none' }} autoPlay playsInline muted />
          <canvas ref={canvasRef} className="camera-canvas" style={{ display: cameraActive ? 'block' : 'none' }} />

          {/* Corner deco */}
          {(['tl','tr','bl','br'] as const).map(pos => (
            <div key={pos} style={{ position:'absolute', width:26, height:26,
              top: pos[0]==='t'?14:undefined, bottom: pos[0]==='b'?14:undefined,
              left: pos[1]==='l'?14:undefined, right: pos[1]==='r'?14:undefined,
              borderTop:    pos[0]==='t'?'2px solid #c8ff00':undefined,
              borderBottom: pos[0]==='b'?'2px solid #c8ff00':undefined,
              borderLeft:   pos[1]==='l'?'2px solid #c8ff00':undefined,
              borderRight:  pos[1]==='r'?'2px solid #c8ff00':undefined,
              borderRadius: pos==='tl'?'4px 0 0 0':pos==='tr'?'0 4px 0 0':pos==='bl'?'0 0 0 4px':'0 0 4px 0',
            }} />
          ))}

          {cameraActive && (
            <div className="detection-badge">
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  display: 'inline-block',
                  background: detection.detected ? '#c8ff00' : '#444',
                  boxShadow: detection.detected ? '0 0 6px #c8ff00' : 'none',
                }}
              />
              <span style={{ fontSize: '11px', fontWeight: 500, color: detection.detected ? '#c8ff00' : '#666' }}>
                {detection.detected ? 'Detected' : 'Scanning...'}
              </span>
              {detection.fps > 0 && <span style={{ fontSize: '10px', color: '#444', marginLeft: 4 }}>{detection.fps} fps</span>}
            </div>
          )}

          {cameraActive && <div className="mode-badge">{modeLabel[mode] ?? mode}</div>}
          {cameraActive && <div className="item-badge">{currentItemName}</div>}

          {!cameraActive && (
            <div className="camera-placeholder">
              <div className="placeholder-emoji">◎</div>
              <p className="placeholder-text">{placeholderText}</p>
              <button className={`button-primary ${isStarting ? 'button-disabled' : ''}`} onClick={handleStart} disabled={isStarting}>
                {isStarting ? '◐ Starting camera...' : '▶ Start Camera'}
              </button>
              <p className="placeholder-text" style={{ color: '#777', fontSize: '11px', maxWidth: '82%' }}>{readinessText}</p>
            </div>
          )}
          {cameraError && <div className="error-banner">{cameraError}</div>}
        </div>
      </div>

      <div className="camera-footer">
        {!cameraActive ? (
          <>
            <button className={`button-primary ${isStarting ? 'button-disabled' : ''}`} onClick={handleStart} disabled={isStarting}>
              {isStarting ? '◐ Starting camera...' : '▶ Start Camera'}
            </button>
            {cameraError && !cameraActive && (
              <button className="button-outline" onClick={handleStart} disabled={isStarting}>
                Retry
              </button>
            )}
          </>
        ) : (
          <>
            <button className="button-outline" onClick={handleCapture}>📸 Capture</button>
            <div style={{ flex:1 }} />
            <button onClick={handleStop} className="button-outline">✕ Stop</button>
          </>
        )}
      </div>
    </div>
  );
};

