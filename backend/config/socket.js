import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Persona from '../models/Persona.js';
import Conversation from '../models/Conversation.js';
import Space from '../models/Space.js';
import Message from '../models/Message.js';
import { sendPushNotifications } from './push.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ [FATAL CONFIG ERROR] JWT_SECRET environment variable is missing for Socket authentication!');
}

let ioServer = null;
const connectedPersonas = new Map();
const pendingDisconnectTimers = new Map();
const PRESENCE_GRACE_PERIOD_MS = 3 * 60 * 1000; // 3-minute grace period before marking offline

// Active ringing calls registry: callId -> { callId, callerPersona, callerSocketId, targetPersonaId, roomId, isVideo, timestamp, timeoutTimer }
export const activeRingingCalls = new Map();

export const getPendingCallForPersona = (personaId) => {
  if (!personaId) return null;
  const pIdStr = String(personaId);
  for (const [callId, callInfo] of activeRingingCalls.entries()) {
    if (String(callInfo.targetPersonaId) === pIdStr) {
      if (Date.now() - callInfo.timestamp < 45000) {
        return {
          callId: callInfo.callId,
          callerPersona: callInfo.callerPersona,
          callerSocketId: callInfo.callerSocketId,
          roomId: callInfo.roomId,
          isVideo: callInfo.isVideo,
          timestamp: callInfo.timestamp
        };
      }
    }
  }
  return null;
};

export const checkAndEmitPendingCall = (socket, personaId) => {
  if (!socket || !personaId) return;
  const pending = getPendingCallForPersona(personaId);
  if (pending) {
    console.log(`[Call Signaling] Re-emitting active ringing call ${pending.callId} to persona ${personaId}`);
    socket.emit('call:incoming', pending);
  }
};

export const rejectRingingCall = (callId, reason = 'declined', responderPersonaId = null) => {
  if (!callId || !activeRingingCalls.has(callId)) return false;
  const callInfo = activeRingingCalls.get(callId);
  clearTimeout(callInfo.timeoutTimer);
  activeRingingCalls.delete(callId);

  if (ioServer) {
    const callerTarget = callInfo.callerSocketId && ioServer.sockets.sockets.get(callInfo.callerSocketId)
      ? ioServer.to(callInfo.callerSocketId)
      : ioServer.to(`persona:${callInfo.callerPersona?._id}`);

    callerTarget.emit('call:rejected', {
      callId,
      reason,
      responderPersonaId: responderPersonaId || callInfo.targetPersonaId
    });

    ioServer.to(`persona:${callInfo.targetPersonaId}`).emit('call:ended', {
      callId,
      reason
    });
  }
  return true;
};

export const getIO = () => ioServer;

export const broadcastPresence = async () => {
  if (!ioServer) return;
  try {
    const activeIds = Array.from(connectedPersonas.values()).filter(Boolean).map(String);
    const pendingIds = Array.from(pendingDisconnectTimers.keys()).filter(Boolean).map(String);
    const rawIds = Array.from(new Set([...activeIds, ...pendingIds]));
    const validIds = rawIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      ioServer.emit('presence:update', { onlinePersonaIds: [], personaStatuses: {} });
      return;
    }

    const onlinePersonas = await Persona.find({
      _id: { $in: validIds }
    }).populate('userId', 'role');

    const personaStatuses = {};
    const onlinePersonaIds = [];

    validIds.forEach(pId => {
      const p = onlinePersonas.find(item => String(item._id) === String(pId));
      const dbStatus = p?.status;
      const effectiveStatus = (dbStatus && dbStatus !== 'offline') ? dbStatus : 'online';

      onlinePersonaIds.push(pId);
      personaStatuses[pId] = effectiveStatus;
    });

    ioServer.emit('presence:update', { onlinePersonaIds, personaStatuses });
  } catch (err) {
    console.warn('[Socket] Presence broadcast network notice:', err?.message || err);
    const fallbackIds = Array.from(new Set([
      ...Array.from(connectedPersonas.values()),
      ...Array.from(pendingDisconnectTimers.keys())
    ])).filter(Boolean).map(String);
    const fallbackStatuses = {};
    fallbackIds.forEach(id => { fallbackStatuses[id] = 'online'; });
    ioServer.emit('presence:update', { onlinePersonaIds: fallbackIds, personaStatuses: fallbackStatuses });
  }
};

