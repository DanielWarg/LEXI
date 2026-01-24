import React from 'react';
import { WebAgentView } from '../modules/WebAgentView';
import { SettingsView } from '../modules/SettingsView';
import './CentralCanvas.css';

interface CentralCanvasProps {
    activeTool?: string;
}

export const CentralCanvas: React.FC<CentralCanvasProps> = ({ activeTool = 'home' }) => {
    return (
        <div className="central-canvas">
            {/* Home State */}
            {activeTool === 'home' && (
                <div className="workspace-area empty">
                    <div className="ripple-container">
                        <div className="ripple-ring delay-0"></div>
                        <div className="ripple-ring delay-1"></div>
                        <div className="ripple-ring delay-2"></div>
                        <div className="core-logo-text">LEXI</div>
                    </div>
                    <div className="empty-state-label">Waiting for input...</div>
                </div>
            )}

            {/* Real Tool Views */}
            {activeTool === 'web' && (
                <div className="active-tool-container">
                    <WebAgentView />
                </div>
            )}

            {activeTool === 'settings' && (
                <div className="active-tool-container">
                    <SettingsView />
                </div>
            )}

            {/* Placeholders for others until ported */}
            {!['home', 'web', 'settings'].includes(activeTool) && (
                <div className="active-tool-view">
                    <div className="tool-view-header">
                        <h2>{activeTool.toUpperCase().replace('_', ' ')}</h2>
                        <span className="live-indicator">● LIVE VIEW (Placeholder)</span>
                    </div>
                    <div className="tool-placeholder-content">
                        <p>Real-time tool interface for {activeTool} coming soon.</p>
                    </div>
                </div>
            )}
        </div>
    );
};
