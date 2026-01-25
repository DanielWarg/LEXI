import React, { useEffect, useState, useRef } from 'react';
import { Globe, Send } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import './WebToolContext.css';

export const WebToolContext: React.FC = () => {
    const { socket } = useSocket();
    const [input, setInput] = useState('');
    const [logs, setLogs] = useState<string[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logs
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    useEffect(() => {
        if (!socket) return;

        const handleFrame = (data: { image?: string; log?: string }) => {
            if (data.log) {
                setLogs(prev => [...prev.slice(-30), data.log!]);
                if (data.log === 'Task Finished') {
                    setIsRunning(false);
                } else if (data.log === 'Web Agent Initialized') {
                    setIsRunning(true);
                }
            }
        };

        socket.on('browser_frame', handleFrame);

        return () => {
            socket.off('browser_frame', handleFrame);
        };
    }, [socket]);

    const handleSend = () => {
        if (!socket || !input.trim()) return;
        socket.emit('prompt_web_agent', { prompt: input });
        setLogs(prev => [...prev, `> ${input}`]);
        setIsRunning(true);
        setInput('');
    };

    return (
        <div className="web-tool-context">
            <div className="context-header">
                <Globe size={16} className="context-icon" />
                <span>WEB AGENT</span>
            </div>

            {/* Input area */}
            <div className="context-input">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Command Web Agent..."
                    disabled={isRunning}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                />
                <button
                    className="ctx-btn primary"
                    onClick={handleSend}
                    disabled={isRunning || !input.trim()}
                >
                    <Send size={14} />
                </button>
            </div>

            {/* Logs panel */}
            <div className="context-logs">
                <div className="logs-header">
                    <span className={isRunning ? 'running-dot' : ''}></span>
                    <span>Activity Log</span>
                </div>
                <div className="logs-content">
                    {logs.length === 0 && (
                        <span className="log-placeholder">Agent logs will appear here...</span>
                    )}
                    {logs.map((log, i) => (
                        <div key={i} className="log-line">
                            <span className="log-time">[{new Date().toLocaleTimeString()}]</span>
                            {log}
                        </div>
                    ))}
                    <div ref={logsEndRef} />
                </div>
            </div>

            {/* Status */}
            <div className="context-status">
                {isRunning ? 'RUNNING...' : 'READY'}
            </div>
        </div>
    );
};
