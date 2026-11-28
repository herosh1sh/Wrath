import { forwardRef, useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { CheckSquare, Square, GripVertical, Plus, Trash2 } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { Dropdown } from '../ui/Dropdown';

export const TodoBlock = forwardRef((
  { block, readOnly, onChange, onKeyDown },
  ref
) => {
  const [items, setItems] = useState(block.content?.items || [{ text: '', checked: false }]);
  const itemRefs = useRef([]);

  useEffect(() => {
    if (block.content?.items) {
      setItems(block.content.items);
    }
  }, [block.content?.items]);

  const updateItem = (index, updates) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    setItems(newItems);
    onChange?.({ ...block.content, items: newItems });
  };

  const addItem = (afterIndex) => {
    const newItems = [...items];
    newItems.splice(afterIndex + 1, 0, { text: '', checked: false });
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

    if (e.key === ' ' && e.target === e.currentTarget) {
      // Toggle checkbox on space when focused on item
    }

    onKeyDown?.(e);
  };

  return (
    <ul className="prose prose-neutral max-w-none space-y-1">
      {items.map((item, index) => (
        <li
          key={index}
          ref={(el) => { itemRefs.current[index] = el; }}
          className="group flex items-start gap-2 hover:bg-background-hover rounded-lg px-2 py-1"
        >
          {!readOnly && (
            <Tooltip content="Drag to reorder" position="left">
              <div className="block-handle mt-1 flex-shrink-0">
                <GripVertical className="w-4 h-4" />
              </div>
            </Tooltip>
          )}

          <button
            type="button"
            onClick={() => !readOnly && updateItem(index, { checked: !item.checked })}
            className={cn(
              'flex-shrink-0 mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-offset-1',
              item.checked
                ? 'bg-primary border-primary text-primary-foreground'
                : 'border-border-default hover:border-primary hover:bg-background-hover'
            )}
            disabled={readOnly}
            aria-checked={item.checked}
            aria-label={item.checked ? 'Mark incomplete' : 'Mark complete'}
          >
            {item.checked && <CheckSquare className="w-3.5 h-3.5" />}
            {!item.checked && <Square className="w-3.5 h-3.5" />}
          </button>

          <div
            ref={index === 0 ? ref : undefined}
            contentEditable={!readOnly}
            onInput={(e) => updateItem(index, { text: e.target.innerText })}
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
              item.checked && 'line-through text-foreground-tertiary',
              readOnly ? 'pointer-events-none' : ''
            )}
            data-placeholder="To-do item"
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

TodoBlock.displayName = 'TodoBlock';