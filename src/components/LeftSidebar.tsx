import React from 'react';
import { useStore }       from '../store/useStore';
import { getItemsByMode } from '../assets/catalog';
import { ItemThumbnail }  from './ItemThumbnail';
import type { TryOnMode } from '../types';

const MODES: { id: TryOnMode; label: string; icon: string }[] = [
  { id: 'glasses',     label: 'Glasses',     icon: '◉' },
  { id: 'makeup',      label: 'Makeup',      icon: '✦' },
  { id: 'clothing',    label: 'Clothing',    icon: '◈' },
  { id: 'accessories', label: 'Accessories', icon: '⌚' },
];

export const LeftSidebar: React.FC = () => {
  const { mode, selectedItemId, setMode, setSelectedItem } = useStore();
  const items = getItemsByMode(mode);

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <span className="brand-primary">TRY</span>
        <span className="brand-secondary">ON</span>
        <span className="brand-tag">v3</span>
      </div>

      {/* Mode tabs */}
      <div className="sidebar-section">
        <p style={sLabel}>Category</p>
        <div className="sidebar-tabs">
          {MODES.map((m) => (
            <button
              key={m.id}
              className={`sidebar-tab ${mode === m.id ? 'active' : ''}`}
              onClick={() => setMode(m.id)}
            >
              <span style={{ fontSize:'14px' }}>{m.icon}</span>
              <span>{m.label}</span>
              <span style={{ marginLeft:'auto', fontSize:'11px', opacity:0.5 }}>{getItemsByMode(m.id).length}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Item grid */}
      <div className="sidebar-item-grid">
        <p style={sLabel}>Items</p>
        <div className="sidebar-items">
          {items.map(item => (
            <ItemThumbnail key={item.id} item={item} selected={selectedItemId===item.id} onClick={() => setSelectedItem(item.id)} />
          ))}
        </div>
      </div>
    </aside>
  );
};

const sLabel: React.CSSProperties = { fontSize:'10px', fontWeight:600, letterSpacing:'2px', color:'#333', textTransform:'uppercase', marginBottom:'8px', paddingLeft:'6px' };
