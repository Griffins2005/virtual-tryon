import React, { useState } from 'react';
import { useStore }       from '../store/useStore';
import { getItemsByMode } from '../assets/catalog';
import { HistoryPanel }   from './HistoryPanel';
import { AIStyleAdvisor } from './AIStyleAdvisor';
import { HDTryOnPanel }   from './HDTryOnPanel';

type Tab = 'adjust' | 'hd' | 'ai' | 'history';

export const RightPanel: React.FC = () => {
  const { mode, selectedItemId, config, detection, mobileSheet, setConfig, resetConfig } = useStore();
  const [tab, setTab] = useState<Tab>('adjust');
  const item   = getItemsByMode(mode).find(i => i.id === selectedItemId);
  const colors = item?.colors ?? [];

  const PanelContent = (
    <>
      {/* Tabs — HD tab only shown in clothing mode */}
      <div className="panel-tabs">
        {(['adjust', ...(mode === 'clothing' ? ['hd' as Tab] : []), 'ai', 'history'] as Tab[]).map((t) => (
          <button
            key={t}
            className={`panel-tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'ai' ? '✦ AI' : t === 'hd' ? '✦ HD' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="panel-body">
        {tab === 'adjust' && (
          <div className="card-block">
            {/* Selected item */}
            <div className="selected-card">
              <div className="selected-card-info">
                <div className="selected-card-sub">Selected</div>
                <div className="selected-card-name">{item?.name ?? 'None selected'}</div>
              </div>
              <div
                className="color-dot"
                style={{ background: config.color === '#silver' ? '#aaa' : config.color }}
              />
            </div>

            {/* Sliders */}
            <div>
              <span className="label-upper">Parameters</span>
              <div className="param-block">
                <PSlider label="Scale"     val={Math.round(config.scale*100)}    min={60}  max={150} disp={`${Math.round(config.scale*100)}%`}   set={v=>setConfig({scale:v/100})} />
                <PSlider label="Y Offset"  val={config.offsetY}                  min={-50} max={50}  disp={config.offsetY>0?`+${config.offsetY}`:`${config.offsetY}`} set={v=>setConfig({offsetY:v})} />
                <PSlider label="Opacity"   val={Math.round(config.opacity*100)}  min={20}  max={100} disp={`${Math.round(config.opacity*100)}%`}  set={v=>setConfig({opacity:v/100})} />
                <PSlider label="Intensity" val={Math.round(config.intensity*100)} min={10} max={100} disp={`${Math.round(config.intensity*100)}%`} set={v=>setConfig({intensity:v/100})} />
              </div>
            </div>

            {colors.length > 0 && (
              <div>
                <span className="label-upper">Color</span>
                <div className="swatch-row">
                  {colors.map((col: string) => (
                    <button
                      key={col}
                      title={col}
                      className={`color-swatch ${config.color === col ? 'selected' : ''}`}
                      onClick={() => setConfig({ color: col })}
                      style={{ background: col === '#silver' ? '#aaa' : col }}
                    />
                  ))}
                </div>
              </div>
            )}

            <button
              className="button-outline"
              onClick={resetConfig}
              style={{ width: '100%' }}
            >
              Reset overlay
            </button>

            {/* Detection info */}
            <div>
              <span className="label-upper">Detection</span>
              <div className="detect-table">
                {[
                  { k: 'Status',    v: detection.detected ? '✓ Detected' : '— Scanning', hi: detection.detected },
                  { k: 'FPS',       v: detection.fps > 0 ? `${detection.fps} fps` : '—' },
                  { k: 'Mode',      v: mode.charAt(0).toUpperCase() + mode.slice(1) },
                  { k: 'Tracking',  v: mode === 'clothing' ? 'Pose+Face' : mode === 'accessories' ? 'Hands+Face' : 'FaceMesh 468pt', hi: true },
                  { k: 'Item',      v: item?.name ?? '—' },
                  { k: 'Landmarks', v: detection.landmarks ? '468 pts' : '—' },
                ].map(row => (
                  <div key={row.k} className="detect-row">
                    <span className="detect-key">{row.k}</span>
                    <span className={`detect-val ${row.hi ? 'detect-val--hi' : ''}`}>{row.v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stack info */}
            <div className="stack-card">
              <span className="stack-title">Stack v3</span>
              React 19 + TypeScript<br/>
              FaceMesh + Pose + Hands<br/>
              EMA landmark smoother<br/>
              SVG asset warping<br/>
              Perspective quad warp<br/>
              Zustand + AI advisor
            </div>
          </div>
        )}

        {tab === 'hd'      && <HDTryOnPanel    />}
        {tab === 'ai'      && <AIStyleAdvisor />}
        {tab === 'history' && <HistoryPanel   />}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop panel */}
      <aside className="panel-aside">
        {PanelContent}
      </aside>

      {/* Mobile bottom sheet */}
      <div className={`mob-sheet ${mobileSheet ? 'open' : ''}`}>
        <div className="mob-sheet-handle" />
        {PanelContent}
      </div>
    </>
  );
};

const PSlider: React.FC<{
  label: string; val: number; min: number; max: number; disp: string; set: (v:number) => void
}> = ({ label, val, min, max, disp, set }) => {
  const pct = Math.round(((val - min) / (max - min)) * 100);
  return (
    <div className="param-row">
      <div className="param-header">
        <span className="param-label">{label}</span>
        <span className="param-val">{disp}</span>
      </div>
      <input
        type="range"
        min={min} max={max} value={val} step={1}
        onChange={e => set(+e.target.value)}
        className="range-input"
        style={{ '--pct': `${pct}%` } as React.CSSProperties}
      />
    </div>
  );
};
