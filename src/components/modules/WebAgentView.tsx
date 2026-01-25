import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Globe, Send, Terminal } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import './WebAgentView.css';

export const WebAgentView: React.FC = () => {
    const { socket } = useSocket();
    const [input, setInput] = useState('');
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);

    // Send canvas size to backend
    const sendCanvasSize = useCallback(() => {
        if (!socket || !viewportRef.current) return;

        const rect = viewportRef.current.getBoundingClientRect();
        const width = Math.floor(rect.width);
        const height = Math.floor(rect.height);

        if (width > 0 && height > 0) {
            console.log(`[WebAgentView] Sending canvas resize: ${width}x${height}`);
            socket.emit('ui_canvas_resize', { width, height });
        }
    }, [socket]);

    // Resize observer for viewport container
    useEffect(() => {
        if (!viewportRef.current) return;

        // Send initial size
        sendCanvasSize();

        const resizeObserver = new ResizeObserver(() => {
            sendCanvasSize();
        });

        resizeObserver.observe(viewportRef.current);

        return () => {
            resizeObserver.disconnect();
        };
    }, [sendCanvasSize]);

    useEffect(() => {
        if (!socket) return;

        const handleFrame = (data: { image: string; log?: string }) => {
            if (data.image) {
                setImageSrc(data.image);
            }
            if (data.log) {
                setLogs(prev => [...prev.slice(-20), data.log]);
            }
        };

        socket.on('browser_frame', handleFrame);

        return () => {
            socket.off('browser_frame', handleFrame);
        };
    }, [socket]);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const handleSend = () => {
        if (!input.trim() || !socket) return;
        socket.emit('prompt_web_agent', { prompt: input });
        setLogs(prev => [...prev, `> ${input}`]);
        setInput('');
    };

    return (
        <div className="web-agent-view">
            <div className="agent-viewport" ref={viewportRef}>
                {imageSrc ? (
                    <img
                        src={`data:image/png;base64,${imageSrc}`}
                        alt="Browser View"
                        className="browser-image"
                    />
                ) : (
                    <div className="empty-browser-state">
                        <Globe size={48} className="animate-pulse-cyan" />
                        <p>Waiting for browser stream...</p>
                        <span className="sub-text">Use the terminal below to start a task.</span>
                    </div>
                )}
            </div>

            <div className="agent-terminal">
                <div className="terminal-logs">
                    {logs.length === 0 && <span className="log-placeholder">Agent activity logs will appear here...</span>}
                    {logs.map((log, i) => (
                        <div key={i} className="log-line">
                            <span className="log-time">[{new Date().toLocaleTimeString()}]</span>
                            {log}
                        </div>
                    ))}
                    <div ref={logsEndRef} />
                </div>

                <div className="terminal-input-row">
                    <Terminal size={16} className="terminal-icon" />
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        placeholder="Command Web Agent..."
                    />
                    <button onClick={handleSend} className="send-cmd-btn">
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};
