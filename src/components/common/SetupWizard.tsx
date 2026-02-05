import React, { useEffect, useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { Key, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import './SetupWizard.css';

interface SetupStatus {
    gemini_configured: boolean;
    openclaw_configured: boolean;
    first_run: boolean;
}

export const SetupWizard: React.FC = () => {
    const { socket, connected } = useSocket();
    const [visible, setVisible] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [step, setStep] = useState<'loading' | 'api-key' | 'testing' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState('');

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

        socket.on('setup_status', handleSetupStatus);
        socket.on('api_key_result', handleApiKeyResult);

        return () => {
            socket.off('setup_status', handleSetupStatus);
            socket.off('api_key_result', handleApiKeyResult);
        };
    }, [socket, connected]);

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
