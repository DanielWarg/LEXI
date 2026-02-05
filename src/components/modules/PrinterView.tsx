import React, { useEffect, useState } from 'react';
import { Printer, Plus, RefreshCw, Play, CheckCircle, AlertCircle } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import './PrinterView.css';

interface PrinterInfo {
    host: string;
    port: number;
    name: string;
    type: string;
    status?: string;
}

interface PrintStatus {
    printer_name: string;
    status: string;
    progress?: number;
    time_remaining?: string;
    filename?: string;
}

export const PrinterView: React.FC = () => {
    const { socket, connected } = useSocket();
    const [printers, setPrinters] = useState<PrinterInfo[]>([]);
    const [printStatuses, setPrintStatuses] = useState<Record<string, PrintStatus>>({});
    const [isDiscovering, setIsDiscovering] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newPrinter, setNewPrinter] = useState({ host: '', port: 80, name: '', type: 'bambu' });

    useEffect(() => {
        if (!socket) return;

        const handlePrinterList = (data: PrinterInfo[]) => {
            setPrinters(data);
            setIsDiscovering(false);
        };

        const handlePrintStatus = (data: PrintStatus) => {
            setPrintStatuses(prev => ({
                ...prev,
                [data.printer_name]: data
            }));
        };

        socket.on('printer_list', handlePrinterList);
        socket.on('print_status_update', handlePrintStatus);

        // Request printer list on mount
        socket.emit('discover_printers');

        return () => {
            socket.off('printer_list', handlePrinterList);
            socket.off('print_status_update', handlePrintStatus);
        };
    }, [socket]);

    const handleDiscover = () => {
        if (!socket) return;
        setIsDiscovering(true);
        socket.emit('discover_printers');
    };

    const handleAddPrinter = () => {
        if (!socket || !newPrinter.host || !newPrinter.name) return;
        socket.emit('add_printer', newPrinter);
        setNewPrinter({ host: '', port: 80, name: '', type: 'bambu' });
        setShowAddForm(false);
    };

    const getStatusIcon = (status?: string) => {
        if (!status) return null;
        if (status === 'printing') return <Play size={14} className="status-icon printing" />;
        if (status === 'idle') return <CheckCircle size={14} className="status-icon idle" />;
        return <AlertCircle size={14} className="status-icon warning" />;
    };

    return (
        <div className="printer-view">
            <div className="view-header">
                <div className="header-title">
                    <Printer size={20} />
                    <h2>3D Printers</h2>
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
                    <button
                        className="action-btn primary"
                        onClick={() => setShowAddForm(!showAddForm)}
                    >
                        <Plus size={16} />
                        Add
                    </button>
                </div>
            </div>

            {showAddForm && (
                <div className="add-printer-form">
                    <input
                        type="text"
                        placeholder="Printer Name"
                        value={newPrinter.name}
                        onChange={e => setNewPrinter(p => ({ ...p, name: e.target.value }))}
                    />
                    <input
                        type="text"
                        placeholder="IP Address / Host"
                        value={newPrinter.host}
                        onChange={e => setNewPrinter(p => ({ ...p, host: e.target.value }))}
                    />
                    <input
                        type="number"
                        placeholder="Port"
                        value={newPrinter.port}
                        onChange={e => setNewPrinter(p => ({ ...p, port: parseInt(e.target.value) || 80 }))}
                    />
                    <select
                        value={newPrinter.type}
                        onChange={e => setNewPrinter(p => ({ ...p, type: e.target.value }))}
                    >
                        <option value="bambu">Bambu Lab</option>
                        <option value="octoprint">OctoPrint</option>
                        <option value="prusa">Prusa Connect</option>
                    </select>
                    <button className="action-btn primary" onClick={handleAddPrinter}>
                        Save Printer
                    </button>
                </div>
            )}

            <div className="printer-list">
                {printers.length === 0 ? (
                    <div className="empty-state">
                        <Printer size={48} className="empty-icon" />
                        <p>No printers found</p>
                        <span>Click Discover to scan your network</span>
                    </div>
                ) : (
                    printers.map((printer, idx) => {
                        const status = printStatuses[printer.name];
                        return (
                            <div key={idx} className="printer-card">
                                <div className="printer-info">
                                    <div className="printer-name">
                                        {getStatusIcon(status?.status)}
                                        <span>{printer.name}</span>
                                    </div>
                                    <div className="printer-details">
                                        <span className="printer-type">{printer.type}</span>
                                        <span className="printer-host">{printer.host}:{printer.port}</span>
                                    </div>
                                </div>
                                {status?.progress !== undefined && (
                                    <div className="print-progress">
                                        <div className="progress-bar">
                                            <div
                                                className="progress-fill"
                                                style={{ width: `${status.progress}%` }}
                                            />
                                        </div>
                                        <span className="progress-text">
                                            {status.progress}% {status.time_remaining && `• ${status.time_remaining}`}
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
