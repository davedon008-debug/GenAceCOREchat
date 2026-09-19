import axios from 'axios';
import storage from './storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

let customServerIp = null;

// Initialize saved IP from storage
(async () => {
  try {
    const saved = await storage.getItem('donchat_server_ip');
    if (saved) {
      customServerIp = saved.trim();
    }
  } catch (e) {
    // Ignore error
  }
})();

export const setCustomServerIp = async (ip) => {
  customServerIp = ip ? ip.trim() : null;
  if (customServerIp) {
    await storage.setItem('donchat_server_ip', customServerIp);
  } else {
    await storage.removeItem('donchat_server_ip');
  }
};

export const getDetectedIps = () => {
  const ips = [];

  try {
    const manifest = Constants.expoConfig || Constants.manifest;
    const hostUri = manifest?.hostUri || Constants.manifest2?.extra?.expoGo?.developer?.tool;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        ips.push(ip);
      }
    }
  } catch (e) {
    // ignore
  }

  // Active detected PC IP adapters (Prioritize LAN / Hotspot IPs for mobile clients)
  if (!ips.includes('10.4.234.175')) ips.push('10.4.234.175');
  if (!ips.includes('192.168.137.1')) ips.push('192.168.137.1');
  if (!ips.includes('10.20.45.168')) ips.push('10.20.45.168');
  if (!ips.includes('10.21.184.124')) ips.push('10.21.184.124');
  if (Platform.OS === 'android' && !ips.includes('10.0.2.2')) ips.push('10.0.2.2');
  if (!ips.includes('localhost')) ips.push('localhost');

  return ips;
};

export const getApiBaseUrl = () => {
  if (customServerIp) {
    const clean = customServerIp.trim();
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      return clean.endsWith('/api') ? clean : `${clean.replace(/\/+$/, '')}/api`;
    }
    return `http://${clean}:5005/api`;
  }

  if (process.env.EXPO_PUBLIC_API_URL) {
    const envUrl = process.env.EXPO_PUBLIC_API_URL.trim();
    return envUrl.endsWith('/api') ? envUrl : `${envUrl.replace(/\/+$/, '')}/api`;
  }

  return 'https://genacecorechat.onrender.com/api';
};

export const createInitialsAvatar = (name = 'User') => {
  const cleanName = (typeof name === 'string' && name.trim()) ? name.trim().replace(/^@/, '') : 'User';
  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const bgColors = ['6366f1', '3b82f6', '10b981', 'f43f5e', '8b5cf6', 'f59e0b', '0ea5e9', '14b8a6'];
  const color = bgColors[Math.abs(hash) % bgColors.length];
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=${color}&color=fff&size=128&bold=true`;
};

export const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?name=User&background=6366f1&color=fff&size=128&bold=true';

export const getMediaUrl = (url, name = 'User') => {
  const fallbackName = (typeof name === 'string' && name.trim()) ? name.trim() : 'User';

  if (!url || typeof url !== 'string') {
    return createInitialsAvatar(fallbackName);
  }
  const clean = url.trim().replace(/\\/g, '/');
  if (!clean || clean === 'undefined' || clean === 'null' || clean === '[object Object]' || clean === '{}') {
    return createInitialsAvatar(fallbackName);
  }

  if (clean.startsWith('data:')) {
    return clean;
  }

  const apiBase = getApiBaseUrl();
  const serverBase = apiBase.replace(/\/api\/?$/, '');

  // 1. Dynamically rewrite uploads URLs to active server base URL regardless of hardcoded host/IP
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
    return clean;
  }
  return `${serverBase}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

export const testIpConnection = async (ip) => {
  const target = ip ? ip.trim() : '10.4.234.175';
  const url = `http://${target}:5005/api/health`;
  try {
    const res = await axios.get(url, { timeout: 1500 });
    return res.data?.status === 'healthy';
  } catch (err) {
    return false;
  }
};

let workingIpPromise = null;

export const findAndSetWorkingIp = async () => {
  if (workingIpPromise) {
    return workingIpPromise;
  }

  workingIpPromise = (async () => {
    try {
      const candidateIps = getDetectedIps();
      for (const candidateIp of candidateIps) {
        const isHealthy = await testIpConnection(candidateIp);
        if (isHealthy) {
          await setCustomServerIp(candidateIp);
          return candidateIp;
        }
      }
    } catch (err) {
      // Ignore error
    } finally {
      workingIpPromise = null;
    }
    return null;
  })();

  return workingIpPromise;
};

const api = axios.create({
  timeout: 15000,
});

api.interceptors.request.use(
  async (config) => {
    config.baseURL = getApiBaseUrl();
    try {
      const token = await storage.getItem('donchat_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error('[Mobile API] Error reading auth token:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response && error.response.status === 401) {
      const msg = error.response.data?.message || '';
      if (msg.includes('Account no longer exists') || msg.includes('terminated')) {
        try {
          await storage.removeItem('donchat_token');
          await storage.removeItem('donchat_user');
          await storage.removeItem('donchat_persona');
        } catch (e) {
          // ignore
        }
      }
    }

    if (
      (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      console.warn('[Mobile API] Network Error encountered. Searching for active backend IP...');
      const workingIp = await findAndSetWorkingIp();
      if (workingIp) {
        console.log(`[Mobile API] Auto-switched to active working server IP: ${workingIp}`);
        originalRequest.baseURL = getApiBaseUrl();
        return api(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
