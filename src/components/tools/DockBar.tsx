import React from 'react';
import { Globe, Printer, Box, FolderOpen, Home, Smartphone, Settings } from 'lucide-react';
import './DockBar.css';

interface DockBarProps {
    activeTool: string;
    onSelectTool: (tool: string) => void;
}

export const DockBar: React.FC<DockBarProps> = ({ activeTool, onSelectTool }) => {
    return (
        <div className="dock-bar">
            {/* Web Agent */}
            <button
                className={`dock-item ${activeTool === 'web' ? 'active' : ''}`}
                onClick={() => onSelectTool('web')}
                title="Web Agent"
            >
                <Globe size={20} />
            </button>

            {/* CAD/3D Design */}
            <button
                className={`dock-item ${activeTool === 'cad' ? 'active' : ''}`}
                onClick={() => onSelectTool('cad')}
                title="3D Design"
            >
                <Box size={20} />
            </button>

            {/* 3D Printer */}
            <button
                className={`dock-item ${activeTool === 'printer' ? 'active' : ''}`}
                onClick={() => onSelectTool('printer')}
                title="3D Printer"
            >
                <Printer size={20} />
            </button>

            {/* Project Files */}
            <button
                className={`dock-item ${activeTool === 'files' ? 'active' : ''}`}
                onClick={() => onSelectTool('files')}
                title="Project Files"
            >
                <FolderOpen size={20} />
            </button>

            {/* Smart Home */}
            <button
                className={`dock-item ${activeTool === 'home_control' ? 'active' : ''}`}
                onClick={() => onSelectTool('home_control')}
                title="Smart Home"
            >
                <Home size={20} />
            </button>

            <div className="dock-divider"></div>

            {/* Mobile Connect */}
            <button
                className={`dock-item ${activeTool === 'mobile' ? 'active' : ''}`}
                onClick={() => onSelectTool('mobile')}
                title="Mobile Connect"
            >
                <Smartphone size={20} />
            </button>

            {/* Settings */}
            <button
                className={`dock-item ${activeTool === 'settings' ? 'active' : ''}`}
                onClick={() => onSelectTool('settings')}
                title="Settings"
            >
                <Settings size={20} />
            </button>
        </div>
    );
};
