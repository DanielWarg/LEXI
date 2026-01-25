import React, { useEffect, useState, useRef } from 'react';
import { Box, RefreshCw, Play, Download, Printer } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import './CadToolContext.css';

interface RetryInfo {
    attempt?: number;
    maxAttempts?: number;
    error?: string | null;
}

export const CadToolContext: React.FC = () => {
    const { socket } = useSocket();
    const [prompt, setPrompt] = useState('');
    const [thoughts, setThoughts] = useState('');
    const [retryInfo, setRetryInfo] = useState<RetryInfo>({});
    const [isGenerating, setIsGenerating] = useState(false);
    const [hasModel, setHasModel] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const thoughtsEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll thoughts
    useEffect(() => {
        if (thoughtsEndRef.current) {
            thoughtsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [thoughts]);

    useEffect(() => {
        if (!socket) return;

        const handleCadData = (data: { format?: string }) => {
            console.log('[CadToolContext] CAD data received');
            setIsGenerating(false);
            setThoughts('');
            setIsSending(false);
            if (data.format === 'stl') {
                setHasModel(true);
            }
        };

        const handleCadStatus = (data: { status: string; attempt?: number; maxAttempts?: number; error?: string }) => {
            console.log('[CadToolContext] CAD status:', data.status);
            if (data.status === 'retrying') {
                setRetryInfo({
                    attempt: data.attempt,
                    maxAttempts: data.maxAttempts,
                    error: data.error
                });
            } else if (data.status === 'generating') {
                setIsGenerating(true);
                setRetryInfo({});
                setThoughts('');
            }
        };

        const handleCadThought = (data: { text: string }) => {
            setThoughts(prev => prev + data.text);
        };

        socket.on('cad_data', handleCadData);
        socket.on('cad_status', handleCadStatus);
        socket.on('cad_thought', handleCadThought);

        return () => {
            socket.off('cad_data', handleCadData);
            socket.off('cad_status', handleCadStatus);
            socket.off('cad_thought', handleCadThought);
        };
    }, [socket]);

    const handleGenerate = () => {
        if (!socket) {
            console.error('[CadToolContext] No socket connection!');
            return;
        }
        if (!prompt.trim()) {
            console.warn('[CadToolContext] Empty prompt, not sending');
            return;
        }
        console.log('[CadToolContext] === EMITTING generate_cad ===');
        console.log('[CadToolContext] Socket connected:', socket.connected);
        console.log('[CadToolContext] Prompt:', prompt);
        setIsSending(true);
        setIsGenerating(true);
        socket.emit('generate_cad', { prompt });
        setPrompt('');
    };

    const handleIterate = () => {
        if (!socket || !prompt.trim()) return;
        setIsSending(true);
        socket.emit('iterate_cad', { prompt });
        setPrompt('');
    };

    const handlePrint = () => {
        if (!socket) return;
        socket.emit('request_print_window');
    };

    const handleDownload = () => {
        if (!socket) return;
        socket.emit('download_cad');
    };

    return (
        <div className="cad-tool-context">
            <div className="context-header">
                <Box size={16} className="context-icon" />
                <span>3D DESIGN</span>
            </div>

            {/* Action buttons when model exists */}
            {hasModel && !isGenerating && (
                <div className="context-actions">
                    <button className="ctx-btn" onClick={handlePrint}>
                        <Printer size={14} />
                        Print
                    </button>
                    <button className="ctx-btn" onClick={handleDownload}>
                        <Download size={14} />
                        Export
                    </button>
                </div>
            )}

            {/* Input area */}
            <div className="context-input">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={hasModel
                        ? "Describe changes to make..."
                        : "Describe what to create..."}
                    disabled={isGenerating}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            hasModel ? handleIterate() : handleGenerate();
                        }
                    }}
                />
                <div className="input-buttons">
                    {hasModel ? (
                        <button
                            className="ctx-btn primary"
                            onClick={handleIterate}
                            disabled={isSending || !prompt.trim() || isGenerating}
                        >
                            <RefreshCw size={14} />
                            Iterate
                        </button>
                    ) : (
                        <button
                            className="ctx-btn primary"
                            onClick={handleGenerate}
                            disabled={isSending || !prompt.trim() || isGenerating}
                        >
                            <Play size={14} />
                            Generate
                        </button>
                    )}
                </div>
            </div>

            {/* Thoughts panel during generation */}
            {isGenerating && (
                <div className="context-thoughts">
                    <div className="thoughts-header">
                        <span className="thinking-dot"></span>
                        <span>Thinking...</span>
                        {retryInfo.attempt && (
                            <span className={`retry-info ${retryInfo.error ? 'error' : ''}`}>
                                {retryInfo.attempt}/{retryInfo.maxAttempts || 3}
                            </span>
                        )}
                    </div>
                    {retryInfo.error && (
                        <div className="error-msg">⚠ {retryInfo.error}</div>
                    )}
                    <div className="thoughts-text">
                        {thoughts}
                        <div ref={thoughtsEndRef} />
                    </div>
                </div>
            )}

            {/* Status */}
            <div className="context-status">
                {isGenerating ? 'GENERATING...' : hasModel ? 'MODEL READY' : 'READY'}
            </div>
        </div>
    );
};
