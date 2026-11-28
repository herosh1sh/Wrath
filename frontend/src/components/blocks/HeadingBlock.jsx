import { forwardRef, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';

export const HeadingBlock = forwardRef((
  { block, readOnly, onChange, onKeyDown },
  ref
) => {
  const editorRef = useRef(null);
  const level = parseInt(block.type.replace('heading', '')) || 1;

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

  const tag = `h${level}`;

  return (
    <h1
      ref={editorRef}
      contentEditable={!readOnly}
      onInput={handleInput}
      onPaste={handlePaste}
      onKeyDown={onKeyDown}
      className={cn(
        'prose prose-neutral max-w-none',
        'focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-offset-1 rounded',
        'text-foreground-primary font-semibold',
        readOnly ? 'pointer-events-none' : '',
        level === 1 && 'text-3xl mb-4 mt-6',
        level === 2 && 'text-2xl mb-3 mt-5',
        level === 3 && 'text-xl mb-2 mt-4'
      )}
      data-placeholder={`Heading ${level}`}
      spellCheck={true}
    />
  );
});

HeadingBlock.displayName = 'HeadingBlock';