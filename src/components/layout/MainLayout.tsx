import React, { useEffect, useState, useRef } from 'react';
import { VoiceWidget } from '../voice/VoiceWidget';
import { CentralCanvas } from '../workspace/CentralCanvas';
import { ToolMenu } from '../tools/ToolMenu';
import { DockBar } from '../tools/DockBar';
import { useSocket } from '../../context/SocketContext';
import './MainLayout.css';

interface CadData {
  format?: string;
  data?: string;
  filename?: string;
}

export const MainLayout: React.FC = () => {
  const { socket } = useSocket();
  const [activeTool, setActiveTool] = useState('home');
  // Store CAD data at this level to avoid race condition
  const [cadData, setCadData] = useState<CadData | null>(null);
  const cadDataRef = useRef<CadData | null>(null);

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
      setActiveTool(prev => prev !== 'web' ? 'web' : prev);
    };

    // Store CAD data AND switch view
    const handleCadData = (data: CadData) => {
      console.log('[MainLayout] CAD data received:', data.format, data.data?.length, 'chars');
      setCadData(data);
      cadDataRef.current = data;
      setActiveTool('cad');
    };

    const handleCadStatus = (data: { status: string }) => {
      if (data.status === 'generating') {
        console.log('[MainLayout] CAD generating, switching to cad view');
        setCadData({ format: 'loading' });
        setActiveTool('cad');
      }
    };

    socket.on('activate_tool_view', handleToolActivate);
    socket.on('browser_frame', handleBrowserFrame);
    socket.on('cad_data', handleCadData);
    socket.on('cad_status', handleCadStatus);

    return () => {
      socket.off('activate_tool_view', handleToolActivate);
      socket.off('browser_frame', handleBrowserFrame);
      socket.off('cad_data', handleCadData);
      socket.off('cad_status', handleCadStatus);
    };
  }, [socket]);

  return (
    <div className="layout-container">
      {/* Unified Left Sidebar */}
      <aside className="left-sidebar">
        <ToolMenu activeTool={activeTool} />
        <VoiceWidget />
      </aside>

      {/* Main Workspace Area (The "Box" to the right) */}
      <main className="main-workspace">
        <CentralCanvas activeTool={activeTool} cadData={cadData} />

        {/* Floating Dock ToolBar */}
        <div className="workspace-dock-container">
          <DockBar activeTool={activeTool} onSelectTool={handleSelectTool} />
        </div>
      </main>
    </div>
  );
};
