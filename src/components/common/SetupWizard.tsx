import React, { useEffect, useState, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import { Key, CheckCircle, AlertCircle, Loader2, WifiOff } from 'lucide-react';
import './SetupWizard.css';

interface SetupStatus {
    gemini_configured: boolean;
    openclaw_configured: boolean;
    first_run: boolean;
}

const CONNECTION_TIMEOUT_MS = 10000; // 10 seconds

export const SetupWizard: React.FC = () => {
    const { socket, connected } = useSocket();
    const [visible, setVisible] = useState(true); // Start visible to show connecting state
    const [apiKey, setApiKey] = useState('');
    const [step, setStep] = useState<'connecting' | 'loading' | 'api-key' | 'testing' | 'success' | 'error' | 'connection-error'>('connecting');
    const [errorMessage, setErrorMessage] = useState('');
    const [connectionAttempts, setConnectionAttempts] = useState(0);

    const handleRetryConnection = useCallback(() => {
        setStep('connecting');
        setConnectionAttempts(prev => prev + 1);
        // Socket.IO will automatically try to reconnect
        if (socket) {
            socket.connect();
        }
    }, [socket]);

    // Handle connection state
    useEffect(() => {
        if (connected) {
            setStep('loading');
            return;
        }

        // Show connecting state initially
        if (step === 'connecting') {
            const timeout = setTimeout(() => {
                if (!connected) {
                    setStep('connection-error');
                    setErrorMessage('Could not connect to Lexi backend. The backend may still be starting up.');
                }
            }, CONNECTION_TIMEOUT_MS);

            return () => clearTimeout(timeout);
        }
    }, [connected, step, connectionAttempts]);

    useEffect(() => {
        if (!socket || !connected) return;

        // Request setup status
        socket.emit('get_setup_status');

        const handleSetupStatus = (status: SetupStatus) => {
            if (!status.gemini_configured) {
                setVisible(true);
                setStep('api-key');
            } else {
                setVisible(false);
            }
        };

        const handleApiKeyResult = (result: { success: boolean; error?: string }) => {
            if (result.success) {
                setStep('success');
                setTimeout(() => {
                    setVisible(false);
                }, 2000);
            } else {
                setStep('error');
                setErrorMessage(result.error || 'Invalid API key');
            }
        };

        const handleDisconnect = () => {
            // If we disconnect while in a critical step, show connection error
            if (step === 'testing') {
                setStep('connection-error');
                setErrorMessage('Lost connection to backend during API key validation.');
            }
        };

        socket.on('setup_status', handleSetupStatus);
        socket.on('api_key_result', handleApiKeyResult);
        socket.on('disconnect', handleDisconnect);

        return () => {
            socket.off('setup_status', handleSetupStatus);
            socket.off('api_key_result', handleApiKeyResult);
            socket.off('disconnect', handleDisconnect);
        };
    }, [socket, connected, step]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!apiKey.trim()) return;

        setStep('testing');
        socket?.emit('set_api_key', { key: apiKey.trim() });
    };

    const handleRetry = () => {
        setStep('api-key');
        setApiKey('');
        setErrorMessage('');
    };

    if (!visible) return null;

    return (
        <div className="setup-wizard-overlay">
            <div className="setup-wizard-modal">
                <div className="setup-wizard-header">
                    <h1>Welcome to Lexi</h1>
                    <p>Let's get you set up</p>
                </div>

                {step === 'connecting' && (
                    <div className="setup-step">
                        <Loader2 className="spin" size={48} />
                        <p>Connecting to backend...</p>
                    </div>
                )}

                {step === 'connection-error' && (
                    <div className="setup-step error">
                        <WifiOff size={48} />
                        <h2>Backend Unavailable</h2>
                        <p>{errorMessage}</p>
                        <p className="setup-hint">
                            If running from the app bundle, check Console.app for backend logs.
                        </p>
                        <button onClick={handleRetryConnection} className="setup-button">
                            Retry Connection
                        </button>
                    </div>
                )}

                {step === 'loading' && (
                    <div className="setup-step">
                        <Loader2 className="spin" size={48} />
                        <p>Checking configuration...</p>
                    </div>
                )}

                {step === 'api-key' && (
                    <form onSubmit={handleSubmit} className="setup-step">
                        <div className="setup-icon">
                            <Key size={48} />
                        </div>
                        <h2>Gemini API Key</h2>
                        <p className="setup-description">
                            Lexi uses Google's Gemini for voice and AI. Get your free API key from{' '}
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">
                                Google AI Studio
                            </a>
                        </p>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter your Gemini API key"
                            className="setup-input"
                            autoFocus
                        />
                        <button type="submit" className="setup-button" disabled={!apiKey.trim()}>
                            Continue
                        </button>
                    </form>
                )}

                {step === 'testing' && (
                    <div className="setup-step">
                        <Loader2 className="spin" size={48} />
                        <p>Testing API key...</p>
                    </div>
                )}

                {step === 'success' && (
                    <div className="setup-step success">
                        <CheckCircle size={48} />
                        <h2>You're all set!</h2>
                        <p>Lexi is ready to use</p>
                    </div>
                )}

                {step === 'error' && (
                    <div className="setup-step error">
                        <AlertCircle size={48} />
                        <h2>Something went wrong</h2>
                        <p>{errorMessage}</p>
                        <button onClick={handleRetry} className="setup-button">
                            Try Again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
