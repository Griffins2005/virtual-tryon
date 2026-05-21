import React, { useState } from 'react';
import { useStore }       from '../store/useStore';
import { getItemsByMode } from '../assets/catalog';
import { HistoryPanel }   from './HistoryPanel';
import { AIStyleAdvisor } from './AIStyleAdvisor';

type Tab = 'adjust' | 'ai' | 'history';

export const RightPanel: React.FC = () => {
  const { mode, selectedItemId, config, detection, setConfig, resetConfig } = useStore();
  const [tab, setTab] = useState<Tab>('adjust');
  const item   = getItemsByMode(mode).find(i => i.id === selectedItemId);
  const colors = item?.colors ?? [];

  return (
    <aside className="panel-aside">
      {/* Tabs */}
      <div className="panel-tabs">
        {(['adjust','ai','history'] as Tab[]).map((t) => (
          <button
            key={t}
            className={`panel-tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'ai' ? '✦ AI' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="panel-body">
        {tab === 'adjust' && (
          <div className="card">
            <section className="card-panel">
              <div>
                <p style={{ margin:0, fontSize:'10px', letterSpacing:'1.5px', color:'#444', textTransform:'uppercase' }}>Selected</p>
                <p style={{ margin:'4px 0 0', fontSize:'14px', fontWeight:700, color:'#f0f0f0' }}>{item?.name ?? 'None selected'}</p>
              </div>
              <div style={{ width:24, height:24, borderRadius:'50%', border:'1px solid #111', background: config.color }} />
            </section>

            <section>
              <p className="label-upper">Parameters</p>
              <div className="card-group">
                <Slider label="Scale"     val={Math.round(config.scale*100)}    min={60}  max={150} disp={`${Math.round(config.scale*100)}%`}   set={v=>setConfig({scale:v/100})} />
                <Slider label="Y Offset"  val={config.offsetY}                  min={-40} max={40}  disp={config.offsetY>0?`+${config.offsetY}`:`${config.offsetY}`} set={v=>setConfig({offsetY:v})} />
                <Slider label="Opacity"   val={Math.round(config.opacity*100)}  min={20}  max={100} disp={`${Math.round(config.opacity*100)}%`}  set={v=>setConfig({opacity:v/100})} />
                <Slider label="Intensity" val={Math.round(config.intensity*100)} min={10} max={100} disp={`${Math.round(config.intensity*100)}%`} set={v=>setConfig({intensity:v/100})} />
              </div>
            </section>

            {colors.length > 0 && (
              <section>
                <p className="label-upper">Color</p>
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
              </section>
            )}

            <section>
              <button
                className="button-outline"
                onClick={resetConfig}
                style={{ width: '100%', marginTop: '2px' }}
              >Reset overlay</button>
            </section>

            <section>
              <p style={sLabel}>Detection</p>
              {[
                {l:'Status',    v: detection.detected?'✓ Detected':'— Scanning', hi: detection.detected},
                {l:'FPS',       v: detection.fps>0?`${detection.fps} fps`:'—'},
                {l:'Mode',      v: mode.charAt(0).toUpperCase()+mode.slice(1)},
                {l:'Tracking',  v: mode==='clothing'?'Pose+Face': mode==='accessories'?'Hands+Face':'FaceMesh', hi: true},
                {l:'Item',      v: item?.name??'—'},
                {l:'Landmarks', v: detection.landmarks?'468 pts':'—'},
              ].map(row => (
                <div key={row.l} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid #1a1a22', fontSize:'12px' }}>
                  <span style={{color:'#444'}}>{row.l}</span>
                  <span style={{color: row.hi?'#c8ff00':'#666', fontWeight:500}}>{row.v}</span>
                </div>
              ))}
            </section>

            <section className="section">
              <div className="panel-info">
                <span style={{ display:'block', fontSize:'10px', fontWeight:600, letterSpacing:'1.5px', color:'#6baaff', textTransform:'uppercase', marginBottom:'6px' }}>Stack v3</span>
                React 19 + TypeScript<br/>
                FaceMesh + Pose + Hands<br/>
                EMA landmark smoother<br/>
                SVG asset warping<br/>
                Perspective quad warp<br/>
                Zustand + AI advisor
              </div>
            </section>
          </div>
        )}

        {tab === 'ai'      && <AIStyleAdvisor />}
        {tab === 'history' && <HistoryPanel   />}
      </div>
    </aside>
  );
};

const sLabel: React.CSSProperties = { fontSize:'10px', fontWeight:600, letterSpacing:'2px', color:'#333', textTransform:'uppercase', marginBottom:'10px' };

const Slider: React.FC<{label:string;val:number;min:number;max:number;disp:string;set:(v:number)=>void}> = ({label,val,min,max,disp,set}) => (
  <div>
    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'5px' }}>
      <span style={{color:'#555'}}>{label}</span>
      <span style={{color:'#b0b0b0', fontWeight:500}}>{disp}</span>
    </div>
    <input type="range" min={min} max={max} value={val} step={1} onChange={e=>set(+e.target.value)} style={{ width:'100%', accentColor:'#c8ff00', cursor:'pointer' }} />
  </div>
);
