import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { cn } from '../lib/utils';
import { ParagraphBlock } from './blocks/ParagraphBlock';
import { HeadingBlock } from './blocks/HeadingBlock';
import { ListBlock } from './blocks/ListBlock';
import { TodoBlock } from './blocks/TodoBlock';
import { CodeBlock } from './blocks/CodeBlock';
import { CalloutBlock } from './blocks/CalloutBlock';
import { QuoteBlock } from './blocks/QuoteBlock';
import { DividerBlock } from './blocks/DividerBlock';
import { ImageBlock } from './blocks/ImageBlock';
import { BookmarkBlock } from './blocks/BookmarkBlock';
import { TableBlock } from './blocks/TableBlock';
import { SlashMenu } from './SlashMenu';

const blockComponents = {
  paragraph: ParagraphBlock,
  heading1: HeadingBlock,
  heading2: HeadingBlock,
  heading3: HeadingBlock,
  bulleted_list: ListBlock,
  numbered_list: ListBlock,
  todo_list: TodoBlock,
  code: CodeBlock,
  callout: CalloutBlock,
  quote: QuoteBlock,
  divider: DividerBlock,
  image: ImageBlock,
  bookmark: BookmarkBlock,
  table: TableBlock
};

export const BlockRenderer = forwardRef((
  {
    block,
    index,
    readOnly = false,
    onChange,
    onFocus,
    onBlur,
    onKeyDown,
    showSlashMenu,
    onSlashMenuChange
  },
  ref
) => {
  const [slashMenuVisible, setSlashMenuVisible] = useState(false);
  const slashMenuRef = useRef(null);
  const blockRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focus: () => blockRef.current?.focus?.(),
    getElement: () => blockRef.current
  }));

  const Component = blockComponents[block.type] || ParagraphBlock;

  const handleChange = useCallback((newContent) => {
    onChange?.(block.id, newContent);
  }, [onChange, block.id]);

  const handleKeyDown = (e) => {
    onKeyDown?.(e);

    // Handle slash menu trigger
    if (e.key === '/' && !readOnly) {
      const selection = window.getSelection();
      if (selection && selection.anchorNode === blockRef.current?.querySelector('[contenteditable="true"]')) {
        const textBeforeCursor = selection.anchorNode.textContent?.slice(0, selection.anchorOffset) || '';
        if (textBeforeCursor.trim() === '' || textBeforeCursor.endsWith(' ')) {
          e.preventDefault();
          setSlashMenuVisible(true);
          onSlashMenuChange?.(true, '', {
            x: e.clientX,
            y: e.clientY + window.scrollY
          });
        }
      }
    }

    // Handle Enter for new block
    if (e.key === 'Enter' && !e.shiftKey && !readOnly) {
      const blockType = block.type;
      if (['paragraph', 'heading1', 'heading2', 'heading3', 'quote'].includes(blockType)) {
        const content = block.content?.text || '';
        if (content.trim() === '') {
          e.preventDefault();
          onChange?.(block.id, { type: 'paragraph', content: { text: '' } });
        }
      }
    }
  };

  const handleSlashMenuSelect = (blockType) => {
    onChange?.(block.id, { type: blockType, content: getDefaultContent(blockType) });
    setSlashMenuVisible(false);
    onSlashMenuChange?.(false);
  };

  return (
    <div
      ref={blockRef}
      data-block-id={block.id}
      className={cn('block group', readOnly && 'block-readonly')}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <Component
        block={block}
        readOnly={readOnly}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        ref={blockRef}
      />

      {/* Slash Menu */}
      {slashMenuVisible && !readOnly && (
        <SlashMenu
          ref={slashMenuRef}
          query=""
          onSelect={handleSlashMenuSelect}
          onClose={() => setSlashMenuVisible(false)}
          position={{ x: 0, y: 0 }}
        />
      )}
    </div>
  );
});

BlockRenderer.displayName = 'BlockRenderer';

function getDefaultContent(type) {
  switch (type) {
    case 'paragraph': return { text: '' };
    case 'heading1': return { text: '' };
    case 'heading2': return { text: '' };
    case 'heading3': return { text: '' };
    case 'bulleted_list': return { items: [{ text: '' }] };
    case 'numbered_list': return { items: [{ text: '' }] };
    case 'todo_list': return { items: [{ text: '', checked: false }] };
    case 'code': return { code: '', language: 'javascript' };
    case 'callout': return { type: 'info', text: '' };
    case 'quote': return { text: '' };
    case 'divider': return {};
    case 'image': return { url: '', caption: '' };
    case 'bookmark': return { url: '', title: '', description: '', image: '' };
    case 'table': return { rows: [['', ''], ['', '']] };
    case 'file': return { name: '', url: '', size: 0 };
    default: return { text: '' };
  }
}