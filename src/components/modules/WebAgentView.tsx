import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Globe } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import './WebAgentView.css';

export const WebAgentView: React.FC = () => {
    const { socket } = useSocket();
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const lastSentSize = useRef({ width: 0, height: 0 });

    // Send canvas size to backend
    const sendCanvasSize = useCallback(() => {
        if (!socket || !viewportRef.current) return;

        const rect = viewportRef.current.getBoundingClientRect();
        const width = Math.floor(rect.width);
        const height = Math.floor(rect.height);

        const threshold = 50;

        if (width > 0 && height > 0) {
            const widthDiff = Math.abs(width - lastSentSize.current.width);
            const heightDiff = Math.abs(height - lastSentSize.current.height);

            if (widthDiff > threshold || heightDiff > threshold || lastSentSize.current.width === 0) {
                console.log(`[WebAgentView] Sending canvas resize: ${width}x${height}`);
                socket.emit('ui_canvas_resize', { width, height });
                lastSentSize.current = { width, height };
            }
        }
    }, [socket]);

    // Resize observer with debounce
    useEffect(() => {
        if (!viewportRef.current) return;

        let timeoutId: ReturnType<typeof setTimeout>;

        timeoutId = setTimeout(() => {
            sendCanvasSize();
        }, 500);

        const resizeObserver = new ResizeObserver(() => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(sendCanvasSize, 200);
        });

        resizeObserver.observe(viewportRef.current);

        return () => {
            clearTimeout(timeoutId);
            resizeObserver.disconnect();
        };
    }, [sendCanvasSize]);

    useEffect(() => {
        if (!socket) return;

        const handleFrame = (data: { image: string; log?: string }) => {
            if (data.image) {
                setImageSrc(data.image);
            }
        };

        socket.on('browser_frame', handleFrame);

        return () => {
            socket.off('browser_frame', handleFrame);
        };
    }, [socket]);

    return (
        <div className="web-agent-view" ref={viewportRef}>
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
                    <span className="sub-text">Use the tool panel to send commands.</span>
                </div>
            )}
        </div>
    );
};
