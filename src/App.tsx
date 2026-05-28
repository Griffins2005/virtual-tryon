import React from 'react';
import { LeftSidebar }    from './components/LeftSidebar';
import { CameraViewport } from './components/CameraViewport';
import { RightPanel }     from './components/RightPanel';
import { useStore }       from './store/useStore';
import './App.css';

const App: React.FC = () => {
  const { detection, mobileSheet, setMobileSheet } = useStore();

  return (
    <div className="app-root">
      {/* Mobile-only header */}
      <header className="mobile-header">
        <div className="mobile-logo">
          <span className="brand-primary">TRY</span>
          <span className="brand-secondary">ON</span>
          <span className="brand-tag">v3</span>
        </div>
        <div className="mob-detect-badge">
          <span className={`dot-status ${detection.detected ? 'dot-status--on' : 'dot-status--off'}`} />
          <span style={{ color: detection.detected ? 'var(--accent)' : 'var(--text3)' }}>
            {detection.detected ? 'Detected' : 'Scanning'}
          </span>
          {detection.fps > 0 && (
            <span style={{ color: 'var(--text3)', marginLeft: 2 }}>{detection.fps}fps</span>
          )}
        </div>
      </header>

      <LeftSidebar />

      <main className="main-area">
        <CameraViewport />
      </main>

      <RightPanel />

      {/* Mobile bottom-sheet backdrop */}
      <div
        className={`mob-sheet-backdrop ${mobileSheet ? 'open' : ''}`}
        onClick={() => setMobileSheet(false)}
      />
    </div>
  );
};

export default App;
