import { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useWorkspace } from './WorkspaceContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const socketRef = useRef(null);
  const listenersRef = useRef(new Map());

  useEffect(() => {
    if (!token) return;

    const socket = io(window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      if (currentWorkspace) {
        socket.emit('join-workspace', currentWorkspace.id);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !currentWorkspace) return;

    socket.emit('join-workspace', currentWorkspace.id);

    return () => {
      socket.emit('leave-workspace', currentWorkspace.id);
    };
  }, [currentWorkspace]);

  const on = useCallback((event, callback) => {
    const socket = socketRef.current;
    if (!socket) return () => {};

    socket.on(event, callback);

    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event).add(callback);

    return () => {
      socket.off(event, callback);
      listenersRef.current.get(event)?.delete(callback);
    };
  }, []);

  const emit = useCallback((event, data) => {
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit(event, data);
    }
  }, []);

  const joinPage = useCallback((pageId) => {
    emit('join-page', pageId);
  }, [emit]);

  const leavePage = useCallback((pageId) => {
    emit('leave-page', pageId);
  }, [emit]);

  const value = {
    socket: socketRef.current,
    on,
    emit,
    joinPage,
    leavePage,
    isConnected: socketRef.current?.connected ?? false,
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
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}