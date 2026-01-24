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

    // Mock devices for UI (since backend sends them separately via props in Ref-Lexi, 
    // but here we might need to fetch them or just stub them if socket doesn't send list)
    // In Ref-Lexi, App.jsx passes them. We'll simulate for now or fetch if backend has an event.
    const micDevices = [{ deviceId: 'default', label: 'Default Microphone' }];
    const speakerDevices = [{ deviceId: 'default', label: 'Default Speaker' }];
    const webcamDevices = [{ deviceId: 'default', label: 'FaceTime HD Camera' }];

    useEffect(() => {
        if (!socket) return;

        socket.emit('get_settings');

        const handleSettings = (settings: any) => {
            if (settings) {
                if (settings.tool_permissions) setPermissions(settings.tool_permissions);
                if (typeof settings.face_auth_enabled !== 'undefined') {
                    setFaceAuthEnabled(settings.face_auth_enabled);
                }
            }
        };

        socket.on('settings', handleSettings);
        return () => {
            socket.off('settings', handleSettings);
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
                    <label>Microphone</label>
                    <select className="dark-select">
                        {micDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label}</option>)}
                    </select>
                </div>
                <div className="setting-group">
                    <label>Speaker</label>
                    <select className="dark-select">
                        {speakerDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label}</option>)}
                    </select>
                </div>
                <div className="setting-group">
                    <label>Camera Camera</label>
                    <select className="dark-select">
                        {webcamDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label}</option>)}
                    </select>
                </div>
            </div>
        </div>
    );
};
