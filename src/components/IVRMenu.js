import React, { useState, useEffect } from 'react';
import { initiateCall, initializeTwilio, isReadyToCall, endCall, getCurrentCall } from '../services/twilio';
import AudioTest from './AudioTest';

const IVRMenu = ({ phoneNumber, ivrData, onBack }) => {
    const [callingItem, setCallingItem] = useState(null);
    const [callStatus, setCallStatus] = useState('');
    const [deviceStatus, setDeviceStatus] = useState('not_initialized');
    const [isInitializing, setIsInitializing] = useState(true);
    const [audioPermission, setAudioPermission] = useState('unknown');
    const [showAudioTest, setShowAudioTest] = useState(false);

    // Call state tracking
    const [isCallConnected, setIsCallConnected] = useState(false);
    const [currentCallDescription, setCurrentCallDescription] = useState('');

    // Navigation state for hierarchical menus
    const [currentMenu, setCurrentMenu] = useState(ivrData);
    const [menuHistory, setMenuHistory] = useState([]);
    const [dtmfSequence, setDtmfSequence] = useState([]);

    useEffect(() => {
        const setupTwilio = async () => {
            try {
                setCallStatus('Requesting microphone access...');

                // Request microphone permission first
                try {
                    await navigator.mediaDevices.getUserMedia({ audio: true });
                    setAudioPermission('granted');
                    console.log('Microphone access granted');
                } catch (error) {
                    console.error('Microphone access denied:', error);
                    setAudioPermission('denied');
                    setCallStatus('Microphone access required for calls');
                    setDeviceStatus('error');
                    setIsInitializing(false);
                    return;
                }

                setCallStatus('Initializing Twilio...');
                await initializeTwilio();
                setDeviceStatus('ready');
                setCallStatus('');
            } catch (error) {
                console.error('Failed to initialize Twilio:', error);
                setCallStatus(`Twilio setup failed: ${error.message}`);
                setDeviceStatus('error');
            } finally {
                setIsInitializing(false);
            }
        };

        setupTwilio();
    }, []);

    const handleMenuItemClick = async (menuItem) => {
        if (audioPermission !== 'granted') {
            setCallStatus('Microphone access required. Please refresh and allow access.');
            return;
        }

        const newDtmfSequence = [...dtmfSequence, menuItem.dtmf];

        if (menuItem.action === 'submenu') {
            // Navigate to submenu
            setMenuHistory([...menuHistory, currentMenu]);
            setCurrentMenu(menuItem.sub_menu);
            setDtmfSequence(newDtmfSequence);
        } else if (menuItem.action === 'connect') {
            // Initiate call with full DTMF sequence
            setCallingItem(menuItem.text);
            setCurrentCallDescription(menuItem.text);
            setCallStatus('Initiating call...');

            try {
                const callResult = await initiateCall({
                    phoneNumber: phoneNumber,
                    dtmfSequence: newDtmfSequence.join(''),
                    description: menuItem.text
                });

                // Set up call state listeners
                const call = getCurrentCall();
                if (call) {
                    call.on('accept', () => {
                        setIsCallConnected(true);
                        setCallStatus(`Connected to: ${menuItem.text}`);
                    });

                    call.on('disconnect', () => {
                        setIsCallConnected(false);
                        setCallingItem(null);
                        setCurrentCallDescription('');
                        setCallStatus('Call ended');

                        setTimeout(() => {
                            setCallStatus('');
                        }, 3000);
                    });

                    call.on('cancel', () => {
                        setIsCallConnected(false);
                        setCallingItem(null);
                        setCurrentCallDescription('');
                        setCallStatus('Call cancelled');

                        setTimeout(() => {
                            setCallStatus('');
                        }, 3000);
                    });
                }

                setCallStatus(`Call connecting to: ${menuItem.text}`);
                console.log('Call initiated:', callResult);

            } catch (error) {
                console.error('Call failed:', error);
                setCallStatus(`Call failed: ${error.message}`);
                setCallingItem(null);
                setCurrentCallDescription('');

                setTimeout(() => {
                    setCallStatus('');
                }, 5000);
            }
        }
    };

    const handleHangUp = () => {
        endCall();
        setIsCallConnected(false);
        setCallingItem(null);
        setCurrentCallDescription('');
        setCallStatus('Call ended');

        setTimeout(() => {
            setCallStatus('');
        }, 3000);
    };

    const handleBackToParentMenu = () => {
        if (menuHistory.length > 0) {
            const parentMenu = menuHistory[menuHistory.length - 1];
            const newHistory = menuHistory.slice(0, -1);
            const newDtmfSequence = dtmfSequence.slice(0, -1);

            setCurrentMenu(parentMenu);
            setMenuHistory(newHistory);
            setDtmfSequence(newDtmfSequence);
        }
    };

    const handleBackToDialler = () => {
        // End any active call before going back
        if (isCallConnected) {
            endCall();
        }

        // Reset all menu navigation state
        setCurrentMenu(ivrData);
        setMenuHistory([]);
        setDtmfSequence([]);
        setIsCallConnected(false);
        setCallingItem(null);
        setCurrentCallDescription('');
        onBack();
    };

    const getStatusClass = () => {
        if (callStatus.includes('failed') || callStatus.includes('error')) {
            return 'error';
        }
        if (callStatus.includes('Connected') || callStatus.includes('ended')) {
            return 'success';
        }
        return 'success';
    };

    const getBreadcrumb = () => {
        if (menuHistory.length === 0) return null;

        return (
            <div style={{
                fontSize: '0.8rem',
                color: '#666',
                marginTop: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
            }}>
                <span>{ivrData.name}</span>
                {menuHistory.slice(1).map((menu, index) => (
                    <React.Fragment key={index}>
                        <span>→</span>
                        <span>{menu.name}</span>
                    </React.Fragment>
                ))}
                <span>→</span>
                <span style={{ fontWeight: '600' }}>{currentMenu.name}</span>
            </div>
        );
    };

    if (isInitializing) {
        return (
            <div className="ivr-menu">
                <div className="loading">
                    <div className="loading-spinner"></div>
                    <p>Setting up voice calling...</p>
                    {audioPermission === 'unknown' && (
                        <p style={{ fontSize: '0.9rem', marginTop: '1rem', color: '#666' }}>
                            Please allow microphone access when prompted
                        </p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="ivr-menu">
            <div className="menu-header">
                <h3>{currentMenu.name || 'IVR Menu'}</h3>
                <div className="phone-number">{phoneNumber}</div>
                {getBreadcrumb()}

                {/* DTMF Sequence Display */}
                {dtmfSequence.length > 0 && (
                    <div style={{
                        fontSize: '0.8rem',
                        color: '#667eea',
                        marginTop: '0.5rem',
                        background: '#f8f9ff',
                        padding: '0.3rem 0.6rem',
                        borderRadius: '4px',
                        fontFamily: 'monospace'
                    }}>
                        DTMF Path: {dtmfSequence.join(' → ')}
                    </div>
                )}

                {/* Audio Permission Status */}
                {audioPermission === 'denied' && (
                    <div style={{
                        fontSize: '0.8rem',
                        color: '#dc2626',
                        marginTop: '0.5rem',
                        background: '#fef2f2',
                        padding: '0.5rem',
                        borderRadius: '4px'
                    }}>
                        🎤 Microphone access denied. Refresh page and allow access for calls.
                    </div>
                )}

                {audioPermission === 'granted' && deviceStatus === 'ready' && !isCallConnected && (
                    <div style={{
                        fontSize: '0.8rem',
                        color: '#22c55e',
                        marginTop: '0.5rem',
                        background: '#f0fdf4',
                        padding: '0.5rem',
                        borderRadius: '4px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span>🎤 Audio ready - Calls will work with sound</span>
                        <button
                            onClick={() => setShowAudioTest(true)}
                            style={{
                                background: 'transparent',
                                border: '1px solid #22c55e',
                                color: '#22c55e',
                                padding: '0.3rem 0.6rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                cursor: 'pointer'
                            }}
                        >
                            Test Audio
                        </button>
                    </div>
                )}

                {deviceStatus !== 'ready' && audioPermission === 'granted' && (
                    <div style={{
                        fontSize: '0.8rem',
                        color: '#dc2626',
                        marginTop: '0.5rem',
                        background: '#fef2f2',
                        padding: '0.5rem',
                        borderRadius: '4px'
                    }}>
                        Device Status: {deviceStatus}
                    </div>
                )}
            </div>

            {/* Active Call Status & Hang Up Button */}
            {isCallConnected && (
                <div style={{
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    color: 'white',
                    padding: '1rem',
                    borderRadius: '12px',
                    marginBottom: '1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
                }}>
                    <div>
                        <div style={{ fontWeight: '600', fontSize: '1rem' }}>
                            📞 Call Active
                        </div>
                        <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                            Connected to: {currentCallDescription}
                        </div>
                    </div>
                    <button
                        onClick={handleHangUp}
                        style={{
                            background: '#dc2626',
                            color: 'white',
                            border: 'none',
                            padding: '0.8rem 1.2rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                            e.target.style.background = '#b91c1c';
                            e.target.style.transform = 'scale(1.05)';
                        }}
                        onMouseOut={(e) => {
                            e.target.style.background = '#dc2626';
                            e.target.style.transform = 'scale(1)';
                        }}
                    >
                        📞 Hang Up
                    </button>
                </div>
            )}

            <div className="menu-items">
                {currentMenu.options.map((item) => (
                    <div
                        key={item.text}
                        className={`menu-item ${callingItem === item.text ? 'calling' : ''}`}
                        onClick={() => handleMenuItemClick(item)}
                        style={{
                            pointerEvents: (callingItem || deviceStatus !== 'ready' || audioPermission !== 'granted' || isCallConnected) ? 'none' : 'auto',
                            opacity: callingItem && callingItem !== item.text ? 0.5 :
                                (deviceStatus !== 'ready' || audioPermission !== 'granted' || isCallConnected) ? 0.6 : 1
                        }}
                    >
                        <div className="menu-key">{item.dtmf}</div>
                        <div className="menu-text">
                            {item.text}
                            <div style={{
                                fontSize: '0.8rem',
                                color: '#888',
                                marginTop: '0.2rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <span>Press {item.dtmf}</span>
                                {item.action === 'submenu' && (
                                    <span style={{ color: '#667eea', fontSize: '0.7rem' }}>
                                        → More options
                                    </span>
                                )}
                                {item.action === 'connect' && (
                                    <span style={{ color: '#22c55e', fontSize: '0.7rem' }}>
                                        📞 Connect
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {callStatus && (
                <div className={`status ${getStatusClass()}`}>
                    {callStatus}
                </div>
            )}

            {/* Navigation Buttons */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                {menuHistory.length > 0 && !isCallConnected && (
                    <button
                        className="back-button"
                        onClick={handleBackToParentMenu}
                        disabled={!!callingItem}
                        style={{ flex: 1 }}
                    >
                        ← Back to {menuHistory[menuHistory.length - 1].name}
                    </button>
                )}

                <button
                    className="back-button"
                    onClick={handleBackToDialler}
                    disabled={!!callingItem && !isCallConnected}
                    style={{ flex: 1 }}
                >
                    ← Back to Dialler
                </button>
            </div>

            <div style={{
                marginTop: '1.5rem',
                fontSize: '0.85rem',
                color: '#666',
                textAlign: 'center',
                padding: '1rem',
                background: '#f8f9fa',
                borderRadius: '8px'
            }}>
                <p><strong>Smart IVR Navigation:</strong></p>
                <p>Navigate through menus or click "Connect" options to make calls with automatic DTMF navigation to {phoneNumber}.</p>
                {deviceStatus === 'ready' && audioPermission === 'granted' && !isCallConnected && (
                    <p style={{ color: '#22c55e', marginTop: '0.5rem', fontWeight: '600' }}>
                        ✓ Voice calling ready with audio
                    </p>
                )}
                {isCallConnected && (
                    <p style={{ color: '#22c55e', marginTop: '0.5rem', fontWeight: '600' }}>
                        📞 Call in progress - Use hang up button to end call
                    </p>
                )}
            </div>

            {/* Audio Test Modal */}
            {showAudioTest && (
                <AudioTest onClose={() => setShowAudioTest(false)} />
            )}
        </div>
    );
};

export default IVRMenu; 