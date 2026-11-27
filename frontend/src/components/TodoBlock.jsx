import { useState } from 'react';
import { CheckSquare, Square, Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from './ui/Button';

export function TodoBlock({ content, readOnly, onUpdate }) {
  const [items, setItems] = useState(content.items || [
    { id: '1', text: '', checked: false },
  ]);

  useEffect(() => {
    setItems(content.items || items);
  }, [content.items]);

  const updateContent = () => {
    onUpdate?.({ content: { ...content, items } });
  };

  const addItem = () => {
    const newItem = { id: Date.now().toString(), text: '', checked: false };
    setItems(prev => [...prev, newItem]);
  };

  const deleteItem = (itemId) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter(i => i.id !== itemId));
  };

  const toggleItem = (itemId) => {
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    ));
  };

  const updateItemText = (itemId, text) => {
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, text } : item
    ));
  };

  return (
    <div className="space-y-1">
      {items.map((item, index) => (
        <div key={item.id} className="flex items-start gap-2 px-3 py-1">
          {!readOnly && (
            <button
              className="flex-shrink-0 mt-1 p-1 text-foreground-muted hover:text-accent transition-colors"
              onClick={() => toggleItem(item.id)}
              aria-label={item.checked ? 'Отметить как невыполненное' : 'Отметить как выполненное'}
            >
              {item.checked ? (
                <CheckSquare className="h-5 w-5 text-accent" />
              ) : (
                <Square className="h-5 w-5" />
              )}
            </button>
          )}
          <input
            type="text"
            value={item.text}
            onChange={(e) => updateItemText(item.id, e.target.value)}
            readOnly={readOnly}
            className={`flex-1 px-2 py-1 text-body bg-transparent border-none outline-none ${item.checked ? 'line-through text-foreground-muted' : ''}`}
            placeholder="Пункт списка задач"
          />
          {!readOnly && (
            <button
              className="flex-shrink-0 p-1 text-foreground-muted hover:text-destructive transition-colors"
              onClick={() => deleteItem(item.id)}
              disabled={items.length <= 1}
              aria-label="Удалить пункт"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      {!readOnly && (
        <button
          onClick={addItem}
          className="flex items-center gap-2 px-3 py-2 text-sm text-foreground-muted hover:text-foreground transition-colors"
        >
          <Plus className="h-4 w-4" />
          Добавить задачу
        </button>
      )}
    </div>
  );
}

import { useEffect } from 'react';