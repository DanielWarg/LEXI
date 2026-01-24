import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, X, Shield } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import './ToolConfirmation.css';

interface ToolConfirmationRequest {
    id: string;
    tool: string;
    args: Record<string, any>;
    timestamp: Date;
}

export const ToolConfirmation: React.FC = () => {
    const { socket } = useSocket();
    const [requests, setRequests] = useState<ToolConfirmationRequest[]>([]);

    useEffect(() => {
        if (!socket) return;

        const handleConfirmationRequest = (data: any) => {
            console.log('🔧 Tool confirmation request:', data);
            setRequests(prev => [...prev, {
                id: data.id,
                tool: data.tool,
                args: data.args || {},
                timestamp: new Date()
            }]);
        };

        socket.on('tool_confirmation_request', handleConfirmationRequest);

        return () => {
            socket.off('tool_confirmation_request', handleConfirmationRequest);
        };
    }, [socket]);

    const handleConfirm = (id: string, confirmed: boolean) => {
        if (!socket) return;
        socket.emit('confirm_tool', { id, confirmed });
        setRequests(prev => prev.filter(r => r.id !== id));
    };

    if (requests.length === 0) return null;

    const current = requests[0];

    return (
        <div className="tool-confirmation-overlay">
            <div className="tool-confirmation-modal">
                <div className="modal-header">
                    <Shield size={20} className="shield-icon" />
                    <h3>Tool Approval Required</h3>
                </div>

                <div className="modal-body">
                    <div className="tool-name">
                        <AlertTriangle size={16} />
                        <span>{current.tool}</span>
                    </div>

                    {Object.keys(current.args).length > 0 && (
                        <div className="tool-args">
                            <span className="args-label">Parameters:</span>
                            <pre>{JSON.stringify(current.args, null, 2)}</pre>
                        </div>
                    )}

                    <p className="confirmation-text">
                        Lexi wants to execute this action. Do you approve?
                    </p>
                </div>

                <div className="modal-actions">
                    <button
                        className="action-btn deny"
                        onClick={() => handleConfirm(current.id, false)}
                    >
                        <X size={16} />
                        Deny
                    </button>
                    <button
                        className="action-btn approve"
                        onClick={() => handleConfirm(current.id, true)}
                    >
                        <Check size={16} />
                        Approve
                    </button>
                </div>

                {requests.length > 1 && (
                    <div className="pending-count">
                        +{requests.length - 1} more pending
                    </div>
                )}
            </div>
        </div>
    );
};
