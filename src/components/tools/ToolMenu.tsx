import React from 'react';
import { CadToolContext } from './CadToolContext';
import { WebToolContext } from './WebToolContext';
import './ToolMenu.css';

interface ToolMenuProps {
    activeTool?: string;
}

export const ToolMenu: React.FC<ToolMenuProps> = ({ activeTool = 'home' }) => {
    // Render context-specific controls based on active tool
    const renderToolContext = () => {
        switch (activeTool) {
            case 'cad':
                return <CadToolContext />;
            case 'web':
                return <WebToolContext />;
            case 'printer':
                return (
                    <div className="context-info">
                        <p className="context-label">Active Module:</p>
                        <p className="context-value">3D PRINTER</p>
                        <p className="context-hint">Manage print jobs and settings.</p>
                    </div>
                );
            case 'home_control':
                return (
                    <div className="context-info">
                        <p className="context-label">Active Module:</p>
                        <p className="context-value">SMART HOME</p>
                        <p className="context-hint">Control Kasa devices.</p>
                    </div>
                );
            case 'settings':
                return (
                    <div className="context-info">
                        <p className="context-label">Active Module:</p>
                        <p className="context-value">SETTINGS</p>
                        <p className="context-hint">Configure Lexi preferences.</p>
                    </div>
                );
            case 'home':
            default:
                return (
                    <div className="context-info">
                        <p className="context-hint">No active tool.</p>
                        <p className="context-hint">Select a module from the dock.</p>
                    </div>
                );
        }
    };

    return (
        <div className="tool-menu">
            <div className="menu-header">
                <span className="menu-title">ACTIVE TOOL CONTEXT</span>
            </div>

            <div className="menu-content">
                {renderToolContext()}
            </div>
        </div>
    );
};
