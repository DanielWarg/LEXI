import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, MoreHorizontal, Phone, PhoneOff } from 'lucide-react';
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
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const { socket, connected } = useSocket();
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
                    // Map backend 'sender' to frontend 'speaker'
                    // Backend sends "ADA" or "User" in 'sender' field.
                    const incomingSpeaker = (data.sender === 'User' || data.speaker === 'user') ? 'user' : 'ai';

                    const lastMsg = prev[prev.length - 1];

                    // If we have a last message and it's from the same speaker, append text
                    if (lastMsg && lastMsg.speaker === incomingSpeaker) {
                        const newHistory = [...prev];
                        newHistory[newHistory.length - 1] = {
                            ...lastMsg,
                            text: lastMsg.text + data.text,
                            timestamp: new Date() // Update timestamp to latest activity
                        };
                        return newHistory;
                    }

                    // Otherwise create new message bubble
                    return [
                        ...prev.slice(-100), // Keep last 100 items (increased from 10)
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
            // Show tool confirmation request
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

    const handleStartSession = () => {
        if (!socket) return;
        socket.emit('start_audio');
        setIsSessionActive(true);
        setIsMuted(false);
        setStatus('listening');
    };

    const handleStopSession = () => {
        if (!socket) return;
        socket.emit('stop_audio');
        setIsSessionActive(false);
        setIsMuted(true);
        setStatus('idle');
    };

    const handleToggleMute = () => {
        console.log('VoiceWidget: Mute Toggle Clicked. SessionActive:', isSessionActive, 'Current Muted:', isMuted);
        if (!socket || !isSessionActive) {
            console.warn('VoiceWidget: Toggle ignored - Socket/Session invalid');
            return;
        }

        if (isMuted) {
            console.log('VoiceWidget: Emitting resume_audio');
            socket.emit('resume_audio');
            setIsMuted(false);
        } else {
            console.log('VoiceWidget: Emitting pause_audio');
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
            <div className="voice-header">
                <div className={`status-indicator ${status}`}>
                    <div className="pulse-ring"></div>
                </div>
                <span className="status-text">
                    {connected ? status.toUpperCase() : 'OFFLINE'}
                </span>
                <button className="icon-btn ghost"><MoreHorizontal size={16} /></button>
            </div>

            <div className="transcript-area">
                {history.length === 0 && (
                    <div className="transcript-line ai">
                        <span className="label">LEXI</span>
                        <p>{connected ? 'Ready to connect...' : 'Waiting for backend...'}</p>
                    </div>
                )}
                {history.map((item, idx) => (
                    <div key={idx} className={`transcript-line ${item.speaker}`}>
                        <span className="label">{item.speaker === 'ai' ? 'LEXI' : 'YOU'}</span>
                        <p>{item.text}</p>
                    </div>
                ))}
                <div ref={historyEndRef} />
            </div>

            <div className="input-area">
                {/* Session Control */}
                {!isSessionActive ? (
                    <button
                        className="session-btn start"
                        onClick={handleStartSession}
                        disabled={!connected}
                        title="Start voice session"
                    >
                        <Phone size={18} />
                    </button>
                ) : (
                    <button
                        className="session-btn stop"
                        onClick={handleStopSession}
                        title="End voice session"
                    >
                        <PhoneOff size={18} />
                    </button>
                )}

                {/* Mute Toggle */}
                <button
                    className={`mic-btn ${!isMuted ? 'active' : ''}`}
                    onClick={handleToggleMute}
                    disabled={!isSessionActive}
                    title={isMuted ? 'Unmute' : 'Mute'}
                >
                    {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>

                {/* Text Input */}
                <input
                    type="text"
                    placeholder="Type a message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={!connected}
                />
                <button
                    className="send-btn"
                    onClick={handleSendText}
                    disabled={!connected || !input.trim()}
                >
                    <Send size={18} />
                </button>
            </div>
        </div>
    );
};
