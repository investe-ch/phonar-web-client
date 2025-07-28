import axios from 'axios';

// Production API service for IVR menu data
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const fetchIVRMenu = async (phoneNumber) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/check-flowchart`, { phone_number: phoneNumber });
        return response.data;
    } catch (error) {
        if (error.response?.status === 404) {
            throw new Error(error.response.data.error || 'IVR menu not found for this number');
        }
        throw new Error(error.response?.data?.error || 'Failed to fetch IVR menu');
    }
};

export const makeCall = async ({ phoneNumber, dtmfSequence, description }) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/voice/dial`, {
            phoneNumber,
            dtmfSequence,
            description
        });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || 'Failed to initiate call');
    }
};

export const getTwilioToken = async () => {
    try {
        const response = await axios.post(`${API_BASE_URL}/voice/generate-token`);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || 'Failed to get Twilio token');
    }
}; 