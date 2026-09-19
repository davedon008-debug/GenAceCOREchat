import { io } from 'socket.io-client';

let socket = null;

const getSocketUrl = () => {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, '');
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isRemoteProd = host.includes('onrender.com') || host.includes('vercel.app') || host.includes('genace.app');
    if (!isRemoteProd) {
      return `${window.location.protocol}//${host}:5005`;
    }
  }
  return 'https://genacecorechat.onrender.com';
};

export const getSocket = () => {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem('donchat_token');
  if (!token) return null;

  if (!socket) {
    socket = io(getSocketUrl(), {
      auth: { token },
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
