import React, { useState, useEffect } from 'react';
import { testSpeaker, getAudioDevices, setAudioOutputDevice } from '../services/twilio';

const AudioTest = ({ onClose }) => {
    const [audioDevices, setAudioDevices] = useState(null);
    const [isTestingMic, setIsTestingMic] = useState(false);
    const [isTestingSpeaker, setIsTestingSpeaker] = useState(false);
    const [micLevel, setMicLevel] = useState(0);

    useEffect(() => {
        const devices = getAudioDevices();
        setAudioDevices(devices);
    }, []);

    const testMicrophone = async () => {
        setIsTestingMic(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = audioContext.createAnalyser();
            const microphone = audioContext.createMediaStreamSource(stream);
            microphone.connect(analyser);

            analyser.fftSize = 256;
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const checkLevel = () => {
                analyser.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b) / bufferLength;
                setMicLevel(Math.round(average));

                if (isTestingMic) {
                    requestAnimationFrame(checkLevel);
                }
            };

            checkLevel();

            // Stop test after 5 seconds
            setTimeout(() => {
                setIsTestingMic(false);
                stream.getTracks().forEach(track => track.stop());
                audioContext.close();
            }, 5000);

        } catch (error) {
            console.error('Microphone test failed:', error);
            setIsTestingMic(false);
        }
    };

    const testSpeakerAudio = async () => {
        setIsTestingSpeaker(true);
        try {
            await testSpeaker();
            setTimeout(() => {
                setIsTestingSpeaker(false);
            }, 3000);
        } catch (error) {
            console.error('Speaker test failed:', error);
            setIsTestingSpeaker(false);
        }
    };

    const handleDeviceChange = (deviceId) => {
        setAudioOutputDevice(deviceId);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '2rem',
                maxWidth: '500px',
                width: '90%',
                maxHeight: '80vh',
                overflow: 'auto'
            }}>
                <h3 style={{ marginBottom: '1.5rem', color: '#333' }}>Audio Test</h3>

                {/* Microphone Test */}
                <div style={{ marginBottom: '2rem' }}>
                    <h4 style={{ color: '#555', marginBottom: '1rem' }}>🎤 Microphone Test</h4>
                    <button
                        onClick={testMicrophone}
                        disabled={isTestingMic}
                        style={{
                            backgroundColor: isTestingMic ? '#22c55e' : '#667eea',
                            color: 'white',
                            border: 'none',
                            padding: '0.8rem 1.5rem',
                            borderRadius: '8px',
                            cursor: isTestingMic ? 'default' : 'pointer',
                            marginBottom: '1rem',
                            width: '100%'
                        }}
                    >
                        {isTestingMic ? 'Testing... Speak now!' : 'Test Microphone'}
                    </button>

                    {isTestingMic && (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                height: '20px',
                                backgroundColor: '#f3f4f6',
                                borderRadius: '10px',
                                overflow: 'hidden',
                                marginBottom: '0.5rem'
                            }}>
                                <div style={{
                                    height: '100%',
                                    backgroundColor: micLevel > 30 ? '#22c55e' : micLevel > 15 ? '#f59e0b' : '#ef4444',
                                    width: `${Math.min(micLevel * 2, 100)}%`,
                                    transition: 'width 0.1s ease'
                                }}></div>
                            </div>
                            <p style={{ fontSize: '0.9rem', color: '#666' }}>
                                Mic Level: {micLevel} {micLevel > 15 ? '✓' : '(speak louder)'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Speaker Test */}
                <div style={{ marginBottom: '2rem' }}>
                    <h4 style={{ color: '#555', marginBottom: '1rem' }}>🔊 Speaker Test</h4>
                    <button
                        onClick={testSpeakerAudio}
                        disabled={isTestingSpeaker}
                        style={{
                            backgroundColor: isTestingSpeaker ? '#22c55e' : '#667eea',
                            color: 'white',
                            border: 'none',
                            padding: '0.8rem 1.5rem',
                            borderRadius: '8px',
                            cursor: isTestingSpeaker ? 'default' : 'pointer',
                            width: '100%'
                        }}
                    >
                        {isTestingSpeaker ? 'Playing test sound...' : 'Test Speaker'}
                    </button>
                    {isTestingSpeaker && (
                        <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem', textAlign: 'center' }}>
                            You should hear a test sound
                        </p>
                    )}
                </div>

                {/* Audio Device Selection */}
                {audioDevices && audioDevices.speaker && audioDevices.speaker.length > 1 && (
                    <div style={{ marginBottom: '2rem' }}>
                        <h4 style={{ color: '#555', marginBottom: '1rem' }}>🎧 Audio Output</h4>
                        <select
                            onChange={(e) => handleDeviceChange(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.8rem',
                                borderRadius: '8px',
                                border: '2px solid #e1e5e9',
                                fontSize: '1rem'
                            }}
                        >
                            {audioDevices.speaker.map((device) => (
                                <option key={device.deviceId} value={device.deviceId}>
                                    {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Tips */}
                <div style={{
                    backgroundColor: '#f8f9fa',
                    padding: '1rem',
                    borderRadius: '8px',
                    marginBottom: '1.5rem'
                }}>
                    <h4 style={{ color: '#555', marginBottom: '0.5rem' }}>💡 Tips for best call quality:</h4>
                    <ul style={{ fontSize: '0.9rem', color: '#666', paddingLeft: '1.2rem' }}>
                        <li>Use headphones to prevent echo</li>
                        <li>Ensure microphone level shows green when speaking</li>
                        <li>Test in a quiet environment</li>
                        <li>Check browser permissions for microphone access</li>
                    </ul>
                </div>

                <div style={{ textAlign: 'center' }}>
                    <button
                        onClick={onClose}
                        style={{
                            backgroundColor: '#22c55e',
                            color: 'white',
                            border: 'none',
                            padding: '1rem 2rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: '600'
                        }}
                    >
                        Audio Ready - Start Calling!
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AudioTest; 