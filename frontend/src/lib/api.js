import axios from 'axios';

const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
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

export const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'%3E%3Cdefs%3E%3ClinearGradient id='g_def' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%236366f1'/%3E%3Cstop offset='100%25' stop-color='%23a855f7'/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle cx='64' cy='64' r='64' fill='url(%23g_def)'/%3E%3Ctext x='50%25' y='54%25' dominant-baseline='middle' text-anchor='middle' fill='%23ffffff' font-family='sans-serif' font-size='46' font-weight='800'%3EGA%3C/text%3E%3C/svg%3E";

export const createInitialsAvatar = (name = 'User') => {
  const cleanName = (typeof name === 'string' && name.trim()) ? name.trim().replace(/^@/, '') : 'User';
  const parts = cleanName.split(/\s+/).filter(Boolean);
  let initials = 'US';
  if (parts.length >= 2) {
    initials = (parts[0][0] + parts[1][0]).toUpperCase();
  } else if (parts.length === 1) {
    initials = parts[0].substring(0, 2).toUpperCase();
  }

  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const gradients = [
    { start: '#6366f1', end: '#a855f7' }, // Indigo -> Purple
    { start: '#3b82f6', end: '#06b6d4' }, // Blue -> Cyan
    { start: '#10b981', end: '#14b8a6' }, // Emerald -> Teal
    { start: '#f43f5e', end: '#fb7185' }, // Rose -> Pink
    { start: '#8b5cf6', end: '#ec4899' }, // Violet -> Pink
    { start: '#f59e0b', end: '#ef4444' }, // Amber -> Red
    { start: '#0ea5e9', end: '#6366f1' }, // Sky -> Indigo
    { start: '#14b8a6', end: '#3b82f6' }  // Teal -> Blue
  ];

  const pair = gradients[Math.abs(hash) % gradients.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <defs>
      <linearGradient id="g_${Math.abs(hash)}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${pair.start}" />
        <stop offset="100%" stop-color="${pair.end}" />
      </linearGradient>
    </defs>
    <circle cx="64" cy="64" r="64" fill="url(#g_${Math.abs(hash)})" />
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="46" font-weight="800" letter-spacing="1">${initials}</text>
  </svg>`;

  try {
    if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
      const base64 = window.btoa(encodeURIComponent(svg).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode('0x' + p1)));
      return `data:image/svg+xml;base64,${base64}`;
    }
    if (typeof Buffer !== 'undefined') {
      return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    }
  } catch {
    return DEFAULT_AVATAR;
  }
  return DEFAULT_AVATAR;
};

export const getMediaUrl = (url, name = 'User') => {
  const fallbackName = (typeof name === 'string' && name.trim()) ? name.trim() : 'User';

  if (!url || typeof url !== 'string') {
    return createInitialsAvatar(fallbackName);
  }
  const clean = url.trim().replace(/\\/g, '/');
  if (!clean || clean === 'undefined' || clean === 'null' || clean === '[object Object]' || clean === '{}') {
    return createInitialsAvatar(fallbackName);
  }

  if (clean.startsWith('data:')) return clean;

  const apiBase = getApiBaseUrl();
  const serverBase = apiBase.replace(/\/api\/?$/, '');

  // 1. Dynamically rewrite uploads URLs to active server base URL
  if (clean.includes('uploads/')) {
    const relativePath = clean.substring(clean.indexOf('uploads/'));
    return `${serverBase}/${relativePath}`;
  }

  // 2. Rewrite hardcoded local IP/localhost URLs to active server base
  if (/^(http:\/\/|https:\/\/)?(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?/i.test(clean)) {
    try {
      const match = clean.match(/(?:http:\/\/|https:\/\/)?[^\/]+(\/.*)?$/);
      const pathAndQuery = match && match[1] ? match[1] : '';
      return `${serverBase}${pathAndQuery.startsWith('/') ? '' : '/'}${pathAndQuery}`;
    } catch {
      return createInitialsAvatar(fallbackName);
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

