import { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

const ToastContext = createContext(null);

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info
};

const colors = {
  success: 'bg-success-light text-success border-success-light',
  error: 'bg-error-light text-error border-error-light',
  warning: 'bg-warning-light text-warning border-warning-light',
  info: 'bg-primary-light text-primary border-primary-light'
};

function Toast({ id, type, title, message, onClose, duration = 5000 }) {
  const Icon = icons[type];
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => setVisible(false), 200);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border shadow-lg animate-slide-right',
        exiting && 'animate-fade-out translate-x-full opacity-0',
        colors[type]
      )}
      role="alert"
      aria-live="polite"
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {title && (
          <p className="font-medium text-sm">{title}</p>
        )}
        {message && (
          <p className="text-sm opacity-90 mt-0.5">{message}</p>
        )}
      </div>
      <button
        onClick={() => {
          setExiting(true);
          setTimeout(() => onClose(id), 200);
        }}
        className="flex-shrink-0 p-1 rounded hover:bg-black/10 hover:bg-white/10 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

import { useState } from 'react';

function ToasterProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((options) => {
    return addToast(options);
  }, [addToast]);

  toast.success = (title, message) => addToast({ type: 'success', title, message });
  toast.error = (title, message) => addToast({ type: 'error', title, message });
  toast.warning = (title, message) => addToast({ type: 'warning', title, message });
  toast.info = (title, message) => addToast({ type: 'info', title, message });

  const value = { toast, addToast, removeToast };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-1rem)] pointer-events-none">
          {toasts.map(toast => (
            <Toast
              key={toast.id}
              id={toast.id}
              type={toast.type}
              title={toast.title}
              message={toast.message}
              onClose={removeToast}
              duration={toast.duration}
            />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

function Toaster() {
  return null; // Rendered by provider
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToasterProvider');
  }
  return context;
}

export { ToasterProvider, Toaster };