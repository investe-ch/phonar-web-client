import React, { useState } from 'react';
import { fetchIVRMenu } from '../services/api';

const Dialler = ({ onPhoneSubmit, onIVRDataReceived, setCurrentView }) => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const formatPhoneNumber = (value) => {
        // Remove all non-digits
        const digits = value.replace(/\D/g, '');

        // Format as (XXX) XXX-XXXX for US numbers
        if (digits.length <= 3) {
            return digits;
        } else if (digits.length <= 6) {
            return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
        } else {
            return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
        }
    };

    const handleInputChange = (e) => {
        const formatted = formatPhoneNumber(e.target.value);
        setPhoneNumber(formatted);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const digits = phoneNumber.replace(/\D/g, '');
        if (digits.length !== 10) {
            setError('Please enter a valid 10-digit phone number');
            return;
        }

        setIsLoading(true);
        setError('');
        onPhoneSubmit('+1' + digits);

        try {
            setCurrentView('loading');
            const ivrData = await fetchIVRMenu('+1' + digits);
            onIVRDataReceived(ivrData.data.flowchart);
        } catch (err) {
            setError(err.message || 'Failed to fetch IVR menu');
            setCurrentView('dialler');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="dialler">
            <form onSubmit={handleSubmit}>
                <input
                    type="tel"
                    className="phone-input"
                    placeholder="(555) 123-4567"
                    value={phoneNumber}
                    onChange={handleInputChange}
                    maxLength={14}
                    autoFocus
                />

                {error && (
                    <div className="status error">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    className="dial-button"
                    disabled={isLoading || phoneNumber.replace(/\D/g, '').length !== 10}
                >
                    {isLoading ? 'Finding Menu...' : 'Find IVR Menu'}
                </button>
            </form>

            <div style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#666', textAlign: 'center' }}>
                <p>Enter a phone number to see its IVR menu structure</p>
                <p style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                    Try: (734) 849-2891 for demo
                </p>
            </div>
        </div>
    );
};

export default Dialler; 