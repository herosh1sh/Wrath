import { forwardRef, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';

export const ParagraphBlock = forwardRef((
  { block, readOnly, onChange, onKeyDown },
  ref
) => {
  const editorRef = useRef(null);

  const handleInput = (e) => {
    const text = e.target.innerText;
    onChange?.({ ...block.content, text });
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  useEffect(() => {
    if (editorRef.current && block.content?.text !== editorRef.current.innerText) {
      editorRef.current.innerText = block.content?.text || '';
    }
  }, [block.content?.text]);

  return (
    <p
      ref={editorRef}
      contentEditable={!readOnly}
      onInput={handleInput}
      onPaste={handlePaste}
      onKeyDown={onKeyDown}
      className={cn(
        'prose prose-neutral max-w-none min-h-[1.5rem]',
        'focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-offset-1 rounded',
        'text-foreground-primary leading-relaxed',
        readOnly ? 'pointer-events-none' : ''
      )}
      data-placeholder="Start writing..."
      spellCheck={true}
    />
  );
});

ParagraphBlock.displayName = 'ParagraphBlock';