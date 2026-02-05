import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Box } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Center } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import * as THREE from 'three';
import './CadView.css';

interface CadData {
    format?: string;
    data?: string;
    filename?: string;
}

// Camera controller that auto-fits to geometry and handles zoom commands
const CameraController: React.FC<{
    geometry: THREE.BufferGeometry | null;
    zoomLevel: number;
    onReady: () => void;
}> = ({ geometry, zoomLevel, onReady }) => {
    const { camera } = useThree();
    const controlsRef = useRef<any>(null);
    const hasInitialized = useRef(false);

    // Auto-fit camera when geometry changes
    useEffect(() => {
        if (!geometry || hasInitialized.current) return;

        // Compute bounding box
        geometry.computeBoundingBox();
        const box = geometry.boundingBox;
        if (!box) return;

        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);

        // Calculate camera distance to fit ~80% of viewport
        const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
        const distance = (maxDim / 2) / Math.tan(fov / 2) * 1.5; // 1.5 for ~80% fill

        // Position camera at a nice angle
        const newPos = new THREE.Vector3(distance, distance * 0.8, distance);
        camera.position.copy(newPos);
        camera.lookAt(0, 0, 0);

        if (controlsRef.current) {
            controlsRef.current.target.set(0, 0, 0);
            controlsRef.current.update();
        }

        hasInitialized.current = true;
        onReady();
    }, [geometry, camera, onReady]);

    // Handle zoom level changes from voice commands
    useEffect(() => {
        if (!controlsRef.current || zoomLevel === 1) return;

        const currentDistance = camera.position.length();
        const newDistance = currentDistance / zoomLevel;

        // Animate zoom smoothly
        const direction = camera.position.clone().normalize();
        const targetPos = direction.multiplyScalar(newDistance);

        camera.position.lerp(targetPos, 0.3);
        controlsRef.current.update();
    }, [zoomLevel, camera]);

    // Reset initialization flag when geometry changes
    useEffect(() => {
        hasInitialized.current = false;
    }, [geometry]);

    return (
        <OrbitControls
            ref={controlsRef}
            makeDefault
            autoRotate
            autoRotateSpeed={0.5}
            enableDamping
            dampingFactor={0.05}
            minDistance={1}
            maxDistance={1000}
        />
    );
};

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
            meshRef.current.rotation.x += delta * 0.5;
            meshRef.current.rotation.y += delta * 0.5;
        }
    });
    return (
        <mesh ref={meshRef}>
            <boxGeometry args={[2, 2, 2]} />
            <meshStandardMaterial wireframe color="cyan" transparent opacity={0.5} />
        </mesh>
    );
};

interface CadViewProps {
    initialData?: CadData | null;
}

export const CadView: React.FC<CadViewProps> = ({ initialData }) => {
    const { socket } = useSocket();
    const [cadData, setCadData] = useState<CadData | null>(initialData || null);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [isReady, setIsReady] = useState(false);

    // Sync with initialData prop when it changes
    useEffect(() => {
        if (initialData) {
            console.log('[CadView] Received initialData:', initialData.format);
            setCadData(initialData);
            setIsReady(false); // Reset ready state for new model
        }
    }, [initialData]);

    // Listen for socket events
    useEffect(() => {
        if (!socket) return;

        const handleCadData = (data: CadData) => {
            console.log('[CadView] Received CAD data via socket:', data.format);
            setCadData(data);
            setIsReady(false);
        };

        const handleCadStatus = (data: { status: string }) => {
            if (data.status === 'generating') {
                setCadData({ format: 'loading' });
                setIsReady(false);
            }
        };

        // Voice-controlled camera commands
        const handleCadZoom = (data: { action: string; factor?: number }) => {
            console.log('[CadView] Zoom command:', data);
            switch (data.action) {
                case 'in':
                    setZoomLevel(prev => prev * (data.factor || 1.5));
                    break;
                case 'out':
                    setZoomLevel(prev => prev / (data.factor || 1.5));
                    break;
                case 'reset':
                    setZoomLevel(1);
                    setIsReady(false); // Trigger re-fit
                    break;
            }
        };

        socket.on('cad_data', handleCadData);
        socket.on('cad_status', handleCadStatus);
        socket.on('cad_zoom', handleCadZoom);

        return () => {
            socket.off('cad_data', handleCadData);
            socket.off('cad_status', handleCadStatus);
            socket.off('cad_zoom', handleCadZoom);
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
            geom.computeBoundingBox();
            return geom;
        } catch (e) {
            console.error('[CadView] Failed to parse STL:', e);
            return null;
        }
    }, [cadData]);

    const handleCameraReady = useCallback(() => {
        setIsReady(true);
    }, []);

    const isLoading = cadData?.format === 'loading';

    return (
        <div className="cad-view">
            {/* 3D Viewport */}
            <div className="cad-viewport">
                <Canvas
                    shadows
                    camera={{ position: [50, 50, 50], fov: 50, near: 0.1, far: 10000 }}
                    gl={{ antialias: true }}
                >
                    <color attach="background" args={['#0a0a0a']} />

                    {/* Lighting */}
                    <ambientLight intensity={0.4} />
                    <directionalLight
                        position={[50, 50, 50]}
                        intensity={1}
                        castShadow
                        shadow-mapSize={[2048, 2048]}
                    />
                    <directionalLight position={[-50, -50, -50]} intensity={0.3} />
                    <pointLight position={[0, 50, 0]} intensity={0.5} />

                    {/* Grid for reference */}
                    <gridHelper args={[100, 20, '#333', '#222']} position={[0, -0.01, 0]} />

                    {isLoading ? (
                        <LoadingCube />
                    ) : (
                        geometry && (
                            <>
                                <Center>
                                    <GeometryModel geometry={geometry} />
                                </Center>
                                <CameraController
                                    geometry={geometry}
                                    zoomLevel={zoomLevel}
                                    onReady={handleCameraReady}
                                />
                            </>
                        )
                    )}

                    {/* Default controls when no geometry */}
                    {!geometry && !isLoading && (
                        <OrbitControls makeDefault />
                    )}
                </Canvas>

                {/* Empty state overlay */}
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
                <span>CAD: {cadData?.format?.toUpperCase() || 'READY'}</span>
                {isReady && geometry && (
                    <span className="zoom-hint">Scroll to zoom • Drag to rotate</span>
                )}
            </div>
        </div>
    );
};