export const evictUserSockets = async (userIds = [], personaIds = []) => {
  if (!ioServer) return;
  const uIds = (Array.isArray(userIds) ? userIds : [userIds]).map(String);
  const pIds = (Array.isArray(personaIds) ? personaIds : [personaIds]).map(String);

  uIds.forEach(uId => {
    if (uId) ioServer.to(`user:${uId}`).emit('account:terminated', { message: 'Your account was deleted by an administrator.' });
  });
  pIds.forEach(pId => {
    if (pId) {
      if (pendingDisconnectTimers.has(pId)) {
        clearTimeout(pendingDisconnectTimers.get(pId));
        pendingDisconnectTimers.delete(pId);
      }
      ioServer.to(`persona:${pId}`).emit('account:terminated', { message: 'Your account was deleted by an administrator.' });
    }
  });

  if (ioServer.sockets?.sockets) {
    for (const [socketId, socket] of ioServer.sockets.sockets) {
      const matchUser = uIds.includes(String(socket.userId));
      const matchPersona = pIds.includes(String(socket.personaId));
      if (matchUser || matchPersona) {
        connectedPersonas.delete(socketId);
        socket.disconnect(true);
      }
    }
  }
  await broadcastPresence();
};

const autoJoinUserRooms = async (socket, personaId) => {
  if (!socket || !personaId) return;
  try {
    const pIdStr = String(personaId);
    socket.join(`persona:${pIdStr}`);

    const [convs, spaces] = await Promise.all([
      Conversation.find({ participants: personaId }).select('_id').lean(),
      Space.find({ 'members.personaId': personaId }).select('_id conversationId').lean()
    ]);

    (convs || []).forEach(c => socket.join(String(c._id)));
    (spaces || []).forEach(s => {
      socket.join(String(s._id));
      if (s.conversationId) socket.join(String(s.conversationId));
    });

    console.log(`[Socket] Persona ${pIdStr} auto-joined ${convs.length} conversations & ${spaces.length} spaces`);
    checkAndEmitPendingCall(socket, pIdStr);
  } catch (err) {
    console.warn(`[Socket] autoJoinUserRooms network notice for persona ${personaId}:`, err?.message || err);
  }
};

