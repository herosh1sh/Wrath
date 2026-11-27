import { useEffect, Fragment } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

const Modal = ({ isOpen, onClose, title, description, children, className = '', size = 'default' }) => {
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    default: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw]',
  };

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const content = (
    <Fragment>
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm animate-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`fixed left-1/2 top-1/2 z-50 w-full ${sizes[size]} -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-6 shadow-xl animate-in ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || description) && (
          <div className="mb-4">
            {title && <h2 id="modal-title" className="text-lg font-semibold">{title}</h2>}
            {description && <p id="modal-description" className="text-sm text-foreground-muted">{description}</p>}
          </div>
        )}
        {children}
      </div>
    </Fragment>
  );

  return createPortal(content, document.body);
};

const ModalHeader = ({ children, className = '' }) => (
  <div className={`flex items-center justify-between mb-4 ${className}`}>{children}</div>
);

const ModalTitle = ({ children, className = '' }) => (
  <h2 className={`text-lg font-semibold ${className}`}>{children}</h2>
);

const ModalDescription = ({ children, className = '' }) => (
  <p className={`text-sm text-foreground-muted ${className}`}>{children}</p>
);

const ModalClose = ({ onClick, className = '' }) => (
  <button
    className={`btn-icon text-foreground-muted hover:text-foreground ${className}`}
    onClick={onClick}
    aria-label="Закрыть"
  >
    <X className="h-5 w-5" />
  </button>
);

const ModalContent = ({ children, className = '' }) => (
  <div className={className}>{children}</div>
);

const ModalFooter = ({ children, className = '' }) => (
  <div className={`flex items-center justify-end gap-2 mt-6 ${className}`}>{children}</div>
);

export { Modal, ModalHeader, ModalTitle, ModalDescription, ModalClose, ModalContent, ModalFooter };