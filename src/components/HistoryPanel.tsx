import React from 'react';
import { useHistory } from '../store/useHistory';

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
        <span style={{ fontSize: '11px', color: '#555' }}>{snapshots.length} capture{snapshots.length !== 1 ? 's' : ''}</span>
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

            <div className="history-label">{snap.item}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
