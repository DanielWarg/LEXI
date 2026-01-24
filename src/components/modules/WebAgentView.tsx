import React, { useEffect, useState, useRef } from 'react';
import { Globe, Send, Terminal } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import './WebAgentView.css';

export const WebAgentView: React.FC = () => {
    const { socket } = useSocket();
    const [input, setInput] = useState('');
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!socket) return;

        const handleFrame = (data: string) => {
            setImageSrc(data);
        };

        const handleLog = (data: any) => {
            // Assuming backend sends some logs for agent actions
            const msg = typeof data === 'string' ? data : JSON.stringify(data);
            setLogs(prev => [...prev.slice(-20), msg]); // Keep last 20
        };

        socket.on('browser_frame', handleFrame);
        // socket.on('web_agent_log', handleLog); // If this event exists

        return () => {
            socket.off('browser_frame', handleFrame);
            // socket.off('web_agent_log', handleLog);
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
            <div className="agent-viewport">
                {imageSrc ? (
                    <img
                        src={`data:image/jpeg;base64,${imageSrc}`}
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
