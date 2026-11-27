import { forwardRef, useImperativeHandle } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { BlockInput } from './BlockInput';
import { CodeBlock } from './CodeBlock';
import { ImageBlock } from './ImageBlock';
import { BookmarkBlock } from './BookmarkBlock';
import { TableBlock } from './TableBlock';
import { TodoBlock } from './TodoBlock';
import { CalloutBlock } from './CalloutBlock';

export const BlockRenderer = forwardRef(({ block, selected, readOnly, onUpdate, onDelete, onAddAfter, onKeyDown, children }, ref) => {
  const elementRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focus: () => elementRef.current?.focus(),
    getElement: () => elementRef.current,
  }), []);

  const renderContent = () => {
    switch (block.type) {
      case 'heading1':
        return <h1 className="text-heading-1 font-heading font-semibold">{block.content.text || ''}</h1>;
      case 'heading2':
        return <h2 className="text-heading-2 font-heading font-semibold">{block.content.text || ''}</h2>;
      case 'heading3':
        return <h3 className="text-heading-3 font-heading font-medium">{block.content.text || ''}</h3>;
      case 'paragraph':
        return (
          <p className="text-body">
            {block.content.text ? (
              marked.parseInline(block.content.text)
            ) : (
              <span className="text-foreground-muted">Пусто</span>
            )}
          </p>
        );
      case 'bulletedList':
        return (
          <ul className="list-disc pl-6 space-y-1">
            {block.content.items?.map((item, i) => (
              <li key={i} className="text-body">{item}</li>
            ))}
          </ul>
        );
      case 'numberedList':
        return (
          <ol className="list-decimal pl-6 space-y-1">
            {block.content.items?.map((item, i) => (
              <li key={i} className="text-body">{item}</li>
            ))}
          </ol>
        );
      case 'quote':
        return (
          <blockquote className="border-l-2 border-accent pl-4 italic text-foreground-muted">
            {block.content.text || ''}
          </blockquote>
        );
      case 'code':
        return <CodeBlock content={block.content} readOnly={readOnly} onUpdate={onUpdate} />;
      case 'divider':
        return <hr className="border-border my-4" />;
      case 'image':
        return <ImageBlock content={block.content} readOnly={readOnly} onUpdate={onUpdate} />;
      case 'bookmark':
        return <BookmarkBlock content={block.content} readOnly={readOnly} onUpdate={onUpdate} />;
      case 'table':
        return <TableBlock content={block.content} readOnly={readOnly} onUpdate={onUpdate} />;
      case 'todo':
        return <TodoBlock content={block.content} readOnly={readOnly} onUpdate={onUpdate} />;
      case 'callout':
        return <CalloutBlock content={block.content} readOnly={readOnly} onUpdate={onUpdate} />;
      default:
        return <p className="text-body">{block.content.text || ''}</p>;
    }
  };

  return (
    <div ref={elementRef} className="relative">
      {!readOnly && block.type !== 'divider' && block.type !== 'table' && block.type !== 'image' && block.type !== 'bookmark' && block.type !== 'code' && block.type !== 'todo' && block.type !== 'callout' ? (
        <BlockInput
          block={block}
          selected={selected}
          onUpdate={onUpdate}
          onKeyDown={onKeyDown}
          onAddAfter={onAddAfter}
          onDelete={onDelete}
        />
      ) : (
        <div
          className={`min-h-[28px] px-3 py-1.5 ${selected ? 'bg-muted' : ''}`}
          onKeyDown={onKeyDown}
          tabIndex={0}
        >
          {renderContent()}
        </div>
      )}
    </div>
  );
});

import { useRef } from 'react';

BlockRenderer.displayName = 'BlockRenderer';