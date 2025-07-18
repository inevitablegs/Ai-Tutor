import axios from 'axios';
import { getFirebaseIdToken } from './firebase';
const API_BASE = import.meta.env.VITE_API_BASE;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// Function to get CSRF token
export const getCsrfToken = async () => {
  try {
    const response = await api.get('/csrf/');
    return response.data.csrfToken;
  } catch (error) {
    console.error('Error getting CSRF token:', error);
    throw error;
  }
};

// Utility for making authenticated requests
export const apiRequest = async (method, url, data = null) => {
  try {
    // Get CSRF token first
    const csrfToken = await getCsrfToken();
    const idToken = await getFirebaseIdToken();
    
    const config = {
      method,
      url,
      withCredentials: true,
      headers: {
        'X-CSRFToken': csrfToken,
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      config.data = data;
    }

    const response = await api(config);
    return response.data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};