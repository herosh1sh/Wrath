import { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bold, Italic, Underline, Strikethrough, Code, Link, Type, Heading1, Heading2, Heading3, List, ListOrdered, Quote, X } from 'lucide-react';

const FORMAT_BUTTONS = [
  { icon: Bold, label: 'Жирный', shortcut: '⌘B', format: 'bold' },
  { icon: Italic, label: 'Курсив', shortcut: '⌘I', format: 'italic' },
  { icon: Underline, label: 'Подчеркнутый', shortcut: '⌘U', format: 'underline' },
  { icon: Strikethrough, label: 'Зачеркнутый', shortcut: '⌘⇧X', format: 'strikethrough' },
  { icon: Code, label: 'Моноширинный', shortcut: '⌘E', format: 'code' },
  { icon: Link, label: 'Ссылка', shortcut: '⌘K', format: 'link' },
];

const BLOCK_BUTTONS = [
  { icon: Type, label: 'Текст', format: 'paragraph' },
  { icon: Heading1, label: 'Заголовок 1', format: 'heading1' },
  { icon: Heading2, label: 'Заголовок 2', format: 'heading2' },
  { icon: Heading3, label: 'Заголовок 3', format: 'heading3' },
  { icon: List, label: 'Маркированный список', format: 'bulletedList' },
  { icon: ListOrdered, label: 'Нумерованный список', format: 'numberedList' },
  { icon: Quote, label: 'Цитата', format: 'quote' },
];

export function InlineToolbar({ position, selection, onClose }) {
  const toolbarRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const applyFormat = (format) => {
    if (!selection) return;

    const { anchorNode, anchorOffset, focusNode, focusOffset } = selection;
    if (anchorNode !== focusNode) return;

    const text = anchorNode.textContent;
    const start = Math.min(anchorOffset, focusOffset);
    const end = Math.max(anchorOffset, focusOffset);
    const selectedText = text.substring(start, end);

    if (!selectedText) return;

    let formattedText = selectedText;
    switch (format) {
      case 'bold': formattedText = `**${selectedText}**`; break;
      case 'italic': formattedText = `*${selectedText}*`; break;
      case 'underline': formattedText = `<u>${selectedText}</u>`; break;
      case 'strikethrough': formattedText = `~~${selectedText}~~`; break;
      case 'code': formattedText = `\`${selectedText}\``; break;
      case 'link': {
        const url = prompt('Введите URL:');
        if (url) formattedText = `[${selectedText}](${url})`;
        break;
      }
    }

    // Replace text in the textarea
    const textarea = anchorNode.parentElement?.querySelector('textarea');
    if (textarea) {
      const currentValue = textarea.value;
      const newValue = currentValue.substring(0, start) + formattedText + currentValue.substring(end);
      textarea.value = newValue;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    onClose();
  };

  const changeBlockType = (blockType) => {
    // This would need to communicate with the BlockEditor
    console.log('Change block type to:', blockType);
    onClose();
  };

  return createPortal(
    <div
      ref={toolbarRef}
      className="inline-toolbar"
      style={{ left: position.x, top: position.y }}
      role="menu"
    >
      <div className="flex items-center gap-1 border-r border-border pr-2 mr-2">
        {FORMAT_BUTTONS.map(btn => (
          <button
            key={btn.format}
            onClick={() => applyFormat(btn.format)}
            className="inline-toolbar-btn"
            aria-label={`${btn.label} (${btn.shortcut})`}
            title={`${btn.label} (${btn.shortcut})`}
          >
            <btn.icon className="h-4 w-4" />
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        {BLOCK_BUTTONS.map(btn => (
          <button
            key={btn.format}
            onClick={() => changeBlockType(btn.format)}
            className="inline-toolbar-btn"
            aria-label={btn.label}
            title={btn.label}
          >
            <btn.icon className="h-4 w-4" />
          </button>
        ))}
        <button
          onClick={onClose}
          className="inline-toolbar-btn ml-1"
          aria-label="Закрыть панель инструментов"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>,
    document.body
  );
}