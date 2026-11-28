import { forwardRef, useRef, useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Info, AlertTriangle, CheckCircle, XCircle, ChevronDown } from 'lucide-react';
import { Dropdown } from '../ui/Dropdown';
import { Tooltip } from '../ui/Tooltip';

const CALLOUT_TYPES = [
  { value: 'info', label: 'Info', icon: Info, bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-800 dark:text-blue-300', iconColor: 'text-blue-600 dark:text-blue-400' },
  { value: 'warning', label: 'Warning', icon: AlertTriangle, bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-800 dark:text-amber-300', iconColor: 'text-amber-600 dark:text-amber-400' },
  { value: 'success', label: 'Success', icon: CheckCircle, bg: 'bg-sage-50 dark:bg-sage-900/20', border: 'border-sage-200 dark:border-sage-800', text: 'text-sage-800 dark:text-sage-300', iconColor: 'text-sage-600 dark:text-sage-400' },
  { value: 'error', label: 'Error', icon: XCircle, bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-200 dark:border-rose-800', text: 'text-rose-800 dark:text-rose-300', iconColor: 'text-rose-600 dark:text-rose-400' }
];

export const CalloutBlock = forwardRef((
  { block, readOnly, onChange, onKeyDown },
  ref
) => {
  const editorRef = useRef(null);
  const calloutType = block.content?.type || 'info';
  const typeConfig = CALLOUT_TYPES.find(t => t.value === calloutType) || CALLOUT_TYPES[0];

  const handleInput = (e) => {
    const text = e.target.innerText;
    onChange?.({ ...block.content, text });
  };

  const handleTypeChange = (type) => {
    onChange?.({ ...block.content, type });
  };

  useEffect(() => {
    if (editorRef.current && block.content?.text !== editorRef.current.innerText) {
      editorRef.current.innerText = block.content?.text || '';
    }
  }, [block.content?.text]);

  return (
    <div
      className={cn(
        'prose prose-neutral max-w-none p-4 rounded-lg border',
        'focus-within:ring-2 focus-within:ring-primary-light focus-within:ring-offset-1',
        typeConfig.bg,
        typeConfig.border,
        typeConfig.text
      )}
    >
      <div className="flex items-start gap-3">
        <typeConfig.icon
          className={cn('w-5 h-5 flex-shrink-0 mt-0.5', typeConfig.iconColor)}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <div
            ref={editorRef}
            contentEditable={!readOnly}
            onInput={handleInput}
            onKeyDown={onKeyDown}
            onPaste={(e) => {
              e.preventDefault();
              const text = e.clipboardData.getData('text/plain');
              document.execCommand('insertText', false, text);
            }}
            className={cn(
              'min-h-[1.5rem] prose prose-neutral max-w-none',
              'focus:outline-none',
              'text-foreground-primary leading-relaxed',
              readOnly ? 'pointer-events-none' : ''
            )}
            data-placeholder="Callout text..."
            spellCheck={true}
            suppressContentEditableWarning
          >
            {block.content?.text}
          </div>
        </div>
        {!readOnly && (
          <Tooltip content="Change callout type" position="right">
            <Dropdown
              trigger={
                <button className="p-1.5 rounded hover:bg-black/10 hover:bg-white/10 transition-colors text-foreground-tertiary" aria-label="Change callout type">
                  <ChevronDown className="w-4 h-4" />
                </button>
              }
              items={CALLOUT_TYPES.map(t => ({
                label: t.label,
                icon: <t.icon className="w-4 h-4" />,
                onClick: () => handleTypeChange(t.value),
                shortcut: t.value === calloutType ? '✓' : ''
              }))}
            />
          </Tooltip>
        )}
      </div>
    </div>
  );
});

CalloutBlock.displayName = 'CalloutBlock';