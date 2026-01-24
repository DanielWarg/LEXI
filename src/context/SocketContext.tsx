import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { startSimulation } from '../lib/simulation';

interface SocketContextType {
    socket: Socket | null;
    connected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, connected: false });

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        // In a real app, this would connect to the Python backend
        // For now, we mock it or connect to a non-existent server which we will override
        // Actually, for distinct mocking without a server, we can create an EventEmitter that looks like a socket
        // But utilizing the real socket.io-client with a simulated server is harder without a node server.

        // STRATEGY: We will use a Mock Socket wrapper to simulate events locally.
        const mockSocket = {
            on: (event: string, callback: Function) => {
                document.addEventListener(`mock:${event}`, (e: any) => callback(e.detail));
                return mockSocket;
            },
            off: (event: string, callback: Function) => {
                document.removeEventListener(`mock:${event}`, (e: any) => callback(e.detail));
                return mockSocket;
            },
            emit: (event: string, data: any) => {
                console.log('Emit:', event, data);
                // Simulate response if needed
            },
            connected: true,
            id: 'mock-id'
        } as unknown as Socket;

        setSocket(mockSocket);
        setConnected(true);

        // Start the simulation loop
        const cleanupSimulation = startSimulation();

        return () => {
            cleanupSimulation();
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket, connected }}>
            {children}
        </SocketContext.Provider>
    );
};
