import React, { useEffect, useState } from 'react';
import { Home, RefreshCw, Lightbulb, Power, Zap } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import './KasaView.css';

interface KasaDevice {
    ip: string;
    alias: string;
    model: string;
    is_on?: boolean;
    brightness?: number;
    device_type?: string;
}

export const KasaView: React.FC = () => {
    const { socket, connected } = useSocket();
    const [devices, setDevices] = useState<KasaDevice[]>([]);
    const [isDiscovering, setIsDiscovering] = useState(false);

    useEffect(() => {
        if (!socket) return;

        const handleDevices = (data: KasaDevice[]) => {
            setDevices(data);
            setIsDiscovering(false);
        };

        const handleDeviceUpdate = (data: { devices: KasaDevice[] }) => {
            if (data.devices) {
                setDevices(data.devices);
            }
        };

        socket.on('kasa_devices', handleDevices);
        socket.on('device_update', handleDeviceUpdate);

        // Request device list on mount
        socket.emit('discover_kasa');

        return () => {
            socket.off('kasa_devices', handleDevices);
            socket.off('device_update', handleDeviceUpdate);
        };
    }, [socket]);

    const handleDiscover = () => {
        if (!socket) return;
        setIsDiscovering(true);
        socket.emit('discover_kasa');
    };

    const handleToggleDevice = (device: KasaDevice) => {
        if (!socket) return;
        socket.emit('control_kasa', {
            ip: device.ip,
            action: device.is_on ? 'off' : 'on'
        });
        // Optimistic update
        setDevices(prev => prev.map(d =>
            d.ip === device.ip ? { ...d, is_on: !d.is_on } : d
        ));
    };

    const handleSetBrightness = (device: KasaDevice, brightness: number) => {
        if (!socket) return;
        socket.emit('control_kasa', {
            ip: device.ip,
            action: 'brightness',
            value: brightness
        });
        setDevices(prev => prev.map(d =>
            d.ip === device.ip ? { ...d, brightness } : d
        ));
    };

    const getDeviceIcon = (device: KasaDevice) => {
        if (device.device_type === 'plug' || device.model.toLowerCase().includes('plug')) {
            return <Power size={20} />;
        }
        return <Lightbulb size={20} />;
    };

    return (
        <div className="kasa-view">
            <div className="view-header">
                <div className="header-title">
                    <Home size={20} />
                    <h2>Smart Home</h2>
                </div>
                <div className="header-actions">
                    <button
                        className="action-btn"
                        onClick={handleDiscover}
                        disabled={!connected || isDiscovering}
                    >
                        <RefreshCw size={16} className={isDiscovering ? 'spin' : ''} />
                        {isDiscovering ? 'Scanning...' : 'Discover'}
                    </button>
                </div>
            </div>

            <div className="device-grid">
                {devices.length === 0 ? (
                    <div className="empty-state">
                        <Zap size={48} className="empty-icon" />
                        <p>No devices found</p>
                        <span>Make sure your Kasa devices are on the same network</span>
                    </div>
                ) : (
                    devices.map((device, idx) => (
                        <div
                            key={idx}
                            className={`device-card ${device.is_on ? 'on' : 'off'}`}
                        >
                            <div className="device-header">
                                <div className={`device-icon ${device.is_on ? 'active' : ''}`}>
                                    {getDeviceIcon(device)}
                                </div>
                                <button
                                    className={`power-toggle ${device.is_on ? 'on' : ''}`}
                                    onClick={() => handleToggleDevice(device)}
                                >
                                    <Power size={16} />
                                </button>
                            </div>
                            <div className="device-info">
                                <span className="device-name">{device.alias}</span>
                                <span className="device-model">{device.model}</span>
                            </div>
                            {device.brightness !== undefined && (
                                <div className="brightness-control">
                                    <input
                                        type="range"
                                        min="1"
                                        max="100"
                                        value={device.brightness}
                                        onChange={e => handleSetBrightness(device, parseInt(e.target.value))}
                                        className="brightness-slider"
                                    />
                                    <span className="brightness-value">{device.brightness}%</span>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
