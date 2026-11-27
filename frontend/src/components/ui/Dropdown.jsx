import { useState, useRef, useEffect, Fragment } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { createPortal } from 'react-dom';

const Dropdown = ({ children, trigger, align = 'end', className = '' }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          triggerRef.current && !triggerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const content = (
    <div
      ref={dropdownRef}
      className={`absolute z-50 min-w-[160px] rounded-md border border-border bg-surface shadow-lg animate-in ${className}`}
      role="menu"
    >
      {children}
    </div>
  );

  return (
    <Fragment>
      <div ref={triggerRef} className="relative inline-block">
        {typeof trigger === 'function' ? trigger({ open, onClick: () => setOpen(!open) }) : trigger}
      </div>
      {open && createPortal(content, document.body)}
    </Fragment>
  );
};

const DropdownItem = ({ children, onClick, disabled, className = '', icon, shortcut, ...props }) => {
  const handleClick = (e) => {
    if (!disabled && onClick) {
      onClick(e);
    }
  };

  return (
    <button
      className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground transition-colors duration-fast hover:bg-muted ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}
      onClick={handleClick}
      disabled={disabled}
      role="menuitem"
      {...props}
    >
      {icon && <span className="h-4 w-4 flex-shrink-0">{icon}</span>}
      <span className="flex-1">{children}</span>
      {shortcut && <kbd className="px-1.5 py-0.5 text-xs font-mono text-foreground-muted bg-muted rounded-sm">{shortcut}</kbd>}
    </button>
  );
};

const DropdownSeparator = ({ className = '' }) => (
  <hr className={`border-border my-1 ${className}`} role="separator" />
);

const DropdownLabel = ({ children, className = '' }) => (
  <div className={`px-3 py-2 text-xs font-medium text-foreground-muted uppercase tracking-wide ${className}`}>
    {children}
  </div>
);

export { Dropdown, DropdownItem, DropdownSeparator, DropdownLabel };