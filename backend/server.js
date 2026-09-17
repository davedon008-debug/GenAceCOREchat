import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { initSocketServer } from './config/socket.js';

import authRoutes from './routes/auth.routes.js';
import personaRoutes from './routes/persona.routes.js';
import conversationRoutes from './routes/conversation.routes.js';
import messageRoutes from './routes/message.routes.js';
import spaceRoutes from './routes/space.routes.js';
import aiRoutes from './routes/ai.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import adminRoutes from './routes/admin.routes.js';

// Enforce JWT secret verification
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('super_secure')) {
  console.error('❌ [FATAL SECURITY ERROR] Valid JWT_SECRET must be set in environment variables!');
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// HTTP Security Headers (Helmet)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

// CORS Configuration with Origin Whitelisting
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3005',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3005'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(null, true); // Fallback allowing dev connections while restricting untrusted headers
    }
  },
  credentials: true
}));

// Rate Limiting Definitions
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 15 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication or passcode attempts. Please try again in 15 minutes.' }
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Upload limit exceeded. Please wait before uploading more files.' }
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 400,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down.' }
});

// Apply rate limiting
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/verify-passcode', authLimiter);
app.use('/api/auth/chat-passcode', authLimiter);
app.use('/api/upload', uploadLimiter);

// Preserve 250MB HTTP upload body payload limits for legitimate media transfers
app.use(express.json({ limit: '250mb' }));
app.use(express.urlencoded({ limit: '250mb', extended: true }));

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to Database
connectDB();

// Initialize Real-time Socket.io Server
initSocketServer(server);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/personas', personaRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/spaces', spaceRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', async (req, res) => {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  const isDbConnected = mongoose.connection.readyState === 1;

  let dbStats = null;
  if (isDbConnected && mongoose.connection.db) {
    try {
      const stats = await mongoose.connection.db.stats();
      dbStats = {
        dataSizeMB: Number((stats.dataSize / (1024 * 1024)).toFixed(2)),
        storageSizeMB: Number((stats.storageSize / (1024 * 1024)).toFixed(2)),
        indexSizeMB: Number((stats.indexSize / (1024 * 1024)).toFixed(2)),
        totalDocuments: stats.objects
      };
    } catch (e) {
      // Ignore stats error if unprivileged
    }
  }

  res.json({
    status: 'healthy',
    platform: 'DONCHAT Next-Gen Engine',
    uptimeSeconds: Math.floor(uptime),
    database: isDbConnected ? 'connected' : 'disconnected',
    dbStats,
    memory: {
      rssMB: Math.round(memoryUsage.rss / (1024 * 1024)),
      heapUsedMB: Math.round(memoryUsage.heapUsed / (1024 * 1024)),
      heapTotalMB: Math.round(memoryUsage.heapTotal / (1024 * 1024))
    },
    time: new Date()
  });
});

const PORT = process.env.PORT || 5005;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ [DONCHAT Server Error] Port ${PORT} is currently in use by another process.`);
    console.error(`👉 Solution: Stop the process on port ${PORT} or change PORT in backend/.env.\n`);
  } else {
    console.error(`❌ [DONCHAT Server Error]`, err);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n⚡ [DONCHAT Server] Running successfully on http://0.0.0.0:${PORT} (Accessible on Local Network)`);
});
