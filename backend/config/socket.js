import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Persona from '../models/Persona.js';
import Conversation from '../models/Conversation.js';
import Space from '../models/Space.js';
import Message from '../models/Message.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ [FATAL CONFIG ERROR] JWT_SECRET environment variable is missing for Socket authentication!');
}

let ioServer = null;
const connectedPersonas = new Map();

export const getIO = () => ioServer;

export const broadcastPresence = async () => {
  if (!ioServer) return;
  try {
    const rawIds = Array.from(new Set(connectedPersonas.values())).filter(Boolean).map(String);
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
      const status = p?.status || 'online';
      const isAdmin = p?.userId && p.userId.role === 'admin';

      if (status !== 'offline' || isAdmin) {
        onlinePersonaIds.push(pId);
        personaStatuses[pId] = (status === 'offline' && isAdmin) ? 'online' : status;
      }
    });

    ioServer.emit('presence:update', { onlinePersonaIds, personaStatuses });
  } catch (err) {
    console.error('[Socket] Presence broadcast error:', err);
    const fallbackIds = Array.from(new Set(connectedPersonas.values())).filter(Boolean).map(String);
    ioServer.emit('presence:update', { onlinePersonaIds: fallbackIds, personaStatuses: {} });
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
    if (pId) ioServer.to(`persona:${pId}`).emit('account:terminated', { message: 'Your account was deleted by an administrator.' });
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

export const initSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
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

  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: PersonaId ${socket.personaId} (Socket: ${socket.id})`);
    
    if (socket.personaId) {
      connectedPersonas.set(socket.id, String(socket.personaId));
      socket.join(`persona:${socket.personaId}`);
      if (socket.userId) {
        socket.join(`user:${socket.userId}`);
      }
      broadcastPresence();
    }

    socket.on('presence:announce', (data) => {
      const targetId = data?.personaId || socket.personaId;
      if (targetId) {
        socket.personaId = String(targetId);
        connectedPersonas.set(socket.id, String(targetId));
        socket.join(`persona:${targetId}`);
        if (socket.userId) {
          socket.join(`user:${socket.userId}`);
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
        const isAuthorized = await Conversation.exists({ _id: roomId, participants: socket.personaId }) ||
                             await Space.exists({ _id: roomId, 'members.personaId': socket.personaId }) ||
                             await Space.exists({ conversationId: roomId, 'members.personaId': socket.personaId }) ||
                             await Space.exists({ _id: roomId, visibility: 'public' }) ||
                             await Space.exists({ conversationId: roomId, visibility: 'public' });
        if (isAuthorized) {
          socket.join(roomId);
          console.log(`[Socket] Persona ${socket.personaId} joined room: ${roomId}`);
        } else {
          console.warn(`[Socket] Persona ${socket.personaId} unauthorized room join attempt: ${roomId}`);
        }
      } catch (err) {
        console.error(`[Socket] Join room verification error:`, err);
      }
    });

    // Leave room
    socket.on('leave:room', ({ roomId }) => {
      if (roomId) {
        socket.leave(roomId);
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
            recipientPersonaIds = conv.participants.map(String);
          }
        } else if (spaceId && mongoose.Types.ObjectId.isValid(spaceId)) {
          const space = await Space.findById(spaceId).select('members').lean();
          if (space && Array.isArray(space.members)) {
            recipientPersonaIds = space.members.map(m => String(m.personaId));
          }
        }

        // Build target room set using Socket.IO chaining to avoid duplicate message emissions
        let targets = io;
        if (targetRoom) {
          targets = targets.to(String(targetRoom));
        }

        if (recipientPersonaIds.length > 0) {
          recipientPersonaIds.forEach(pId => {
            if (pId) {
              targets = targets.to(`persona:${pId}`);
            }
          });
        }

        targets.emit('message:new', message);
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
        const filter = {
          senderPersonaId: { $ne: socket.personaId },
          status: { $ne: 'read' }
        };
        if (conversationId) filter.conversationId = conversationId;
        else if (spaceId) filter.spaceId = spaceId;
        else filter.$or = [{ conversationId: targetRoom }, { spaceId: targetRoom }];

        const result = await Message.updateMany(filter, {
          $set: { status: 'read' },
          $addToSet: { readBy: socket.personaId }
        });

        if (result.modifiedCount > 0) {
          io.to(String(targetRoom)).emit('messages:read', {
            conversationId,
            spaceId,
            readerPersonaId: socket.personaId
          });
        }
      } catch (err) {
        console.error('[Socket] message:read handling error:', err);
      }
    });

    socket.on('disconnect', () => {
      connectedPersonas.delete(socket.id);
      broadcastPresence();
      console.log(`[Socket] Disconnected: PersonaId ${socket.personaId}`);
    });
  });

  return io;
};
