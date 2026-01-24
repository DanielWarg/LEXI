import React, { useState, useEffect } from 'react';
import { Mic, Send, MoreHorizontal } from 'lucide-react';
import './VoiceWidget.css';
import { useSocket } from '../../context/SocketContext';

export const VoiceWidget: React.FC = () => {
    const [input, setInput] = useState('');
    const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
    const [history, setHistory] = useState<any[]>([]);
    const { socket } = useSocket();

    useEffect(() => {
        if (!socket) return;

        const handleStatus = (data: any) => {
            setStatus(data.state);
        };

        const handleTranscription = (data: any) => {
            if (data.text) {
                setHistory(prev => [...prev.slice(-1), data]); // Keep last 2 for UI
            }
        };

        socket.on('status', handleStatus);
        socket.on('transcription', handleTranscription);

        return () => {
            socket.off('status', handleStatus);
            socket.off('transcription', handleTranscription);
        };
    }, [socket]);

    return (
        <div className="voice-widget">
            <div className="voice-header">
                <div className={`status-indicator ${status}`}>
                    <div className="pulse-ring"></div>
                </div>
                <span className="status-text">{status.toUpperCase()}</span>
                <button className="icon-btn ghost"><MoreHorizontal size={16} /></button>
            </div>

            <div className="transcript-area">
                {history.length === 0 && (
                    <div className="transcript-line ai">
                        <span className="label">LEXI</span>
                        <p>Voice Simulation Active.</p>
                    </div>
                )}
                {history.map((item, idx) => (
                    <div key={idx} className={`transcript-line ${item.speaker}`}>
                        <span className="label">{item.speaker === 'ai' ? 'LEXI' : 'YOU'}</span>
                        <p>{item.text}</p>
                    </div>
                ))}
            </div>

            <div className="input-area">
                <button className={`mic-btn ${status === 'listening' ? 'active' : ''}`}>
                    <Mic size={20} />
                </button>
                <input
                    type="text"
                    placeholder="Type a command..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                />
                <button className="send-btn">
                    <Send size={18} />
                </button>
            </div>
        </div>
    );
};
