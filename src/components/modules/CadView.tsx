import React, { useEffect, useState, useRef, Suspense } from 'react';
import { Box, RefreshCw, Play, Download, Loader } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage } from '@react-three/drei';
import './CadView.css';

interface CadData {
    stl_b64?: string;
    code?: string;
    filename?: string;
}

// Simple STL Viewer placeholder - in production you'd parse the STL
const StlModel: React.FC<{ data: string }> = ({ data }) => {
    // For now, show a placeholder mesh
    // Real implementation would use STLLoader from three/examples
    return (
        <mesh>
            <boxGeometry args={[2, 2, 2]} />
            <meshStandardMaterial color="#00f3ff" wireframe />
        </mesh>
    );
};

export const CadView: React.FC = () => {
    const { socket, connected } = useSocket();
    const [prompt, setPrompt] = useState('');
    const [cadData, setCadData] = useState<CadData | null>(null);
    const [cadStatus, setCadStatus] = useState<'idle' | 'generating' | 'ready'>('idle');
    const [thought, setThought] = useState('');

    useEffect(() => {
        if (!socket) return;

        const handleCadData = (data: CadData) => {
            setCadData(data);
            setCadStatus('ready');
        };

        const handleCadStatus = (data: { status: string }) => {
            setCadStatus(data.status as any);
        };

        const handleCadThought = (data: string) => {
            setThought(data);
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
        if (!socket || !prompt.trim()) return;
        setCadStatus('generating');
        setThought('');
        socket.emit('generate_cad', { prompt });
    };

    const handleIterate = () => {
        if (!socket || !prompt.trim()) return;
        setCadStatus('generating');
        socket.emit('iterate_cad', { prompt });
    };

    const handleDownload = () => {
        if (!cadData?.stl_b64) return;
        const blob = new Blob([atob(cadData.stl_b64)], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = cadData.filename || 'model.stl';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="cad-view">
            <div className="view-header">
                <div className="header-title">
                    <Box size={20} />
                    <h2>3D Design</h2>
                </div>
                <div className="header-actions">
                    {cadData && (
                        <button className="action-btn" onClick={handleDownload}>
                            <Download size={16} />
                            Export STL
                        </button>
                    )}
                </div>
            </div>

            <div className="cad-workspace">
                <div className="cad-viewport">
                    {cadStatus === 'generating' ? (
                        <div className="generating-state">
                            <Loader size={48} className="spin" />
                            <p>Generating design...</p>
                            {thought && <span className="thought">{thought}</span>}
                        </div>
                    ) : cadData ? (
                        <Canvas shadows camera={{ position: [5, 5, 5], fov: 50 }}>
                            <Suspense fallback={null}>
                                <Stage environment="city" intensity={0.5}>
                                    <StlModel data={cadData.stl_b64 || ''} />
                                </Stage>
                            </Suspense>
                            <OrbitControls autoRotate autoRotateSpeed={1} />
                        </Canvas>
                    ) : (
                        <div className="empty-viewport">
                            <Box size={64} className="empty-icon" />
                            <p>Describe what you want to create</p>
                        </div>
                    )}
                </div>

                <div className="cad-controls">
                    <textarea
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder="Describe your 3D model... (e.g., 'A gear with 20 teeth and 50mm diameter')"
                        rows={3}
                        disabled={cadStatus === 'generating'}
                    />
                    <div className="control-buttons">
                        <button
                            className="action-btn primary"
                            onClick={handleGenerate}
                            disabled={!connected || !prompt.trim() || cadStatus === 'generating'}
                        >
                            <Play size={16} />
                            Generate New
                        </button>
                        <button
                            className="action-btn"
                            onClick={handleIterate}
                            disabled={!connected || !prompt.trim() || !cadData || cadStatus === 'generating'}
                        >
                            <RefreshCw size={16} />
                            Iterate
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
