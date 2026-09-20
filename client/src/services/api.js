import axios from 'axios';

const API = axios.create({
    baseURL: 'https://ncdcenrollment.bscs4a.com/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add token to requests if available
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default API;