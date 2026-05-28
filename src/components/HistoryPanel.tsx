import React from 'react';
import { useHistory } from '../store/useHistory';

function formatTs(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  const day = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${day} ${h}:${m}`;
}

export const HistoryPanel: React.FC = () => {
  const { snapshots, removeSnapshot, clear } = useHistory();

  if (snapshots.length === 0) {
    return (
      <div className="history-empty">
        <p>
          No captures yet.<br />Press 📸 to save a look.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div className="history-header">
        <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
          {snapshots.length} capture{snapshots.length !== 1 ? 's' : ''}
        </span>
        <button className="button-small" onClick={clear}>Clear all</button>
      </div>

      <div className="history-grid">
        {snapshots.map((snap) => (
          <div key={snap.id} className="history-card">
            <img src={snap.dataUrl} alt={snap.item} />

            <div className="hover-controls">
              <button
                className="icon-btn"
                title="Download"
                onClick={() => {
                  const a = document.createElement('a');
                  a.download = `tryon-${snap.timestamp}.png`;
                  a.href = snap.dataUrl;
                  a.click();
                }}
              >↓</button>
              <button
                className="icon-btn delete"
                onClick={() => removeSnapshot(snap.id)}
                title="Delete"
              >✕</button>
            </div>

            <div className="history-label">
              <span style={{ display: 'block', fontWeight: 600, color: 'rgba(255,255,255,0.72)' }}>
                {snap.item}
              </span>
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.38)' }}>
                {formatTs(snap.timestamp)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
