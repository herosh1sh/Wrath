import { useState } from 'react';
import { Info, AlertTriangle, CheckCircle, AlertCircle, HelpCircle, X, MoreVertical } from 'lucide-react';
import { Button } from './ui/Button';
import { Dropdown, DropdownItem } from './ui/Dropdown';

const CALLOUT_TYPES = [
  { type: 'default', icon: Info, label: 'Обычный', color: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400' },
  { type: 'info', icon: Info, label: 'Информация', color: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400' },
  { type: 'warning', icon: AlertTriangle, label: 'Предупреждение', color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400' },
  { type: 'success', icon: CheckCircle, label: 'Успех', color: 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' },
  { type: 'danger', icon: AlertCircle, label: 'Опасность', color: 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400' },
  { type: 'help', icon: HelpCircle, label: 'Помощь', color: 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400' },
];

export function CalloutBlock({ content, readOnly, onUpdate }) {
  const [calloutType, setCalloutType] = useState(content.calloutType || 'default');
  const [text, setText] = useState(content.text || '');
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  useEffect(() => {
    setCalloutType(content.calloutType || 'default');
    setText(content.text || '');
  }, [content.calloutType, content.text]);

  const currentType = CALLOUT_TYPES.find(t => t.type === calloutType) || CALLOUT_TYPES[0];
  const Icon = currentType.icon;

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);
    onUpdate?.({ content: { ...content, text: newText, calloutType } });
  };

  const handleTypeChange = (type) => {
    setCalloutType(type);
    onUpdate?.({ content: { ...content, calloutType: type, text } });
    setShowTypeMenu(false);
  };

  return (
    <div className={`relative rounded-md border p-4 ${currentType.color}`}>
      {!readOnly && (
        <div className="absolute top-2 right-2 flex gap-1">
          <Dropdown
            trigger={({ open, onClick }) => (
              <button
                onClick={onClick}
                className="btn-icon text-foreground-muted hover:text-foreground"
                aria-label="Сменить тип блока"
                aria-expanded={open}
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            )}
          >
            {CALLOUT_TYPES.map(type => (
              <DropdownItem
                key={type.type}
                onClick={() => handleTypeChange(type.type)}
                className={calloutType === type.type ? 'bg-accent/10' : ''}
              >
                <type.icon className="h-4 w-4" style={{ color: type.color.split(' ')[2] }} />
                {type.label}
              </DropdownItem>
            ))}
          </Dropdown>
        </div>
      )}
      <div className="flex gap-3">
        <Icon className="flex-shrink-0 mt-0.5 h-5 w-5" />
        <textarea
          value={text}
          onChange={handleTextChange}
          readOnly={readOnly}
          className="flex-1 min-h-[60px] px-2 py-1 text-body bg-transparent border-none outline-none resize-none"
          placeholder="Содержимое выноски..."
          style={{ lineHeight: '1.6' }}
        />
      </div>
    </div>
  );
}