import React from 'react';
import { WebAgentView } from '../modules/WebAgentView';
import { SettingsView } from '../modules/SettingsView';
import { PrinterView } from '../modules/PrinterView';
import { KasaView } from '../modules/KasaView';
import { CadView } from '../modules/CadView';
import { CameraView } from '../modules/CameraView';
import { FilesView } from '../modules/FilesView';
import './CentralCanvas.css';

interface CadData {
    format?: string;
    data?: string;
    filename?: string;
}

interface CentralCanvasProps {
    activeTool?: string;
    cadData?: CadData | null;
}

export const CentralCanvas: React.FC<CentralCanvasProps> = ({ activeTool = 'home', cadData }) => {
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

            {/* Web Agent */}
            {activeTool === 'web' && (
                <div className="active-tool-container">
                    <WebAgentView />
                </div>
            )}

            {/* Settings */}
            {activeTool === 'settings' && (
                <div className="active-tool-container">
                    <SettingsView />
                </div>
            )}

            {/* 3D Printer */}
            {activeTool === 'printer' && (
                <div className="active-tool-container">
                    <PrinterView />
                </div>
            )}

            {/* Smart Home / Kasa */}
            {activeTool === 'home_control' && (
                <div className="active-tool-container">
                    <KasaView />
                </div>
            )}

            {/* CAD / 3D Design */}
            {activeTool === 'cad' && (
                <div className="active-tool-container">
                    <CadView initialData={cadData} />
                </div>
            )}

            {/* Camera */}
            {activeTool === 'mobile' && (
                <div className="active-tool-container">
                    <CameraView />
                </div>
            )}

            {/* Project Files */}
            {activeTool === 'files' && (
                <div className="active-tool-container">
                    <FilesView />
                </div>
            )}

            {/* Any remaining placeholders */}
            {!['home', 'web', 'settings', 'printer', 'home_control', 'cad', 'mobile', 'files'].includes(activeTool) && (
                <div className="active-tool-view">
                    <div className="tool-view-header">
                        <h2>{activeTool.toUpperCase().replace('_', ' ')}</h2>
                        <span className="live-indicator">● COMING SOON</span>
                    </div>
                    <div className="tool-placeholder-content">
                        <p>This module is under development.</p>
                    </div>
                </div>
            )}
        </div>
    );
};
