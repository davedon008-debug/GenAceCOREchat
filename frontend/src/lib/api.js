import axios from 'axios';

const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `http://${hostname}:5005/api`;
    }
    return 'https://genacecorechat.onrender.com/api';
  }
  return 'https://genacecorechat.onrender.com/api';
};

const api = axios.create();

api.interceptors.request.use((config) => {
  if (!config.baseURL) {
    config.baseURL = getApiBaseUrl();
  }
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('donchat_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const msg = error.response.data?.message || '';
      if (msg.includes('Account no longer exists') || msg.includes('terminated')) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('donchat_token');
          localStorage.removeItem('donchat_user');
          localStorage.removeItem('donchat_persona');
          localStorage.removeItem('donchat_active_id');
          localStorage.removeItem('donchat_active_type');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const DEFAULT_AVATAR = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzk0YTNiOCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiMxZTI5M2IiLz48cGF0aCBkPSJNMTggMjBhNiA2IDAgMCAwLTEyIDAiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEwIiByPSI0Ii8+PC9zdmc+";

export const getMediaUrl = (url) => {
  if (!url || typeof url !== 'string') return DEFAULT_AVATAR;
  const clean = url.trim();
  if (!clean || clean === 'undefined' || clean === 'null' || clean === '[object Object]' || clean === '{}') {
    return DEFAULT_AVATAR;
  }
  if (clean.startsWith('data:')) return clean;

  const apiBase = getApiBaseUrl();
  const serverBase = apiBase.replace(/\/api\/?$/, '');

  // Dynamically rewrite /uploads/ URLs to active server base URL regardless of hardcoded host/IP
  if (clean.includes('/uploads/')) {
    const relativePath = clean.substring(clean.indexOf('/uploads/'));
    return `${serverBase}${relativePath}`;
  }

  // Rewrite hardcoded local IP/localhost URLs on remote deployments to active serverBase
  if (clean.includes('localhost:') || clean.includes('127.0.0.1:') || clean.includes('192.168.') || clean.includes('10.0.') || clean.includes('172.16.')) {
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      try {
        const urlObj = new URL(clean);
        return `${serverBase}${urlObj.pathname}${urlObj.search}`;
      } catch {
        return DEFAULT_AVATAR;
      }
    }
  }

  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && clean.startsWith('http://')) {
      return clean.replace(/^http:\/\//i, 'https://');
    }
    return clean;
  }

  return `${serverBase}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

export default api;

