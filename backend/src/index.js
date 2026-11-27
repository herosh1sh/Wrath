import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

import authRoutes from './routes/auth.js';
import workspaceRoutes from './routes/workspaces.js';
import pageRoutes from './routes/pages.js';
import blockRoutes from './routes/blocks.js';
import searchRoutes from './routes/search.js';
import tagRoutes from './routes/tags.js';
import commentRoutes from './routes/comments.js';
import favoriteRoutes from './routes/favorites.js';
import uploadRoutes from './routes/upload.js';
import { authenticateToken } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
});

const PORT = process.env.PORT || 4000;
const DATA_DIR = join(process.cwd(), 'data');
const UPLOAD_DIR = join(DATA_DIR, 'uploads');

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);

// Static files for uploads
app.use('/uploads', express.static(UPLOAD_DIR));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', authenticateToken, workspaceRoutes);
app.use('/api/pages', authenticateToken, pageRoutes);
app.use('/api/blocks', authenticateToken, blockRoutes);
app.use('/api/search', authenticateToken, searchRoutes);
app.use('/api/tags', authenticateToken, tagRoutes);
app.use('/api/comments', authenticateToken, commentRoutes);
app.use('/api/favorites', authenticateToken, favoriteRoutes);
app.use('/api/upload', authenticateToken, uploadRoutes);

// Socket.io for real-time updates
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-workspace', (workspaceId) => {
    socket.join(`workspace:${workspaceId}`);
  });

  socket.on('join-page', (pageId) => {
    socket.join(`page:${pageId}`);
  });

  socket.on('leave-page', (pageId) => {
    socket.leave(`page:${pageId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io available globally for routes
app.set('io', io);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Не найдено' });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server ready`);
});

export { app, io };