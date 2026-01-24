import React from 'react';
import { VoiceWidget } from '../voice/VoiceWidget';
import { CentralCanvas } from '../workspace/CentralCanvas';
import { ToolMenu } from '../tools/ToolMenu';
import { DockBar } from '../tools/DockBar';
import './MainLayout.css';

export const MainLayout: React.FC = () => {
  const [activeTool, setActiveTool] = React.useState('home');

  return (
    <div className="layout-container">
      {/* Unified Left Sidebar */}
      <aside className="left-sidebar">
        <ToolMenu activeTool={activeTool} />
        <VoiceWidget />
      </aside>

      {/* Main Workspace Area (The "Box" to the right) */}
      <main className="main-workspace">
        <CentralCanvas activeTool={activeTool} />

        {/* Floating Dock ToolBar */}
        <div className="workspace-dock-container">
          <DockBar activeTool={activeTool} onSelectTool={setActiveTool} />
        </div>
      </main>
    </div>
  );
};
