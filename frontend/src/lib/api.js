import axios from 'axios';

const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    return `http://${hostname}:5005/api`;
  }
  return 'http://localhost:5005/api';
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

export const getMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('data:')) return url;

  // Dynamically rewrite /uploads/ URLs to active server base URL regardless of hardcoded host/IP
  if (url.includes('/uploads/')) {
    const relativePath = url.substring(url.indexOf('/uploads/'));
    const apiBase = getApiBaseUrl();
    const serverBase = apiBase.replace(/\/api\/?$/, '');
    return `${serverBase}${relativePath}`;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const apiBase = getApiBaseUrl();
  const serverBase = apiBase.replace(/\/api\/?$/, '');
  return `${serverBase}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default api;

