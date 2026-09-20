import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getApiBaseUrl } from '../config/api';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const auth = useAuth() || {};
  const { token, activePersona, logout } = auth;
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlinePersonaIds, setOnlinePersonaIds] = useState([]);
  const [personaStatuses, setPersonaStatuses] = useState({});
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
        setOnlinePersonaIds([]);
        setPersonaStatuses({});
      }
      return;
    }

    const apiBaseUrl = getApiBaseUrl();
    const serverUrl = apiBaseUrl.replace(/\/api\/?$/, ''); // Strip /api suffix for Socket.IO host

    const newSocket = io(serverUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 15000
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    const announcePresence = () => {
      if (newSocket && newSocket.connected) {
        setIsConnected(true);
        if (activePersona?._id) {
          newSocket.emit('presence:announce', { personaId: activePersona._id });
        }
        newSocket.emit('presence:get');
      }
    };

    newSocket.on('connect', announcePresence);
    newSocket.on('reconnect', announcePresence);

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('presence:update', (data) => {
      const ids = data?.onlinePersonaIds || data?.onlineUserIds || [];
      if (Array.isArray(ids)) {
        setOnlinePersonaIds(ids.map(String));
      }
      if (data?.personaStatuses && typeof data.personaStatuses === 'object') {
        setPersonaStatuses(data.personaStatuses);
      }
    });

    const onAccountTerminated = (data) => {
      Alert.alert(
        'Account Removed',
        data?.message || 'Your account was deleted by an administrator.',
        [{ text: 'OK', onPress: () => logout && logout() }]
      );
      if (logout) logout();
    };

    const onPersonaUpdated = (updatedPersona) => {
      if (updatedPersona && activePersona?._id && String(updatedPersona._id) === String(activePersona._id)) {
        if (typeof auth.setActivePersona === 'function') {
          auth.setActivePersona(updatedPersona);
        }
      }
    };

    newSocket.on('account:terminated', onAccountTerminated);
    newSocket.on('persona:updated', onPersonaUpdated);

    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active' && newSocket) {
        if (!newSocket.connected) {
          newSocket.connect();
        } else {
          announcePresence();
        }
      }
    };

    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      appStateSub?.remove();
      newSocket.off('connect', announcePresence);
      newSocket.off('reconnect', announcePresence);
      newSocket.off('account:terminated', onAccountTerminated);
      newSocket.off('persona:updated', onPersonaUpdated);
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [token, activePersona?._id, logout]);

  const joinRoom = (roomId) => {
    if (socketRef.current && roomId) {
      socketRef.current.emit('join:room', { roomId });
    }
  };

  const leaveRoom = (roomId) => {
    if (socketRef.current && roomId) {
      socketRef.current.emit('leave:room', { roomId });
    }
  };

  const sendMessage = (data) => {
    if (socketRef.current) {
      socketRef.current.emit('message:send', data);
    }
  };

  const sendTyping = (roomId, personaName, isTyping) => {
    if (socketRef.current && roomId) {
      const event = isTyping ? 'typing:start' : 'typing:stop';
      socketRef.current.emit(event, { roomId, personaName });
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlinePersonaIds,
        personaStatuses,
        joinRoom,
        leaveRoom,
        sendMessage,
        sendTyping,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
