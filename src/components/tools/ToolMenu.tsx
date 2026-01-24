import React from 'react';
import './ToolMenu.css';

interface ToolMenuProps {
    activeTool?: string;
}

export const ToolMenu: React.FC<ToolMenuProps> = ({ activeTool }) => {
    return (
        <div className="tool-menu">
            <div className="menu-header">
                <span className="menu-title">ACTIVE TOOL CONTEXT</span>
            </div>

            <div className="menu-content-placeholder">
                <p className="placeholder-text">
                    {activeTool === 'home' ? (
                        <>No active tool.<br />Select a module from the dock.</>
                    ) : (
                        <>
                            Active Module:<br />
                            <strong style={{ color: 'var(--color-cyan)', fontSize: '1.2em' }}>
                                {activeTool.toUpperCase().replace('_', ' ')}
                            </strong>
                            <br /><br />
                            Contextual options would appear here.
                        </>
                    )}
                </p>
            </div>
        </div>
    );
};
