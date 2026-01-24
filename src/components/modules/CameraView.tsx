import React, { useEffect, useRef, useState } from 'react';
import { Camera, Video, VideoOff, RotateCw, Maximize2 } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import './CameraView.css';

export const CameraView: React.FC = () => {
    const { socket, connected } = useSocket();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setStream(mediaStream);
            setIsStreaming(true);

            // Start sending frames to backend
            intervalRef.current = setInterval(() => {
                captureAndSendFrame();
            }, 500); // Send 2 frames per second

        } catch (err) {
            console.error('Failed to access camera:', err);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setIsStreaming(false);
    };

    const captureAndSendFrame = () => {
        if (!videoRef.current || !canvasRef.current || !socket) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!ctx) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        // Convert to base64 JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        const base64 = dataUrl.split(',')[1];

        socket.emit('video_frame', { image: base64 });
    };

    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    return (
        <div className="camera-view">
            <div className="view-header">
                <div className="header-title">
                    <Camera size={20} />
                    <h2>Camera Feed</h2>
                </div>
                <div className="header-actions">
                    {!isStreaming ? (
                        <button
                            className="action-btn primary"
                            onClick={startCamera}
                            disabled={!connected}
                        >
                            <Video size={16} />
                            Start Camera
                        </button>
                    ) : (
                        <button
                            className="action-btn stop"
                            onClick={stopCamera}
                        >
                            <VideoOff size={16} />
                            Stop
                        </button>
                    )}
                </div>
            </div>

            <div className="camera-container">
                {isStreaming ? (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="camera-feed"
                    />
                ) : (
                    <div className="camera-placeholder">
                        <Camera size={64} className="placeholder-icon" />
                        <p>Camera is off</p>
                        <span>Click "Start Camera" to enable video feed to Lexi</span>
                    </div>
                )}
            </div>

            {/* Hidden canvas for frame capture */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {isStreaming && (
                <div className="camera-status">
                    <div className="status-dot live"></div>
                    <span>Streaming to Lexi • 2 FPS</span>
                </div>
            )}
        </div>
    );
};
