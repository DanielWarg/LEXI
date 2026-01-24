import React, { useEffect, useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { Mic, Speaker, Camera, Shield, FileText } from 'lucide-react';
import './SettingsView.css';

const TOOLS = [
    { id: 'run_web_agent', label: 'Web Agent' },
    { id: 'create_directory', label: 'Create Folder' },
    { id: 'write_file', label: 'Write File' },
    { id: 'read_directory', label: 'Read Directory' },
    { id: 'read_file', label: 'Read File' },
    { id: 'create_project', label: 'Create Project' },
    { id: 'switch_project', label: 'Switch Project' },
    { id: 'list_projects', label: 'List Projects' },
    { id: 'list_smart_devices', label: 'List Devices' },
    { id: 'control_light', label: 'Control Light' },
    { id: 'discover_printers', label: 'Discover Printers' },
    { id: 'print_stl', label: 'Print 3D Model' }
];

export const SettingsView: React.FC = () => {
    const { socket } = useSocket();
    const [permissions, setPermissions] = useState<Record<string, boolean>>({});
    const [faceAuthEnabled, setFaceAuthEnabled] = useState(false);

    const [inputDevices, setInputDevices] = useState<{ index: number, name: string }[]>([]);
    const [outputDevices, setOutputDevices] = useState<{ index: number, name: string }[]>([]);

    const [videoDevices, setVideoDevices] = useState<{ index: number, name: string, is_internal: boolean }[]>([]);

    useEffect(() => {
        if (!socket) return;

        socket.emit('get_settings');
        socket.emit('get_audio_devices');
        socket.emit('get_video_devices');

        const handleSettings = (settings: any) => {
            if (settings) {
                if (settings.tool_permissions) setPermissions(settings.tool_permissions);
                if (typeof settings.face_auth_enabled !== 'undefined') {
                    setFaceAuthEnabled(settings.face_auth_enabled);
                }
            }
        };

        const handleAudioDevices = (data: { inputs: any[], outputs: any[] }) => {
            if (data) {
                setInputDevices(data.inputs || []);
                setOutputDevices(data.outputs || []);
            }
        };

        const handleVideoDevices = (data: any[]) => {
            if (data) {
                setVideoDevices(data);
            }
        }

        socket.on('settings', handleSettings);
        socket.on('audio_devices', handleAudioDevices);
        socket.on('video_devices', handleVideoDevices);

        return () => {
            socket.off('settings', handleSettings);
            socket.off('audio_devices', handleAudioDevices);
            socket.off('video_devices', handleVideoDevices);
        };
    }, [socket]);

    const togglePermission = (toolId: string) => {
        const nextVal = !(permissions[toolId] !== false);
        setPermissions(prev => ({ ...prev, [toolId]: nextVal })); // Optimistic
        socket?.emit('update_settings', { tool_permissions: { [toolId]: nextVal } });
    };

    const toggleFaceAuth = () => {
        const nextVal = !faceAuthEnabled;
        setFaceAuthEnabled(nextVal);
        socket?.emit('update_settings', { face_auth_enabled: nextVal });
    };

    const handleInputDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const index = parseInt(e.target.value);
        console.log("Setting input device to:", index);
        socket?.emit('set_audio_device', { type: 'input', index: index });
    };

    const handleOutputDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const index = parseInt(e.target.value);
        console.log("Setting output device to:", index);
        socket?.emit('set_audio_device', { type: 'output', index: index });
    };

    const handleVideoDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const index = parseInt(e.target.value);
        console.log("Setting video device to:", index);
        socket?.emit('set_audio_device', { type: 'video', index: index });
    };

    return (
        <div className="settings-view">
            <div className="settings-column">
                <h3 className="settings-header"><Shield size={16} /> Security</h3>
                <div className="setting-item">
                    <span>Face Authentication</span>
                    <button
                        onClick={toggleFaceAuth}
                        className={`toggle-switch ${faceAuthEnabled ? 'on' : 'off'}`}
                    >
                        <div className="toggle-handle" />
                    </button>
                </div>
            </div>

            <div className="settings-column">
                <h3 className="settings-header"><Shield size={16} /> Tool Permissions</h3>
                <div className="permissions-list custom-scrollbar">
                    {TOOLS.map(tool => {
                        const isAllowed = permissions[tool.id] !== false;
                        return (
                            <div key={tool.id} className="setting-item">
                                <span>{tool.label}</span>
                                <button
                                    onClick={() => togglePermission(tool.id)}
                                    className={`toggle-switch ${isAllowed ? 'on' : 'off'}`}
                                >
                                    <div className="toggle-handle" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="settings-column">
                <h3 className="settings-header"><Mic size={16} /> Hardware</h3>
                <div className="setting-group">
                    <label>Microphone (Backend)</label>
                    <select className="dark-select" onChange={handleInputDeviceChange}>
                        {inputDevices.length === 0 && <option>Loading...</option>}
                        {inputDevices.map(d => <option key={d.index} value={d.index}>{d.name}</option>)}
                    </select>
                </div>
                <div className="setting-group">
                    <label>Speaker (Backend)</label>
                    <select className="dark-select" onChange={handleOutputDeviceChange}>
                        {outputDevices.length === 0 && <option>Loading...</option>}
                        {outputDevices.map(d => <option key={d.index} value={d.index}>{d.name}</option>)}
                    </select>
                </div>
                <div className="setting-group">
                    <label>Camera (Backend)</label>
                    <select className="dark-select" onChange={handleVideoDeviceChange}>
                        {videoDevices.length === 0 && <option>Loading...</option>}
                        {videoDevices.map(d => (
                            <option key={d.index} value={d.index}>
                                {d.name} {d.is_internal ? '(Default/Internal)' : ''}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
};
