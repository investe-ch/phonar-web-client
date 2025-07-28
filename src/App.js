import React, { useState } from 'react';
import Dialler from './components/Dialler';
import IVRMenu from './components/IVRMenu';

function App() {
    const [currentView, setCurrentView] = useState('dialler'); // 'dialler' | 'menu' | 'loading'
    const [phoneNumber, setPhoneNumber] = useState('');
    const [ivrData, setIvrData] = useState(null);

    const handlePhoneNumberSubmit = (number) => {
        setPhoneNumber(number);
        setCurrentView('loading');
        // This will be handled by the Dialler component
    };

    const handleIVRDataReceived = (data) => {
        setIvrData(data);
        setCurrentView('menu');
    };

    const handleBackToDialler = () => {
        setCurrentView('dialler');
        setPhoneNumber('');
        setIvrData(null);
    };

    return (
        <div className="app">
            <div className="header">
                <h1>Phonar: Smart Caller</h1>
                <p>Skip the IVR maze, connect directly</p>
            </div>

            <div className="container">
                {currentView === 'dialler' && (
                    <Dialler
                        onPhoneSubmit={handlePhoneNumberSubmit}
                        onIVRDataReceived={handleIVRDataReceived}
                        currentView={currentView}
                        setCurrentView={setCurrentView}
                    />
                )}

                {currentView === 'loading' && (
                    <div className="loading">
                        <div className="loading-spinner"></div>
                        <p>Finding IVR menu for {phoneNumber}...</p>
                    </div>
                )}

                {currentView === 'menu' && ivrData && (
                    <IVRMenu
                        phoneNumber={phoneNumber}
                        ivrData={ivrData}
                        onBack={handleBackToDialler}
                    />
                )}
            </div>
        </div>
    );
}

export default App; 