export const initSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    pingInterval: 25000,
    pingTimeout: 30000,
    maxHttpBufferSize: 2 * 1024 * 1024 // 2MB frame buffer for real-time chat metadata and events
  });

  ioServer = io;

  // Socket middleware for JWT verification
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication token missing'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.personaId = decoded.personaId;
      next();
    } catch (err) {
      next(new Error('Invalid socket authentication token'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`[Socket] Connected: PersonaId ${socket.personaId} (Socket: ${socket.id})`);
    
    const clearPendingTimer = (pId) => {
      if (!pId) return;
      const pIdStr = String(pId);
      if (pendingDisconnectTimers.has(pIdStr)) {
        clearTimeout(pendingDisconnectTimers.get(pIdStr));
        pendingDisconnectTimers.delete(pIdStr);
      }
    };

    if (socket.personaId) {
      const pIdStr = String(socket.personaId);
      clearPendingTimer(pIdStr);
      connectedPersonas.set(socket.id, pIdStr);
      if (socket.userId) {
        socket.join(`user:${socket.userId}`);
      }
      await autoJoinUserRooms(socket, socket.personaId);
      broadcastPresence();
    }

    socket.on('presence:announce', async (data) => {
      const targetId = data?.personaId || socket.personaId;
      if (targetId) {
        const pIdStr = String(targetId);
        clearPendingTimer(pIdStr);
        socket.personaId = pIdStr;
        connectedPersonas.set(socket.id, pIdStr);
        if (socket.userId) {
          socket.join(`user:${socket.userId}`);
        }
        await autoJoinUserRooms(socket, targetId);
        broadcastPresence();
      }
    });

    socket.on('presence:heartbeat', (data) => {
      const targetId = data?.personaId || socket.personaId;
      if (targetId) {
        const pIdStr = String(targetId);
        clearPendingTimer(pIdStr);
        connectedPersonas.set(socket.id, pIdStr);
      }
    });

    socket.on('presence:leave', () => {
      const targetId = socket.personaId || connectedPersonas.get(socket.id);
      if (targetId) {
        const pIdStr = String(targetId);
        clearPendingTimer(pIdStr);
        for (const [sId, pId] of connectedPersonas.entries()) {
          if (pId === pIdStr) connectedPersonas.delete(sId);
        }
        broadcastPresence();
      }
    });

    socket.on('presence:get', () => {
      broadcastPresence();
    });

    // Join room with authorization verification
    socket.on('join:room', async ({ roomId }) => {
      if (!roomId) return;
      try {
        if (!mongoose.Types.ObjectId.isValid(roomId)) {
          return;
        }
        const roomIdStr = String(roomId);
        socket.join(roomIdStr);
        console.log(`[Socket] Persona ${socket.personaId || 'unknown'} joined room: ${roomIdStr}`);
      } catch (err) {
        console.error(`[Socket] Join room verification error:`, err);
      }
    });

    // Leave room
    socket.on('leave:room', ({ roomId }) => {
      if (roomId) {
        socket.leave(String(roomId));
        console.log(`[Socket] Persona ${socket.personaId} left room: ${roomId}`);
      }
    });

    // Real-time message dispatch
    socket.on('message:send', async (data) => {
      const { conversationId, spaceId, message } = data;
      const targetRoom = spaceId || conversationId;

      try {
        let recipientPersonaIds = [];

        if (conversationId && mongoose.Types.ObjectId.isValid(conversationId)) {
          const conv = await Conversation.findById(conversationId).select('participants').lean();
          if (conv && Array.isArray(conv.participants)) {
            recipientPersonaIds = conv.participants.map(p => {
              if (!p) return null;
              return typeof p === 'object' ? String(p._id || p.id || p) : String(p);
            }).filter(Boolean);
          }
        } else if (spaceId && mongoose.Types.ObjectId.isValid(spaceId)) {
          const space = await Space.findById(spaceId).select('members').lean();
          if (space && Array.isArray(space.members)) {
            recipientPersonaIds = space.members.map(m => {
              if (!m || !m.personaId) return null;
              const p = m.personaId;
              return typeof p === 'object' ? String(p._id || p.id || p) : String(p);
            }).filter(Boolean);
          }
        }

        const msgObject = message?.toObject ? message.toObject({ virtuals: true }) : message;

        if (targetRoom) {
          io.to(String(targetRoom)).emit('message:new', msgObject);
        }

        recipientPersonaIds.forEach(pId => {
          if (pId) {
            io.to(`persona:${pId}`).emit('message:new', msgObject);
          }
        });
      } catch (err) {
        console.error('[Socket] Error dispatching message:', err);
        if (targetRoom) {
          io.to(String(targetRoom)).emit('message:new', message);
        }
      }
    });

    // Live typing indicators
    socket.on('typing:start', ({ roomId, personaName }) => {
      if (roomId) {
        socket.to(roomId).emit('typing:start', { personaId: socket.personaId, personaName });
      }
    });

    socket.on('typing:stop', ({ roomId, personaName }) => {
      if (roomId) {
        socket.to(roomId).emit('typing:stop', { personaId: socket.personaId, personaName });
      }
    });

    // Reaction updates
    socket.on('reaction:toggle', ({ roomId, messageId, reactions }) => {
      if (roomId) {
        io.to(roomId).emit('reaction:update', { messageId, reactions });
      }
    });

    // Real-time privacy vector mode updates
    socket.on('conversation:privacy:update', ({ roomId, privacyMode }) => {
      if (roomId && privacyMode) {
        io.to(String(roomId)).emit('conversation:privacy:updated', { roomId, privacyMode });
      }
    });

    // Real-time message deletion
    socket.on('message:delete', ({ roomId, messageId }) => {
      if (roomId && messageId) {
        io.to(roomId).emit('message:deleted', { messageId });
      }
    });

    // Real-time read status updates
    socket.on('message:read', async ({ conversationId, spaceId, roomId }) => {
      const targetRoom = roomId || spaceId || conversationId;
      if (!targetRoom || !socket.personaId) return;

      try {
        const readerObjectId = mongoose.Types.ObjectId.isValid(socket.personaId)
          ? new mongoose.Types.ObjectId(socket.personaId)
          : socket.personaId;

        const filter = {
          senderPersonaId: { $ne: readerObjectId }
        };
        if (conversationId) filter.conversationId = conversationId;
        else if (spaceId) filter.spaceId = spaceId;
        else filter.$or = [{ conversationId: targetRoom }, { spaceId: targetRoom }];

        await Message.updateMany(filter, {
          $set: { status: 'read' },
          $addToSet: { readBy: readerObjectId }
        });

        const readPayload = {
          conversationId,
          spaceId,
          readerPersonaId: socket.personaId
        };

        io.to(String(targetRoom)).emit('messages:read', readPayload);

        if (conversationId && mongoose.Types.ObjectId.isValid(conversationId)) {
          const conv = await Conversation.findById(conversationId).select('participants').lean();
          if (conv && Array.isArray(conv.participants)) {
            conv.participants.forEach(pId => {
              if (pId) io.to(`persona:${pId}`).emit('messages:read', readPayload);
            });
          }
        }
      } catch (err) {
        console.error('[Socket] message:read handling error:', err);
      }
    });

    // ============================================================
    // REAL-TIME WebRTC CALL SIGNALING HANDLERS
    // ============================================================
    // Route to a specific device socket when known, otherwise to all of the persona's devices.
    // Without this, a user logged in on 2 devices/tabs answers the offer twice and the call breaks.
    const callTarget = (targetPersonaId, targetSocketId) =>
      targetSocketId && io.sockets.sockets.get(targetSocketId)
        ? io.to(targetSocketId)
        : io.to(`persona:${targetPersonaId}`);

    socket.on('call:initiate', ({ targetPersonaId, roomId, isVideo, callerPersona, callId }) => {
      if (!targetPersonaId) return;
      const targetRoom = `persona:${targetPersonaId}`;
      console.log(`[Call Signaling] Persona ${socket.personaId} initiating ${isVideo ? 'Video' : 'Audio'} call to ${targetPersonaId} (CallId: ${callId})`);
      
      const payload = {
        callId,
        callerPersona: callerPersona || { _id: socket.personaId, displayName: 'User' },
        callerSocketId: socket.id,
        roomId,
        isVideo: !!isVideo,
        timestamp: Date.now()
      };

      // Register call in active ringing map with 45s auto-expire timer
      if (activeRingingCalls.has(callId)) {
        clearTimeout(activeRingingCalls.get(callId).timeoutTimer);
      }
      const timeoutTimer = setTimeout(() => {
        if (activeRingingCalls.has(callId)) {
          console.log(`[Call Signaling] Call ${callId} timed out after 45s of ringing.`);
          activeRingingCalls.delete(callId);
          callTarget(targetPersonaId).emit('call:ended', { callId, reason: 'timeout' });
          if (socket.connected) {
            socket.emit('call:ended', { callId, reason: 'timeout' });
          }
        }
      }, 45000);

      activeRingingCalls.set(callId, {
        ...payload,
        targetPersonaId: String(targetPersonaId),
        timeoutTimer
      });

      io.to(targetRoom).emit('call:incoming', payload);

      // Dispatch Web Push Notification so device receives call alert in background/locked screen
      const callerName = callerPersona?.displayName || callerPersona?.username || 'Someone';
      const callTypeStr = isVideo ? 'Video' : 'Voice';
      sendPushNotifications(
        [targetPersonaId],
        `📞 Incoming ${callTypeStr} Call`,
        `${callerName} is calling you on GenAce...`,
        {
          type: 'call',
          callId,
          roomId,
          isVideo: !!isVideo,
          callerName,
          callerPersonaId: String(socket.personaId)
        }
      ).catch(pushErr => console.warn('[Call Push Dispatch Warning]:', pushErr?.message || pushErr));
    });

    socket.on('call:accept', ({ targetPersonaId, targetSocketId, callId }) => {
      if (!targetPersonaId) return;
      console.log(`[Call Signaling] Persona ${socket.personaId} accepted call ${callId} from ${targetPersonaId}`);
      if (activeRingingCalls.has(callId)) {
        clearTimeout(activeRingingCalls.get(callId).timeoutTimer);
        activeRingingCalls.delete(callId);
      }
      callTarget(targetPersonaId, targetSocketId).emit('call:accepted', {
        callId,
        responderPersonaId: socket.personaId,
        responderSocketId: socket.id
      });
      // Dismiss the ringing on the responder's other devices
      socket.to(`persona:${socket.personaId}`).emit('call:answered-elsewhere', { callId });
    });

    socket.on('call:reject', ({ targetPersonaId, targetSocketId, callId, reason }) => {
      if (!targetPersonaId) return;
      console.log(`[Call Signaling] Persona ${socket.personaId} rejected call ${callId}`);
      if (activeRingingCalls.has(callId)) {
        clearTimeout(activeRingingCalls.get(callId).timeoutTimer);
        activeRingingCalls.delete(callId);
      }
      callTarget(targetPersonaId, targetSocketId).emit('call:rejected', {
        callId,
        reason: reason || 'declined',
        responderPersonaId: socket.personaId
      });
    });

    socket.on('call:signal', ({ targetPersonaId, targetSocketId, callId, signal }) => {
      if (!targetPersonaId || !signal) return;
      callTarget(targetPersonaId, targetSocketId).emit('call:signal', {
        callId,
        senderPersonaId: socket.personaId,
        senderSocketId: socket.id,
        signal
      });
    });

    socket.on('call:end', ({ targetPersonaId, callId }) => {
      if (!targetPersonaId) return;
      console.log(`[Call Signaling] Persona ${socket.personaId} ended call ${callId}`);
      if (activeRingingCalls.has(callId)) {
        clearTimeout(activeRingingCalls.get(callId).timeoutTimer);
        activeRingingCalls.delete(callId);
      }
      io.to(`persona:${targetPersonaId}`).emit('call:ended', {
        callId,
        endedByPersonaId: socket.personaId
      });
    });

    // Query pending calls for this client persona
    socket.on('call:query-pending', () => {
      const pId = socket.personaId || connectedPersonas.get(socket.id);
      if (pId) {
        checkAndEmitPendingCall(socket, pId);
      }
    });


    socket.on('disconnect', (reason) => {
      const pId = connectedPersonas.get(socket.id) || socket.personaId;
      connectedPersonas.delete(socket.id);
      console.log(`[Socket] Disconnected: PersonaId ${pId} (Reason: ${reason})`);

      // If caller disconnected while call was still ringing, notify target
      for (const [cId, callInfo] of activeRingingCalls.entries()) {
        if (callInfo.callerSocketId === socket.id) {
          clearTimeout(callInfo.timeoutTimer);
          activeRingingCalls.delete(cId);
          io.to(`persona:${callInfo.targetPersonaId}`).emit('call:ended', {
            callId: cId,
            reason: 'caller_disconnected'
          });
        }
      }

      if (pId) {
        const pIdStr = String(pId);
        const hasOtherSockets = Array.from(connectedPersonas.values()).some(id => id === pIdStr);
        if (!hasOtherSockets) {
          if (!pendingDisconnectTimers.has(pIdStr)) {
            const timer = setTimeout(() => {
              pendingDisconnectTimers.delete(pIdStr);
              broadcastPresence();
              console.log(`[Socket] Grace period expired for PersonaId ${pIdStr} -> marked offline`);
            }, PRESENCE_GRACE_PERIOD_MS);
            pendingDisconnectTimers.set(pIdStr, timer);
          }
        }
      }
      broadcastPresence();
    });
  });

  return io;
};
