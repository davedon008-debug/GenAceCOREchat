'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { getSocket } from '../lib/socket';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { token, activePersona, logout } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [personaStatuses, setPersonaStatuses] = useState({});

  useEffect(() => {
    if (!token || !activePersona) {
      setConnected(false);
      setOnlineUserIds([]);
      setPersonaStatuses({});
      return;
    }

    const s = getSocket();
    if (s) {
      setSocket(s);

      const onConnect = () => {
        setConnected(true);
        if (activePersona?._id) {
          s.emit('presence:announce', { personaId: activePersona._id });
        }
        s.emit('presence:get');
      };

      const onDisconnect = () => setConnected(false);
      const onPresenceUpdate = ({ onlinePersonaIds, personaStatuses: statuses }) => {
        if (Array.isArray(onlinePersonaIds)) {
          setOnlineUserIds(onlinePersonaIds);
        }
        if (statuses && typeof statuses === 'object') {
          setPersonaStatuses(statuses);
        }
      };

      const onAccountTerminated = (data) => {
        alert(data?.message || 'Your account was deleted by an administrator.');
        if (typeof logout === 'function') {
          logout();
        }
      };

      const onPersonaUpdated = (updatedPersona) => {
        if (updatedPersona && activePersona?._id && String(updatedPersona._id) === String(activePersona._id)) {
          if (typeof setActivePersona === 'function') {
            setActivePersona(updatedPersona);
          }
          if (typeof window !== 'undefined') {
            localStorage.setItem('donchat_persona', JSON.stringify(updatedPersona));
          }
        }
      };

      s.on('connect', onConnect);
      s.on('reconnect', onConnect);
      s.on('disconnect', onDisconnect);
      s.on('presence:update', onPresenceUpdate);
      s.on('account:terminated', onAccountTerminated);
      s.on('persona:updated', onPersonaUpdated);

      const handleVisibilityOrFocus = () => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          if (!s.connected) {
            s.connect();
          } else {
            onConnect();
          }
        }
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('focus', handleVisibilityOrFocus);
        document.addEventListener('visibilitychange', handleVisibilityOrFocus);
      }

      if (s.connected) {
        setConnected(true);
        if (activePersona?._id) {
          s.emit('presence:announce', { personaId: activePersona._id });
        }
        s.emit('presence:get');
      }

      return () => {
        s.off('connect', onConnect);
        s.off('reconnect', onConnect);
        s.off('disconnect', onDisconnect);
        s.off('presence:update', onPresenceUpdate);
        s.off('account:terminated', onAccountTerminated);
        s.off('persona:updated', onPersonaUpdated);
        if (typeof window !== 'undefined') {
          window.removeEventListener('focus', handleVisibilityOrFocus);
          document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
        }
      };
    }
  }, [token, activePersona, logout]);

  const joinRoom = (roomId) => {
    if (socket && roomId) {
      socket.emit('join:room', { roomId });
    }
  };

  const leaveRoom = (roomId) => {
    if (socket && roomId) {
      socket.emit('leave:room', { roomId });
    }
  };

  const emitTyping = (roomId, isTyping) => {
    if (socket && roomId && activePersona) {
      const event = isTyping ? 'typing:start' : 'typing:stop';
      socket.emit(event, { roomId, personaName: activePersona.displayName });
    }
  };

  return (
    <SocketContext.Provider value={{
      socket,
      connected,
      onlineUserIds,
      personaStatuses,
      joinRoom,
      leaveRoom,
      emitTyping
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
