import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Box } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Center, Stage } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import * as THREE from 'three';
import './CadView.css';

interface CadData {
    format?: string;
    data?: string;
    filename?: string;
}

// 3D Model component that renders parsed STL geometry
const GeometryModel: React.FC<{ geometry: THREE.BufferGeometry }> = ({ geometry }) => {
    return (
        <mesh geometry={geometry} castShadow receiveShadow>
            <meshStandardMaterial color="#06b6d4" roughness={0.3} metalness={0.8} />
        </mesh>
    );
};

// Animated loading cube
const LoadingCube: React.FC = () => {
    const meshRef = useRef<THREE.Mesh>(null);
    useFrame((_, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.x += delta;
            meshRef.current.rotation.y += delta;
        }
    });
    return (
        <mesh ref={meshRef}>
            <boxGeometry args={[10, 10, 10]} />
            <meshStandardMaterial wireframe color="cyan" transparent opacity={0.5} />
        </mesh>
    );
};

export const CadView: React.FC = () => {
    const { socket } = useSocket();
    const [cadData, setCadData] = useState<CadData | null>(null);

    useEffect(() => {
        if (!socket) return;

        const handleCadData = (data: CadData) => {
            console.log('[CadView] Received CAD data:', data.format);
            setCadData(data);
        };

        const handleCadStatus = (data: { status: string }) => {
            if (data.status === 'generating') {
                setCadData({ format: 'loading' });
            }
        };

        socket.on('cad_data', handleCadData);
        socket.on('cad_status', handleCadStatus);

        return () => {
            socket.off('cad_data', handleCadData);
            socket.off('cad_status', handleCadStatus);
        };
    }, [socket]);

    // Parse STL from base64
    const geometry = useMemo(() => {
        if (!cadData || cadData.format !== 'stl' || !cadData.data) return null;

        try {
            const byteCharacters = atob(cadData.data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);

            const loader = new STLLoader();
            const geom = loader.parse(byteArray.buffer);
            geom.center();
            return geom;
        } catch (e) {
            console.error('[CadView] Failed to parse STL:', e);
            return null;
        }
    }, [cadData]);

    const isLoading = cadData?.format === 'loading';
    const hasModel = cadData?.format === 'stl' && geometry;

    return (
        <div className="cad-view">
            {/* 3D Viewport */}
            <div className="cad-viewport">
                <Canvas shadows camera={{ position: [4, 4, 4], fov: 45 }}>
                    <color attach="background" args={['#101010']} />
                    <Stage environment="city" intensity={0.5}>
                        {isLoading ? (
                            <LoadingCube />
                        ) : (
                            geometry && (
                                <Center>
                                    <GeometryModel geometry={geometry} />
                                </Center>
                            )
                        )}
                    </Stage>
                    <OrbitControls autoRotate autoRotateSpeed={1} makeDefault />
                </Canvas>

                {/* Empty state */}
                {!cadData && (
                    <div className="empty-state">
                        <Box size={48} className="empty-icon" />
                        <p>Describe what you want to create</p>
                        <span className="hint">Use the controls in the left panel</span>
                    </div>
                )}
            </div>

            {/* Status bar */}
            <div className="cad-status-bar">
                CAD_ENGINE: {cadData?.format?.toUpperCase() || 'READY'}
            </div>
        </div>
    );
};
