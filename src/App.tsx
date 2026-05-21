import React from 'react';
import { LeftSidebar }    from './components/LeftSidebar';
import { CameraViewport } from './components/CameraViewport';
import { RightPanel }     from './components/RightPanel';
import './App.css';

const App: React.FC = () => (
  <div className="app-root">
    <LeftSidebar />
    <main className="main-area">
      <CameraViewport />
    </main>
    <RightPanel />
  </div>
);

export default App;
