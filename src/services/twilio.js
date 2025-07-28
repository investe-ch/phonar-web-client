import { Device } from '@twilio/voice-sdk';
import { getTwilioToken } from './api';

let device = null;
let currentCall = null;

export const initializeTwilio = async () => {
  try {
    // Get access token from backend
    const { token, identity } = await getTwilioToken();

    // Initialize Twilio Device with token and audio settings
    device = new Device(token, {
      codecPreferences: ['opus', 'pcmu'],
      fakeLocalDTMF: false, // Use real DTMF
      enableRingingState: true,
      logLevel: 1, // Enable debugging
      allowIncomingWhileBusy: false,
      closeProtection: true
    });

    // Set up event listeners
    device.on('ready', () => {
      console.log('Twilio Device ready for calls');
    });

    device.on("connect", (call) => {
      console.log('Call connected');
    });

    device.on('error', (error) => {
      console.error('Twilio Device error:', error);
    });

    device.on('incoming', (call) => {
      console.log('Incoming call from:', call.parameters.From);
      // Handle incoming calls if needed
    });

    device.on('tokenWillExpire', async () => {
      console.log('Token will expire, refreshing...');
      try {
        const { token: newToken } = await getTwilioToken();
        device.updateToken(newToken);
      } catch (error) {
        console.error('Failed to refresh token:', error);
      }
    });

    console.log('Twilio Device initialized with identity:', identity);
    return device;

  } catch (error) {
    console.error('Failed to initialize Twilio:', error);
    throw new Error(`Twilio initialization failed: ${error.message}`);
  }
};

const setupAudioHandling = () => {
  if (!device) return;

  // Get available audio devices
  device.audio.on('deviceChange', (lostActiveDevices) => {
    console.log('Audio devices changed:', lostActiveDevices);
  });

  // Set up speaker test (optional)
  device.audio.on('deviceChange', () => {
    // You can add UI for device selection here
    const speakerDevices = device.audio.speakerDevices.get();
    const ringtoneDevices = device.audio.ringtoneDevices.get();
    console.log('Available speaker devices:', speakerDevices);
    console.log('Available ringtone devices:', ringtoneDevices);
  });
};

export const initiateCall = async ({ phoneNumber, dtmfSequence, description }) => {
  try {
    if (!device) {
      throw new Error('Twilio device not initialized. Call initializeTwilio() first.');
    }

    console.log('Initiating call to:', phoneNumber);
    console.log('DTMF sequence:', dtmfSequence);
    console.log('Target:', description);

    // Make the call through Twilio
    const call = await device.connect({
      params: {
        To: phoneNumber
      }
    });

    currentCall = call;

    // Set up call event listeners
    call.on('accept', () => {
      console.log('Call accepted, connection established');

      // Send DTMF tones after a brief delay to ensure connection is stable
      setTimeout(() => {
        console.log('Sending DTMF sequence:', dtmfSequence);

        // Handle comma-separated DTMF sequences (e.g., "1,2")
        const dtmfTones = dtmfSequence.split(',');

        dtmfTones.forEach((tone, index) => {
          setTimeout(() => {
            call.sendDigits(tone.trim());
            console.log(`Sent DTMF: ${tone.trim()}`);
          }, index * 3500); // 3.5 second delay between each tone
        });

      }, 3000); // Wait 3 seconds after call is accepted
    });

    call.on('disconnect', () => {
      console.log('Call disconnected');
      currentCall = null;
    });

    call.on('error', (error) => {
      console.error('Call error:', error);
      currentCall = null;
      throw error;
    });

    call.on('ringing', () => {
      console.log('Call is ringing...');
    });

    call.on('cancel', () => {
      console.log('Call was cancelled');
      currentCall = null;
    });

    // Set up audio for this specific call
    call.on('accept', () => {
      // Ensure audio is properly routed
      console.log('Call accepted - audio should be active');
    });

    return {
      callSid: call.parameters.CallSid,
      phoneNumber,
      dtmfSequence,
      description,
      status: 'connecting'
    };

  } catch (error) {
    console.error('Call initiation failed:', error);
    throw new Error(`Call failed: ${error.message}`);
  }
};

export const endCall = () => {
  if (currentCall) {
    console.log('Ending current call');
    currentCall.disconnect();
    currentCall = null;
    return true;
  }
  console.log('No active call to end');
  return false;
};

export const getDeviceStatus = () => {
  if (!device) {
    return 'not_initialized';
  }

  if (!device.isRegistered) {
    return 'not_registered';
  }

  return 'ready';
};

export const getCurrentCall = () => {
  return currentCall;
};

export const isCallActive = () => {
  return currentCall !== null;
};

// Utility function to check if device is ready for calls
export const isReadyToCall = () => {
  return device && device.isRegistered && !currentCall;
};

// Audio testing functions
export const testSpeaker = async () => {
  if (device && device.audio) {
    try {
      const testSound = device.audio.speakerDevices.test();
      console.log(device, device.audio);
      return testSound;
    } catch (error) {
      console.error('Speaker test failed:', error);
      throw error;
    }
  }
  console.log(device, device.audio);
  throw new Error('Device not ready for audio test');
};

export const getAudioDevices = () => {
  if (device && device.audio) {
    return {
      speaker: device.audio.speakerDevices.get(),
      microphone: device.audio.availableInputDevices,
      ringtone: device.audio.ringtoneDevices.get()
    };
  }
  return null;
};

// Set audio output device
export const setAudioOutputDevice = (deviceId) => {
  if (device && device.audio) {
    device.audio.speakerDevices.set(deviceId);
  }
}; 