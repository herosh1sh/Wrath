import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

function Dropdown({
  trigger,
  items,
  align = 'right',
  className,
  onClose
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);

  const handleClickOutside = useCallback((e) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
      if (triggerRef.current && !triggerRef.current.contains(e.target)) {
        setIsOpen(false);
        onClose?.();
      }
    }
  }, [onClose]);

  const handleKeyDown = useCallback((e) => {
    if (!isOpen) return;

    const itemsList = dropdownRef.current?.querySelectorAll('[role="menuitem"]:not([disabled])');
    if (!itemsList?.length) return;

    const currentIndex = Array.from(itemsList).findIndex(el => el === document.activeElement);

    switch (e.key) {
      case 'Escape':
        setIsOpen(false);
        onClose?.();
        triggerRef.current?.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = currentIndex < itemsList.length - 1 ? currentIndex + 1 : 0;
        itemsList[nextIndex]?.focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : itemsList.length - 1;
        itemsList[prevIndex]?.focus();
        break;
      case 'Home':
        e.preventDefault();
        itemsList[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        itemsList[itemsList.length - 1]?.focus();
        break;
      case 'Tab':
        setIsOpen(false);
        onClose?.();
        break;
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, handleClickOutside, handleKeyDown]);

  const dropdownContent = (
    <div
      ref={dropdownRef}
      className={cn('dropdown', className)}
      role="menu"
      style={{
        [align === 'right' ? 'right' : 'left']: 0,
        top: '100%',
        marginTop: '4px'
      }}
    >
      {items.map((item, index) => {
        if (item.type === 'divider') {
          return <div key={index} className="dropdown-divider" role="separator" />;
        }

        if (item.type === 'section') {
          return (
            <div key={index} className="dropdown-section">
              {item.label}
            </div>
          );
        }

        return (
          <button
            key={index}
            role="menuitem"
            tabIndex={-1}
            className={cn('dropdown-item w-full text-left', item.className)}
            onClick={() => {
              if (!item.disabled) {
                item.onClick?.();
                if (!item.keepOpen) {
                  setIsOpen(false);
                  onClose?.();
                }
              }
            }}
            disabled={item.disabled}
            aria-disabled={item.disabled}
          >
            {item.icon && <span className="w-4 h-4 flex-shrink-0">{item.icon}</span>}
            <span className="flex-1">{item.label}</span>
            {item.shortcut && (
              <span className="text-xs text-foreground-tertiary font-mono">{item.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="relative inline-block">
      <div
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex"
      >
        {trigger}
      </div>
      {isOpen && createPortal(dropdownContent, document.body)}
    </div>
  );
}

export { Dropdown };