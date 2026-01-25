import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
    socket: Socket | null;
    connected: boolean;
    isAuthenticated: boolean;
    isSessionActive: boolean;
    setIsSessionActive: (active: boolean) => void;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    connected: false,
    isAuthenticated: false,
    isSessionActive: false,
    setIsSessionActive: () => { }
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connected, setConnected] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isSessionActive, setIsSessionActive] = useState(false);

    useEffect(() => {
        // Connect to real Python backend
        const newSocket = io('http://localhost:8000', {
            transports: ['websocket', 'polling'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        newSocket.on('connect', () => {
            console.log('🟢 Connected to Lexi Backend');
            setConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('🔴 Disconnected from Lexi Backend');
            setConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            console.error('❌ Connection error:', error.message);
        });

        newSocket.on('auth_status', (data: { authenticated: boolean }) => {
            console.log('🔐 Auth status:', data.authenticated);
            setIsAuthenticated(data.authenticated);
        });

        newSocket.on('status', (data: any) => {
            console.log('📡 Status:', data.msg || data);
            if (data.msg === 'Lexi Started') {
                setIsSessionActive(true);
            } else if (data.msg === 'Lexi Stopped') {
                setIsSessionActive(false);
            }
        });

        newSocket.on('error', (data: { msg: string }) => {
            console.error('⚠️ Server error:', data.msg);
        });

        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
    }, []);

    return (
        <SocketContext.Provider value={{
            socket,
            connected,
            isAuthenticated,
            isSessionActive,
            setIsSessionActive
        }}>
            {children}
        </SocketContext.Provider>
    );
};
