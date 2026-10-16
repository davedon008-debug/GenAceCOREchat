'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { getSocket } from '../lib/socket';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { token, activePersona, logout, setActivePersona } = useAuth() || {};
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

      const handleOnline = () => {
        if (!s.connected) {
          s.connect();
        } else {
          onConnect();
        }
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('focus', handleVisibilityOrFocus);
        window.addEventListener('online', handleOnline);
        document.addEventListener('visibilitychange', handleVisibilityOrFocus);
      }

      // Background Keep-Alive Worker: prevents browser from throttling heartbeats in background tabs
      let keepAliveWorker = null;
      let fallbackInterval = null;

      try {
        if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
          const workerBlob = new Blob([
            `let timer = null;
             self.onmessage = function(e) {
               if (e.data === 'start') {
                 if (!timer) {
                   timer = setInterval(function() {
                     self.postMessage('heartbeat');
                   }, 15000);
                 }
               } else if (e.data === 'stop') {
                 if (timer) {
                   clearInterval(timer);
                   timer = null;
                 }
               }
             };`
          ], { type: 'application/javascript' });
          const workerUrl = URL.createObjectURL(workerBlob);
          keepAliveWorker = new Worker(workerUrl);

          keepAliveWorker.onmessage = (e) => {
            if (e.data === 'heartbeat') {
              if (!s.connected) {
                s.connect();
              } else if (activePersona?._id) {
                s.emit('presence:heartbeat', { personaId: activePersona._id });
              }
            }
          };

          keepAliveWorker.postMessage('start');
        } else {
          fallbackInterval = setInterval(() => {
            if (!s.connected) {
              s.connect();
            } else if (activePersona?._id) {
              s.emit('presence:heartbeat', { personaId: activePersona._id });
            }
          }, 15000);
        }
      } catch (err) {
        fallbackInterval = setInterval(() => {
          if (!s.connected) {
            s.connect();
          } else if (activePersona?._id) {
            s.emit('presence:heartbeat', { personaId: activePersona._id });
          }
        }, 15000);
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
          window.removeEventListener('online', handleOnline);
          document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
        }
        if (keepAliveWorker) {
          try {
            keepAliveWorker.postMessage('stop');
            keepAliveWorker.terminate();
          } catch (e) {}
        }
        if (fallbackInterval) {
          clearInterval(fallbackInterval);
        }
      };
    }
  }, [token, activePersona, logout, setActivePersona]);

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
