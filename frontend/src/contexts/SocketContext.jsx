import { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [pageUsers, setPageUsers] = useState({});
  const [blockLocks, setBlockLocks] = useState({});
  const [cursors, setCursors] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const listenersRef = useRef(new Map());

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const socket = io({
      auth: { token: getToken() },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    // Page events
    socket.on('user:joined', (data) => {
      setPageUsers(prev => ({
        ...prev,
        [data.pageId]: [...(prev[data.pageId] || []), { userId: data.userId, username: data.username }]
      }));
    });

    socket.on('user:left', (data) => {
      setPageUsers(prev => ({
        ...prev,
        [data.pageId]: (prev[data.pageId] || []).filter(u => u.userId !== data.userId)
      }));
    });

    socket.on('page:users', (data) => {
      setPageUsers(prev => ({
        ...prev,
        [data.pageId]: data.users
      }));
    });

    // Block locks
    socket.on('block:locked', (data) => {
      setBlockLocks(prev => ({
        ...prev,
        [data.blockId]: { userId: data.lockedBy.userId, username: data.lockedBy.username }
      }));
    });

    socket.on('block:unlocked', (data) => {
      setBlockLocks(prev => {
        const next = { ...prev };
        delete next[data.blockId];
        return next;
      });
    });

    socket.on('block:lock:denied', (data) => {
      // Handle lock denied
    });

    socket.on('block:lock:granted', (data) => {
      // Handle lock granted
    });

    socket.on('block:updated', (data) => {
      // Broadcast block update to local listeners
      const key = `${data.pageId}:${data.blockId}`;
      const callbacks = listenersRef.current.get(key) || [];
      callbacks.forEach(cb => cb(data));
    });

    // Cursors
    socket.on('cursor:moved', (data) => {
      setCursors(prev => ({
        ...prev,
        [data.pageId]: {
          ...(prev[data.pageId] || {}),
          [data.userId]: { ...data, timestamp: Date.now() }
        }
      }));
    });

    // Typing
    socket.on('typing:start', (data) => {
      setTypingUsers(prev => ({
        ...prev,
        [data.pageId]: {
          ...(prev[data.pageId] || {}),
          [data.blockId]: [...(prev[data.pageId]?.[data.blockId] || []), { userId: data.userId, username: data.username }]
        }
      }));
    });

    socket.on('typing:stop', (data) => {
      setTypingUsers(prev => ({
        ...prev,
        [data.pageId]: {
          ...(prev[data.pageId] || {}),
          [data.blockId]: (prev[data.pageId]?.[data.blockId] || []).filter(u => u.userId !== data.userId)
        }
      }));
    });

    // Comments
    socket.on('comment:created', (data) => {
      const key = `comments:${data.pageId}`;
      const callbacks = listenersRef.current.get(key) || [];
      callbacks.forEach(cb => cb('created', data));
    });

    socket.on('comment:updated', (data) => {
      const key = `comments:${data.pageId}`;
      const callbacks = listenersRef.current.get(key) || [];
      callbacks.forEach(cb => cb('updated', data));
    });

    socket.on('comment:deleted', (data) => {
      const key = `comments:${data.pageId}`;
      const callbacks = listenersRef.current.get(key) || [];
      callbacks.forEach(cb => cb('deleted', data));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, user]);

  function getToken() {
    // Token is in cookie, but we can also read from localStorage if needed
    return null; // Socket.io will send cookies automatically
  }

  const joinPage = useCallback((pageId) => {
    socketRef.current?.emit('page:join', pageId);
  }, []);

  const leavePage = useCallback((pageId) => {
    socketRef.current?.emit('page:leave', pageId);
  }, []);

  const lockBlock = useCallback((blockId, pageId) => {
    socketRef.current?.emit('block:lock', { blockId, pageId });
  }, []);

  const unlockBlock = useCallback((blockId, pageId) => {
    socketRef.current?.emit('block:unlock', { blockId, pageId });
  }, []);

  const updateBlock = useCallback((blockId, pageId, content, operation) => {
    socketRef.current?.emit('block:update', { blockId, pageId, content, operation });
  }, []);

  const moveCursor = useCallback((pageId, blockId, position, selection) => {
    socketRef.current?.emit('cursor:move', { pageId, blockId, position, selection });
  }, []);

  const startTyping = useCallback((pageId, blockId) => {
    socketRef.current?.emit('typing:start', { pageId, blockId });
  }, []);

  const stopTyping = useCallback((pageId, blockId) => {
    socketRef.current?.emit('typing:stop', { pageId, blockId });
  }, []);

  const updatePresence = useCallback((pageId, data) => {
    socketRef.current?.emit('presence:update', { pageId, ...data });
  }, []);

  // Subscribe to block updates
  const subscribeToBlock = useCallback((pageId, blockId, callback) => {
    const key = `${pageId}:${blockId}`;
    const callbacks = listenersRef.current.get(key) || [];
    callbacks.push(callback);
    listenersRef.current.set(key, callbacks);

    return () => {
      const callbacks = listenersRef.current.get(key) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
      listenersRef.current.set(key, callbacks);
    };
  }, []);

  // Subscribe to comments
  const subscribeToComments = useCallback((pageId, callback) => {
    const key = `comments:${pageId}`;
    const callbacks = listenersRef.current.get(key) || [];
    callbacks.push(callback);
    listenersRef.current.set(key, callbacks);

    return () => {
      const callbacks = listenersRef.current.get(key) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
      listenersRef.current.set(key, callbacks);
    };
  }, []);

  const value = {
    socket: socketRef.current,
    connected,
    pageUsers,
    blockLocks,
    cursors,
    typingUsers,
    joinPage,
    leavePage,
    lockBlock,
    unlockBlock,
    updateBlock,
    moveCursor,
    startTyping,
    stopTyping,
    updatePresence,
    subscribeToBlock,
    subscribeToComments
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
}