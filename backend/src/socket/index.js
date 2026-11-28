import jwt from 'jsonwebtoken';
import { getDatabase } from '../db/init.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Store active connections
const userSockets = new Map(); // userId -> Set of socketIds
const pageRooms = new Map(); // pageId -> Set of socketIds
const blockLocks = new Map(); // blockId -> { socketId, userId, timestamp }

function verifySocketToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function setupSocketHandlers(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = verifySocketToken(token);
    if (!decoded) {
      return next(new Error('Invalid token'));
    }

    // Verify session exists
    const db = getDatabase();
    const session = db.prepare('SELECT id FROM sessions WHERE user_id = ? AND token_hash = ? AND expires_at > datetime("now")')
      .get(decoded.id, hashToken(token));

    if (!session) {
      return next(new Error('Session expired'));
    }

    socket.userId = decoded.id;
    socket.username = decoded.username;
    next();
  });

  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.username} (${socket.userId})`);

    // Track user sockets
    if (!userSockets.has(socket.userId)) {
      userSockets.set(socket.userId, new Set());
    }
    userSockets.get(socket.userId).add(socket.id);

    // Join page room
    socket.on('page:join', (pageId) => {
      joinPage(socket, pageId);
    });

    // Leave page room
    socket.on('page:leave', (pageId) => {
      leavePage(socket, pageId);
    });

    // Block editing - lock
    socket.on('block:lock', (data) => {
      lockBlock(socket, data);
    });

    // Block editing - unlock
    socket.on('block:unlock', (data) => {
      unlockBlock(socket, data);
    });

    // Block content change (operational transform style)
    socket.on('block:update', (data) => {
      updateBlock(socket, data);
    });

    // Cursor position
    socket.on('cursor:move', (data) => {
      moveCursor(socket, data);
    });

    // Typing indicator
    socket.on('typing:start', (data) => {
      socket.to(`page:${data.pageId}`).emit('typing:start', {
        userId: socket.userId,
        username: socket.username,
        blockId: data.blockId
      });
    });

    socket.on('typing:stop', (data) => {
      socket.to(`page:${data.pageId}`).emit('typing:stop', {
        userId: socket.userId,
        blockId: data.blockId
      });
    });

    // Presence
    socket.on('presence:update', (data) => {
      socket.to(`page:${data.pageId}`).emit('presence:update', {
        userId: socket.userId,
        username: socket.username,
        ...data
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      handleDisconnect(socket);
    });
  });

  // Cleanup expired locks periodically
  setInterval(() => {
    const now = Date.now();
    for (const [blockId, lock] of blockLocks.entries()) {
      if (now - lock.timestamp > 30000) { // 30 seconds
        blockLocks.delete(blockId);
        io.to(`page:${lock.pageId}`).emit('block:unlocked', { blockId, userId: lock.userId });
      }
    }
  }, 10000);
}

function joinPage(socket, pageId) {
  if (!pageId) return;

  socket.join(`page:${pageId}`);

  if (!pageRooms.has(pageId)) {
    pageRooms.set(pageId, new Set());
  }
  pageRooms.get(pageId).add(socket.id);

  // Notify others
  socket.to(`page:${pageId}`).emit('user:joined', {
    pageId,
    userId: socket.userId,
    username: socket.username,
    socketId: socket.id
  });

  // Send current users in page
  const users = [];
  for (const sid of pageRooms.get(pageId) || []) {
    const s = io.sockets.sockets.get(sid);
    if (s && s.userId) {
      users.push({ userId: s.userId, username: s.username });
    }
  }

  socket.emit('page:users', { pageId, users });
}

function leavePage(socket, pageId) {
  if (!pageId) return;

  socket.leave(`page:${pageId}`);

  const room = pageRooms.get(pageId);
  if (room) {
    room.delete(socket.id);
    if (room.size === 0) {
      pageRooms.delete(pageId);
    }
  }

  // Release any locks
  for (const [blockId, lock] of blockLocks.entries()) {
    if (lock.socketId === socket.id) {
      blockLocks.delete(blockId);
      socket.to(`page:${lock.pageId}`).emit('block:unlocked', { blockId, userId: lock.userId });
    }
  }

  socket.to(`page:${pageId}`).emit('user:left', {
    pageId,
    userId: socket.userId,
    username: socket.username
  });
}

function lockBlock(socket, data) {
  const { blockId, pageId } = data;
  if (!blockId || !pageId) return;

  const existingLock = blockLocks.get(blockId);

  if (existingLock && existingLock.socketId !== socket.id) {
    // Already locked by another user
    socket.emit('block:lock:denied', {
      blockId,
      lockedBy: { userId: existingLock.userId, username: existingLock.username }
    });
    return;
  }

  // Acquire lock
  blockLocks.set(blockId, {
    socketId: socket.id,
    userId: socket.userId,
    username: socket.username,
    pageId,
    timestamp: Date.now()
  });

  // Notify others
  socket.to(`page:${pageId}`).emit('block:locked', {
    blockId,
    lockedBy: { userId: socket.userId, username: socket.username }
  });

  // Confirm to requester
  socket.emit('block:lock:granted', { blockId });
}

function unlockBlock(socket, data) {
  const { blockId, pageId } = data;
  if (!blockId || !pageId) return;

  const lock = blockLocks.get(blockId);

  if (lock && lock.socketId === socket.id) {
    blockLocks.delete(blockId);
    socket.to(`page:${pageId}`).emit('block:unlocked', {
      blockId,
      userId: socket.userId
    });
  }
}

function updateBlock(socket, data) {
  const { blockId, pageId, content, operation } = data;
  if (!blockId || !pageId) return;

  const lock = blockLocks.get(blockId);

  // Only allow updates if user has lock or no lock exists
  if (lock && lock.socketId !== socket.id) {
    socket.emit('block:update:denied', { blockId });
    return;
  }

  // Broadcast to others in page
  socket.to(`page:${pageId}`).emit('block:updated', {
    blockId,
    content,
    operation,
    userId: socket.userId
  });
}

function moveCursor(socket, data) {
  const { pageId, blockId, position, selection } = data;
  if (!pageId) return;

  socket.to(`page:${pageId}`).emit('cursor:moved', {
    userId: socket.userId,
    username: socket.username,
    blockId,
    position,
    selection
  });
}

function handleDisconnect(socket) {
  console.log(`🔌 User disconnected: ${socket.username} (${socket.userId})`);

  // Remove from user sockets
  const userSocketSet = userSockets.get(socket.userId);
  if (userSocketSet) {
    userSocketSet.delete(socket.id);
    if (userSocketSet.size === 0) {
      userSockets.delete(socket.userId);
    }
  }

  // Leave all page rooms
  for (const [pageId, room] of pageRooms.entries()) {
    if (room.has(socket.id)) {
      room.delete(socket.id);
      if (room.size === 0) {
        pageRooms.delete(pageId);
      }

      // Release locks
      for (const [blockId, lock] of blockLocks.entries()) {
        if (lock.socketId === socket.id) {
          blockLocks.delete(blockId);
          io.to(`page:${lock.pageId}`).emit('block:unlocked', { blockId, userId: lock.userId });
        }
      }

      // Notify others
      socket.to(`page:${pageId}`).emit('user:left', {
        pageId,
        userId: socket.userId,
        username: socket.username
      });
    }
  }
}

function hashToken(token) {
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    const char = token.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

// Utility: Send notification to user
export function notifyUser(io, userId, event, data) {
  const sockets = userSockets.get(userId);
  if (sockets) {
    for (const socketId of sockets) {
      io.to(socketId).emit(event, data);
    }
  }
}

// Utility: Broadcast to page
export function broadcastToPage(io, pageId, event, data) {
  io.to(`page:${pageId}`).emit(event, data);
}

// Make io available globally for routes
global.io = io;