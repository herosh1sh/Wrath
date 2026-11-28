import { forwardRef, useRef, useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { Dropdown } from '../ui/Dropdown';

export const ListBlock = forwardRef((
  { block, readOnly, onChange, onKeyDown },
  ref
) => {
  const [items, setItems] = useState(block.content?.items || [{ text: '' }]);
  const itemRefs = useRef([]);

  const isNumbered = block.type === 'numbered_list';

  useEffect(() => {
    if (block.content?.items) {
      setItems(block.content.items);
    }
  }, [block.content?.items]);

  const updateItem = (index, text) => {
    const newItems = [...items];
    newItems[index] = { text };
    setItems(newItems);
    onChange?.({ ...block.content, items: newItems });
  };

  const addItem = (afterIndex) => {
    const newItems = [...items];
    newItems.splice(afterIndex + 1, 0, { text: '' });
    setItems(newItems);
    onChange?.({ ...block.content, items: newItems });
  };

  const deleteItem = (index) => {
    if (items.length <= 1) return;
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    onChange?.({ ...block.content, items: newItems });
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const text = e.target.innerText;
      if (text.trim() === '' && items.length > 1) {
        e.preventDefault();
        deleteItem(index);
      } else {
        e.preventDefault();
        addItem(index);
        setTimeout(() => {
          itemRefs.current[index + 1]?.focus?.();
        }, 0);
      }
    }

    if (e.key === 'Backspace' && !e.shiftKey) {
      const text = e.target.innerText;
      if (text.trim() === '' && index > 0) {
        e.preventDefault();
        deleteItem(index);
        setTimeout(() => {
          itemRefs.current[index - 1]?.focus?.();
        }, 0);
      }
    }

    if (e.key === 'Tab' && !readOnly) {
      e.preventDefault();
      // Could implement indent/outdent here
    }

    onKeyDown?.(e);
  };

  return (
    <ul
      className={cn(
        'prose prose-neutral max-w-none space-y-1',
        isNumbered ? 'list-decimal list-inside' : 'list-disc list-inside',
        'pl-4'
      )}
    >
      {items.map((item, index) => (
        <li
          key={index}
          ref={(el) => { itemRefs.current[index] = el; }}
          className={cn(
            'relative group flex items-start gap-2',
            'hover:bg-background-hover rounded-lg px-2 py-1 -ml-2'
          )}
        >
          {!readOnly && (
            <Tooltip content="Drag to reorder" position="left">
              <div className="block-handle mt-1 flex-shrink-0" style={{ left: '-1.5rem' }}>
                <GripVertical className="w-4 h-4" />
              </div>
            </Tooltip>
          )}

          <div
            ref={index === 0 ? ref : undefined}
            contentEditable={!readOnly}
            onInput={(e) => updateItem(index, e.target.innerText)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onPaste={(e) => {
              e.preventDefault();
              const text = e.clipboardData.getData('text/plain');
              document.execCommand('insertText', false, text);
            }}
            className={cn(
              'flex-1 min-h-[1.5rem] prose prose-neutral max-w-none',
              'focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-offset-1 rounded',
              'text-foreground-primary leading-relaxed',
              readOnly ? 'pointer-events-none' : ''
            )}
            data-placeholder="List item"
            spellCheck={true}
            suppressContentEditableWarning
          >
            {item.text}
          </div>

          {!readOnly && (
            <Tooltip content="Item options" position="right">
              <Dropdown
                trigger={
                  <button className="p-1 rounded hover:bg-background-hover text-foreground-tertiary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" aria-label="Item options">
                    <span className="w-4 h-4">⋮</span>
                  </button>
                }
                items={[
                  { label: 'Add below', icon: <Plus className="w-4 h-4" />, onClick: () => addItem(index), shortcut: '' },
                  { label: 'Delete', icon: <Trash2 className="w-4 h-4" />, onClick: () => deleteItem(index), shortcut: '', className: 'text-error' }
                ]}
              />
            </Tooltip>
          )}
        </li>
      ))}
    </ul>
  );
});

ListBlock.displayName = 'ListBlock';