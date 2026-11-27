import { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export function SlashMenu({ isOpen, position, onClose, onSelect, blockTypes }) {
  const menuRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          const items = menuRef.current?.querySelectorAll('[role="menuitem"]');
          if (items?.length) {
            const activeIndex = Array.from(items).findIndex(item => item === document.activeElement);
            const nextIndex = (activeIndex + 1) % items.length;
            items[nextIndex]?.focus();
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const items = menuRef.current?.querySelectorAll('[role="menuitem"]');
          if (items?.length) {
            const activeIndex = Array.from(items).findIndex(item => item === document.activeElement);
            const prevIndex = activeIndex <= 0 ? items.length - 1 : activeIndex - 1;
            items[prevIndex]?.focus();
          }
        } else if (e.key === 'Enter') {
          e.preventDefault();
          document.activeElement?.click();
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={menuRef}
      className="slash-menu"
      style={{ left: position.x, top: position.y }}
      role="menu"
    >
      {blockTypes.map(type => (
        <button
          key={type.type}
          onClick={() => onSelect(type)}
          className="slash-menu-item"
          role="menuitem"
          tabIndex={-1}
        >
          <type.icon className="h-5 w-5 flex-shrink-0 text-foreground-muted" />
          <span className="flex-1">{type.label}</span>
          {type.shortcut && (
            <kbd className="px-1.5 py-0.5 text-xs font-mono text-foreground-muted bg-muted rounded-sm">
              {type.shortcut}
            </kbd>
          )}
        </button>
      ))}
    </div>,
    document.body
  );
}