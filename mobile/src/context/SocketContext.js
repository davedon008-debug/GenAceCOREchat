import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Alert } from 'react-native';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getApiBaseUrl } from '../config/api';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { token, activePersona, logout } = useAuth();
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
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      if (activePersona?._id) {
        newSocket.emit('presence:announce', { personaId: activePersona._id });
      }
      newSocket.emit('presence:get');
    });

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

    newSocket.on('account:terminated', onAccountTerminated);

    return () => {
      newSocket.off('account:terminated', onAccountTerminated);
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
