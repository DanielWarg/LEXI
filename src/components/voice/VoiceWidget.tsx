import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, MoreHorizontal, Power } from 'lucide-react';
import './VoiceWidget.css';
import { useSocket } from '../../context/SocketContext';

interface TranscriptItem {
    text: string;
    speaker: 'user' | 'ai';
    timestamp: Date;
}

export const VoiceWidget: React.FC = () => {
    const [input, setInput] = useState('');
    const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
    const [history, setHistory] = useState<TranscriptItem[]>([]);
    const [isMuted, setIsMuted] = useState(true);
    const { socket, connected, isSessionActive } = useSocket();
    const historyEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!socket) return;

        const handleStatus = (data: any) => {
            if (data.state) {
                setStatus(data.state);
            }
        };

        const handleTranscription = (data: any) => {
            if (data.text) {
                setHistory(prev => {
                    const incomingSpeaker = (data.sender === 'User' || data.speaker === 'user') ? 'user' : 'ai';
                    const lastMsg = prev[prev.length - 1];

                    if (lastMsg && lastMsg.speaker === incomingSpeaker) {
                        const newHistory = [...prev];
                        newHistory[newHistory.length - 1] = {
                            ...lastMsg,
                            text: lastMsg.text + (lastMsg.text.endsWith(' ') ? '' : ' ') + data.text,
                            timestamp: new Date()
                        };
                        return newHistory;
                    }

                    return [
                        ...prev.slice(-100),
                        {
                            text: data.text,
                            speaker: incomingSpeaker,
                            timestamp: new Date()
                        }
                    ];
                });
            }
        };

        const handleToolConfirmation = (data: any) => {
            console.log('🔧 Tool confirmation requested:', data);
        };

        socket.on('status', handleStatus);
        socket.on('transcription', handleTranscription);
        socket.on('tool_confirmation', handleToolConfirmation);

        return () => {
            socket.off('status', handleStatus);
            socket.off('transcription', handleTranscription);
            socket.off('tool_confirmation', handleToolConfirmation);
        };
    }, [socket]);

    useEffect(() => {
        historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history]);

    useEffect(() => {
        if (isSessionActive && status === 'idle') {
            setStatus('listening');
        } else if (!isSessionActive && status !== 'idle') {
            setStatus('idle');
        }
    }, [isSessionActive]);

    const handleToggleMute = () => {
        if (!socket || !isSessionActive) return;

        if (isMuted) {
            socket.emit('resume_audio');
            setIsMuted(false);
        } else {
            socket.emit('pause_audio');
            setIsMuted(true);
        }
    };

    const handleSendText = () => {
        if (!input.trim() || !socket) return;

        socket.emit('user_input', { text: input });
        setHistory(prev => [
            ...prev.slice(-10),
            { text: input, speaker: 'user', timestamp: new Date() }
        ]);
        setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendText();
        }
    };

    return (
        <div className="voice-widget">
            <div className="flex items-center gap-2">
                <div className={`status-indicator ${status}`}>
                    <div className="pulse-ring"></div>
                </div>
                <span className="status-text text-cyan-400">
                    {connected ? status.toUpperCase() : 'OFFLINE'}
                </span>
            </div>

            <div className="transcript-area">
                {history.length === 0 && (
                    <div className="transcript-line ai">
                        <span className="label font-mono text-xs opacity-70 mb-1 block">LEXI</span>
                        <p className="text-sm leading-relaxed">{connected ? 'Ready to connect...' : 'Waiting for backend...'}</p>
                    </div>
                )}
                {history.map((item, idx) => (
                    <div key={idx} className={`transcript-line ${item.speaker}`}>
                        <span className="label font-mono text-xs opacity-70 mb-1 block">
                            {item.speaker === 'ai' ? 'LEXI' : 'OP'}
                        </span>
                        <p className="text-sm leading-relaxed">{item.text}</p>
                    </div>
                ))}
                <div ref={historyEndRef} />
            </div>

            <div className="input-area">
                {/* Mute Toggle */}
                <button
                    className={`mic-btn ${!isMuted ? 'active' : ''}`}
                    onClick={handleToggleMute}
                    disabled={!isSessionActive}
                    title={isMuted ? 'Unmute' : 'Mute'}
                >
                    {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>

                {/* Text Input Group */}
                <div className="input-wrapper">
                    <input
                        type="text"
                        placeholder="INITIALIZE COMMAND..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />

                    <button
                        className="send-btn"
                        onClick={handleSendText}
                        disabled={!input.trim()}
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};
