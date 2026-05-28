import React from 'react';
import { useStore }       from '../store/useStore';
import { getItemsByMode } from '../assets/catalog';
import { ItemThumbnail }  from './ItemThumbnail';
import type { TryOnMode } from '../types';

const MODES: { id: TryOnMode; label: string; icon: string }[] = [
  { id: 'glasses',     label: 'Glasses',     icon: '◉' },
  { id: 'makeup',      label: 'Makeup',      icon: '✦' },
  { id: 'clothing',    label: 'Clothing',    icon: '◈' },
  { id: 'accessories', label: 'Access.',     icon: '⌚' },
];

export const LeftSidebar: React.FC = () => {
  const { mode, selectedItemId, cameraActive, setMode, setSelectedItem, setMobileSheet } = useStore();
  const items = getItemsByMode(mode);

  const handleCapture = () => {
    // Dispatch a custom event so CameraViewport can handle it
    window.dispatchEvent(new CustomEvent('mob-capture'));
  };

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="brand-primary">TRY</span>
          <span className="brand-secondary">ON</span>
          <span className="brand-tag">v3</span>
        </div>

        <div className="sidebar-section">
          <span className="section-label">Category</span>
          <div className="sidebar-tabs">
            {MODES.map((m) => (
              <button
                key={m.id}
                className={`sidebar-tab ${mode === m.id ? 'active' : ''}`}
                onClick={() => setMode(m.id)}
              >
                <span className="tab-icon">{m.icon}</span>
                <span>{m.label}</span>
                <span className="tab-count">{getItemsByMode(m.id).length}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar-item-grid">
          <span className="section-label">Items</span>
          <div className="sidebar-items">
            {items.map(item => (
              <ItemThumbnail
                key={item.id}
                item={item}
                selected={selectedItemId === item.id}
                onClick={() => setSelectedItem(item.id)}
              />
            ))}
          </div>
        </div>
      </aside>

      {/* ── Mobile bottom nav ── */}
      <nav className="mobile-nav">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`mob-nav-btn ${mode === m.id ? 'active' : ''}`}
            onClick={() => setMode(m.id)}
            title={m.label}
          >
            <span className="ni">{m.icon}</span>
            <span>{m.label}</span>
          </button>
        ))}

        <div className="mob-nav-sep" />

        <button
          className={`mob-nav-action capture ${!cameraActive ? 'disabled' : ''}`}
          onClick={handleCapture}
          disabled={!cameraActive}
          title="Capture"
        >
          <span className="ni">📸</span>
          <span>Save</span>
        </button>

        <button
          className="mob-nav-action"
          onClick={() => setMobileSheet(true)}
          title="Adjust"
        >
          <span className="ni">⚙️</span>
          <span>Adjust</span>
        </button>
      </nav>
    </>
  );
};
