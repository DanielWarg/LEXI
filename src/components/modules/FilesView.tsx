import React, { useEffect, useState } from 'react';
import { FolderOpen, File, ChevronRight, Upload, Download, Trash2 } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import './FilesView.css';

interface FileItem {
    name: string;
    type: 'file' | 'directory';
    path: string;
    size?: number;
}

export const FilesView: React.FC = () => {
    const { socket, connected } = useSocket();
    const [currentProject, setCurrentProject] = useState<string>('Default');
    const [files, setFiles] = useState<FileItem[]>([]);
    const [currentPath, setCurrentPath] = useState<string[]>([]);

    useEffect(() => {
        if (!socket) return;

        const handleProjectUpdate = (data: any) => {
            setCurrentProject(data.project || 'Default');
        };

        socket.on('project_update', handleProjectUpdate);

        return () => {
            socket.off('project_update', handleProjectUpdate);
        };
    }, [socket]);

    const handleNavigate = (item: FileItem) => {
        if (item.type === 'directory') {
            setCurrentPath(prev => [...prev, item.name]);
        }
    };

    const handleBack = () => {
        setCurrentPath(prev => prev.slice(0, -1));
    };

    return (
        <div className="files-view">
            <div className="view-header">
                <div className="header-title">
                    <FolderOpen size={20} />
                    <h2>Project Files</h2>
                </div>
                <div className="header-actions">
                    <span className="project-badge">{currentProject}</span>
                </div>
            </div>

            <div className="breadcrumb">
                <button onClick={() => setCurrentPath([])}>
                    <FolderOpen size={14} />
                    root
                </button>
                {currentPath.map((segment, idx) => (
                    <React.Fragment key={idx}>
                        <ChevronRight size={14} />
                        <button onClick={() => setCurrentPath(currentPath.slice(0, idx + 1))}>
                            {segment}
                        </button>
                    </React.Fragment>
                ))}
            </div>

            <div className="files-list">
                {files.length === 0 ? (
                    <div className="empty-state">
                        <FolderOpen size={48} className="empty-icon" />
                        <p>No files in project</p>
                        <span>Start a voice session to create files, or use the directory tools.</span>
                    </div>
                ) : (
                    files.map((item, idx) => (
                        <div
                            key={idx}
                            className={`file-item ${item.type}`}
                            onClick={() => handleNavigate(item)}
                        >
                            {item.type === 'directory' ? (
                                <FolderOpen size={18} />
                            ) : (
                                <File size={18} />
                            )}
                            <span className="file-name">{item.name}</span>
                            {item.size && (
                                <span className="file-size">
                                    {(item.size / 1024).toFixed(1)} KB
                                </span>
                            )}
                        </div>
                    ))
                )}
            </div>

            <div className="files-footer">
                <div className="footer-info">
                    <span>Project: <strong>{currentProject}</strong></span>
                </div>
            </div>
        </div>
    );
};
