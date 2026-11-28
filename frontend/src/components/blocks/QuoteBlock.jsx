import { forwardRef, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';

export const QuoteBlock = forwardRef((
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
    <blockquote
      className={cn(
        'prose prose-neutral max-w-none border-l-4 pl-4 italic',
        'border-border-default text-foreground-secondary',
        'focus-within:ring-2 focus-within:ring-primary-light focus-within:ring-offset-1 rounded-r',
        'my-4'
      )}
    >
      <p
        ref={editorRef}
        contentEditable={!readOnly}
        onInput={handleInput}
        onKeyDown={onKeyDown}
        onPaste={handlePaste}
        className={cn(
          'min-h-[1.5rem] prose prose-neutral max-w-none m-0',
          'focus:outline-none',
          'leading-relaxed',
          readOnly ? 'pointer-events-none' : ''
        )}
        data-placeholder="Quote..."
        spellCheck={true}
        suppressContentEditableWarning
      >
        {block.content?.text}
      </p>
    </blockquote>
  );
});

QuoteBlock.displayName = 'QuoteBlock';