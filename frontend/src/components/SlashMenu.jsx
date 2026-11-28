import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/utils';
import { BLOCK_TYPES, getBlockTypeIcon } from '../lib/utils';
import { Tooltip } from './ui/Tooltip';

export function SlashMenu({
  query,
  onSelect,
  onClose,
  position
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef(null);
  const itemRefs = useRef([]);

  const filteredTypes = BLOCK_TYPES.filter(bt =>
    bt.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % filteredTypes.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + filteredTypes.length) % filteredTypes.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredTypes[selectedIndex]) {
            onSelect(filteredTypes[selectedIndex].type);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'Tab':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredTypes, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (filteredTypes.length === 0) {
    return null;
  }

  const menuContent = (
    <div
      ref={menuRef}
      className="slash-menu"
      style={{ left: position?.x, top: position?.y }}
      role="menu"
    >
      {filteredTypes.map((blockType, index) => (
        <button
          key={blockType.type}
          ref={(el) => { itemRefs.current[index] = el; }}
          role="menuitem"
          tabIndex={-1}
          className={cn(
            'slash-menu-item',
            index === selectedIndex && 'slash-menu-item-selected'
          )}
          onClick={() => onSelect(blockType.type)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
            {getBlockTypeIcon(blockType.type)}
          </span>
          <span className="flex-1">{blockType.label}</span>
          {blockType.shortcut && (
            <span className="text-xs text-foreground-tertiary font-mono">{blockType.shortcut}</span>
          )}
        </button>
      ))}
    </div>
  );

  return createPortal(menuContent, document.body);
}