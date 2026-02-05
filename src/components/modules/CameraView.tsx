import React, { useEffect, useRef, useState } from 'react';
import { Camera, Video, VideoOff } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import './CameraView.css';

export const CameraView: React.FC = () => {
    const { socket, connected } = useSocket();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [hasVideo, setHasVideo] = useState(false);
    const streamRef = useRef<MediaStream | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const startCamera = async () => {
        try {
            console.log('[CameraView] Requesting camera access...');
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            });

            console.log('[CameraView] Got media stream:', mediaStream.getVideoTracks());
            streamRef.current = mediaStream;
            setIsStreaming(true);

        } catch (err) {
            console.error('[CameraView] Failed to access camera:', err);
        }
    };

    // Set srcObject when stream changes and video element is available
    useEffect(() => {
        if (isStreaming && streamRef.current && videoRef.current) {
            console.log('[CameraView] Setting srcObject on video element');
            videoRef.current.srcObject = streamRef.current;

            // Start sending frames after video is playing
            videoRef.current.onloadedmetadata = () => {
                console.log('[CameraView] Video metadata loaded');
                videoRef.current?.play().then(() => {
                    console.log('[CameraView] Video playing');
                    setHasVideo(true);

                    // Start sending frames to backend
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    intervalRef.current = setInterval(() => {
                        captureAndSendFrame();
                    }, 500); // Send 2 frames per second
                }).catch(err => {
                    console.error('[CameraView] Failed to play video:', err);
                });
            };
        }
    }, [isStreaming]);

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsStreaming(false);
        setHasVideo(false);
    };

    const captureAndSendFrame = () => {
        if (!videoRef.current || !canvasRef.current || !socket) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) return;

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
                {/* Always render video element, but show/hide based on state */}
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="camera-feed"
                    style={{ display: isStreaming && hasVideo ? 'block' : 'none' }}
                />

                {/* Show placeholder when not streaming or no video yet */}
                {(!isStreaming || !hasVideo) && (
                    <div className="camera-placeholder">
                        <Camera size={64} className="placeholder-icon" />
                        <p>{isStreaming ? 'Loading camera...' : 'Camera is off'}</p>
                        <span>
                            {isStreaming
                                ? 'Waiting for video feed...'
                                : 'Click "Start Camera" to enable video feed to Lexi'}
                        </span>
                    </div>
                )}
            </div>

            {/* Hidden canvas for frame capture */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {isStreaming && hasVideo && (
                <div className="camera-status">
                    <div className="status-dot live"></div>
                    <span>Streaming to Lexi • 2 FPS</span>
                </div>
            )}
        </div>
    );
};
