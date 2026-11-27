import { useRef, useEffect, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

export function BlockInput({ block, selected, onUpdate, onKeyDown, onAddAfter, onDelete }) {
  const textareaRef = useRef(null);
  const [text, setText] = useState(block.content.text || '');
  const [showMarkdown, setShowMarkdown] = useState(false);

  useEffect(() => {
    setText(block.content.text || '');
  }, [block.content.text]);

  useEffect(() => {
    if (selected && textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
    }
  }, [selected]);

  const handleInput = (e) => {
    const newText = e.target.value;
    setText(newText);
    onUpdate(block.id, { content: { ...block.content, text: newText } });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (text.trim() === '') {
        e.preventDefault();
        onDelete(block.id);
        return;
      }
      // Create new block after this one
      onAddAfter(block.id);
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newText = text.substring(0, start) + '  ' + text.substring(end);
      setText(newText);
      onUpdate(block.id, { content: { ...block.content, text: newText } });
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(start + 2, start + 2);
        }
      }, 0);
    }

    onKeyDown(e);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text/plain');
    const start = e.target.selectionStart;
    const end = e.target.selectionEnd;
    const newText = text.substring(0, start) + pastedText + text.substring(end);
    setText(newText);
    onUpdate(block.id, { content: { ...block.content, text: newText } });
  };

  // Render markdown preview
  const previewContent = marked.parse(text || '');

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className="w-full min-h-[28px] px-3 py-1.5 bg-transparent border-none resize-none outline-none text-body font-body"
        placeholder={block.type === 'heading1' ? 'Заголовок 1' : block.type === 'heading2' ? 'Заголовок 2' : block.type === 'heading3' ? 'Заголовок 3' : 'Начните вводить текст...'}
        spellCheck={true}
        style={{ lineHeight: '1.6' }}
      />
      {showMarkdown && text && (
        <div
          className="absolute inset-0 px-3 py-1.5 prose prose-sm max-w-none pointer-events-none"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewContent) }}
        />
      )}
    </div>
  );
}