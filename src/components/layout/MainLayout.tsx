import React, { useEffect } from 'react';
import { VoiceWidget } from '../voice/VoiceWidget';
import { CentralCanvas } from '../workspace/CentralCanvas';
import { ToolMenu } from '../tools/ToolMenu';
import { DockBar } from '../tools/DockBar';
import { useSocket } from '../../context/SocketContext';
import './MainLayout.css';

export const MainLayout: React.FC = () => {
  const { socket } = useSocket();
  const [activeTool, setActiveTool] = React.useState('home');

  const handleSelectTool = (tool: string) => {
    setActiveTool(prev => prev === tool ? 'home' : tool);
  };

  // Listen for tool activation from backend (e.g., when web agent starts)
  useEffect(() => {
    if (!socket) return;

    const handleToolActivate = (data: { tool: string }) => {
      console.log(`[MainLayout] Activating tool view: ${data.tool}`);
      setActiveTool(data.tool);
    };

    // Auto-switch to web view when browser frames arrive
    const handleBrowserFrame = () => {
      if (activeTool !== 'web') {
        console.log('[MainLayout] Browser frame received, switching to web view');
        setActiveTool('web');
      }
    };

    socket.on('activate_tool_view', handleToolActivate);
    socket.on('browser_frame', handleBrowserFrame);

    return () => {
      socket.off('activate_tool_view', handleToolActivate);
      socket.off('browser_frame', handleBrowserFrame);
    };
  }, [socket, activeTool]);

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
          <DockBar activeTool={activeTool} onSelectTool={handleSelectTool} />
        </div>
      </main>
    </div>
  );
};
