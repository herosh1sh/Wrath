import { useState, useRef, useEffect, useCallback, Fragment } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { GripVertical, Plus, Trash2, MoreVertical, Type, Code, Quote, List, ListOrdered, CheckSquare, Heading1, Heading2, Heading3, Image, Link as LinkIcon, Table, Divider, X } from 'lucide-react';
import { blocksApi } from '../lib/api';
import { SlashMenu } from './SlashMenu';
import { InlineToolbar } from './InlineToolbar';
import { BlockRenderer } from './BlockRenderer';
import { BlockInput } from './BlockInput';
import { useSocket } from '../contexts/SocketContext';

const BLOCK_TYPES = [
  { type: 'paragraph', label: 'Текст', icon: Type, shortcut: '' },
  { type: 'heading1', label: 'Заголовок 1', icon: Heading1, shortcut: '# ' },
  { type: 'heading2', label: 'Заголовок 2', icon: Heading2, shortcut: '## ' },
  { type: 'heading3', label: 'Заголовок 3', icon: Heading3, shortcut: '### ' },
  { type: 'bulletedList', label: 'Маркированный список', icon: List, shortcut: '- ' },
  { type: 'numberedList', label: 'Нумерованный список', icon: ListOrdered, shortcut: '1. ' },
  { type: 'todo', label: 'Список задач', icon: CheckSquare, shortcut: '[] ' },
  { type: 'quote', label: 'Цитата', icon: Quote, shortcut: '> ' },
  { type: 'code', label: 'Блок кода', icon: Code, shortcut: '```' },
  { type: 'divider', label: 'Разделитель', icon: Divider, shortcut: '---' },
  { type: 'image', label: 'Изображение', icon: Image, shortcut: '' },
  { type: 'bookmark', label: 'Закладка', icon: LinkIcon, shortcut: '' },
  { type: 'table', label: 'Таблица', icon: Table, shortcut: '' },
];

export function BlockEditor({ pageId, initialContent = [], onContentChange, readOnly = false }) {
  const { on } = useSocket();
  const [blocks, setBlocks] = useState(initialContent);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 });
  const [inlineToolbar, setInlineToolbar] = useState(null);
  const editorRef = useRef(null);
  const blockRefs = useRef({});

  // Initialize blocks
  useEffect(() => {
    setBlocks(initialContent.map((block, index) => ({
      ...block,
      id: block.id || uuidv4(),
      position: block.position ?? index,
    })));
  }, [initialContent]);

  // Socket listeners for real-time updates
  useEffect(() => {
    const unsubBlockCreated = on('block:created', (block) => {
      setBlocks(prev => [...prev, block].sort((a, b) => a.position - b.position));
    });

    const unsubBlockUpdated = on('block:updated', (block) => {
      setBlocks(prev => prev.map(b => b.id === block.id ? block : b).sort((a, b) => a.position - b.position));
    });

    const unsubBlockDeleted = on('block:deleted', ({ id }) => {
      setBlocks(prev => prev.filter(b => b.id !== id));
    });

    const unsubBlocksReordered = on('blocks:reordered', (newBlocks) => {
      setBlocks(newBlocks);
    });

    return () => {
      unsubBlockCreated();
      unsubBlockUpdated();
      unsubBlockDeleted();
      unsubBlocksReordered();
    };
  }, [on]);

  // Notify parent of changes
  useEffect(() => {
    if (onContentChange) {
      onContentChange(blocks);
    }
  }, [blocks, onContentChange]);

  const handleBlockUpdate = useCallback((id, updates) => {
    setBlocks(prev => prev.map(block =>
      block.id === id ? { ...block, ...updates } : block
    ));
  }, []);

  const handleBlockDelete = useCallback(async (id) => {
    const block = blocks.find(b => b.id === id);
    if (!block) return;

    // Optimistic delete
    setBlocks(prev => prev.filter(b => b.id !== id));

    try {
      await blocksApi.delete(id);
    } catch (err) {
      console.error('Failed to delete block:', err);
      // Revert on error
      setBlocks(prev => [...prev, block].sort((a, b) => a.position - b.position));
    }
  }, [blocks]);

  const handleBlockMove = useCallback((id, newPosition, newParentId = null) => {
    setBlocks(prev => {
      const blockIndex = prev.findIndex(b => b.id === id);
      if (blockIndex === -1) return prev;

      const block = prev[blockIndex];
      const newBlocks = [...prev];
      newBlocks.splice(blockIndex, 1);
      newBlocks.splice(newPosition, 0, { ...block, position: newPosition, parentBlockId: newParentId });

      // Recalculate positions
      return newBlocks.map((b, i) => ({ ...b, position: i }));
    });
  }, []);

  const handleDragStart = useCallback((e, id) => {
    if (readOnly) return;
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.target.classList.add('block-selected');
  }, [readOnly]);

  const handleDragOver = useCallback((e, id) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e, targetId) => {
    e.preventDefault();
    if (!draggingId || draggingId === targetId) return;

    const blocksArray = [...blocks];
    const dragIndex = blocksArray.findIndex(b => b.id === draggingId);
    const targetIndex = blocksArray.findIndex(b => b.id === targetId);

    if (dragIndex === -1 || targetIndex === -1) return;

    const [draggedBlock] = blocksArray.splice(dragIndex, 1);
    blocksArray.splice(targetIndex, 0, draggedBlock);

    setBlocks(blocksArray.map((b, i) => ({ ...b, position: i })));
    setDraggingId(null);
  }, [blocks, draggingId]);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
  }, []);

  const handleKeyDown = useCallback((e, blockId, index) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    // Handle slash command
    if (e.key === '/' && !slashMenuOpen) {
      const selection = window.getSelection();
      if (selection.anchorOffset === 0 && selection.focusOffset === 0) {
        e.preventDefault();
        const blockRef = blockRefs.current[blockId];
        if (blockRef) {
          const rect = blockRef.getBoundingClientRect();
          const editorRect = editorRef.current?.getBoundingClientRect();
          if (editorRect) {
            setSlashMenuPosition({
              x: rect.left - editorRect.left,
              y: rect.bottom - editorRect.top + 4,
            });
            setSlashMenuOpen(true);
          }
        }
      }
    }

    // Handle markdown shortcuts
    if (e.key === 'Enter' && !e.shiftKey) {
      const shortcut = BLOCK_TYPES.find(t => t.shortcut && block.content?.text?.startsWith(t.shortcut));
      if (shortcut) {
        e.preventDefault();
        const newBlock = {
          id: uuidv4(),
          type: shortcut.type,
          content: { text: '' },
          position: index + 1,
        };
        setBlocks(prev => {
          const newBlocks = [...prev];
          newBlocks.splice(index + 1, 0, newBlock);
          return newBlocks.map((b, i) => ({ ...b, position: i }));
        });
        setSelectedBlockId(newBlock.id);
      }
    }

    // Handle backspace at start of block to merge with previous
    if (e.key === 'Backspace') {
      const selection = window.getSelection();
      if (selection.anchorOffset === 0 && selection.focusOffset === 0 && index > 0) {
        const prevBlock = blocks[index - 1];
        if (prevBlock.type === block.type && prevBlock.type !== 'code') {
          e.preventDefault();
          handleBlockUpdate(prevBlock.id, {
            content: { ...prevBlock.content, text: prevBlock.content.text + block.content.text },
          });
          handleBlockDelete(blockId);
        }
      }
    }
  }, [blocks, slashMenuOpen, handleBlockUpdate, handleBlockDelete]);

  const handleSlashMenuSelect = useCallback((blockType) => {
    const block = blocks.find(b => b.id === selectedBlockId);
    if (!block) return;

    const blockIndex = blocks.findIndex(b => b.id === selectedBlockId);
    const newBlock = {
      id: uuidv4(),
      type: blockType.type,
      content: blockType.defaultContent || { text: '' },
      position: blockIndex + 1,
    };

    setBlocks(prev => {
      const newBlocks = [...prev];
      newBlocks.splice(blockIndex + 1, 0, newBlock);
      return newBlocks.map((b, i) => ({ ...b, position: i }));
    });

    setSlashMenuOpen(false);
    setSelectedBlockId(newBlock.id);
  }, [blocks, selectedBlockId]);

  const handleAddBlock = useCallback((afterId) => {
    const index = blocks.findIndex(b => b.id === afterId);
    const newBlock = {
      id: uuidv4(),
      type: 'paragraph',
      content: { text: '' },
      position: index + 1,
    };

    setBlocks(prev => {
      const newBlocks = [...prev];
      newBlocks.splice(index + 1, 0, newBlock);
      return newBlocks.map((b, i) => ({ ...b, position: i }));
    });

    setSelectedBlockId(newBlock.id);
  }, [blocks]);

  const renderBlock = useCallback((block, index) => {
    const isSelected = selectedBlockId === block.id;
    const isDragging = draggingId === block.id;

    return (
      <Fragment key={block.id}>
        <div
          ref={(el) => { blockRefs.current[block.id] = el; }}
          className={`block ${isSelected ? 'block-selected' : ''} ${isDragging ? 'opacity-50' : ''}`}
          draggable={!readOnly}
          onDragStart={(e) => handleDragStart(e, block.id)}
          onDragOver={(e) => handleDragOver(e, block.id)}
          onDrop={(e) => handleDrop(e, block.id)}
          onDragEnd={handleDragEnd}
          onClick={() => setSelectedBlockId(block.id)}
        >
          {!readOnly && (
            <button
              className="block-drag-handle absolute left-0 top-1/2 -translate-y-1/2 -ml-8 flex h-6 w-6 items-center justify-center text-foreground-muted hover:text-foreground transition-colors"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              aria-label="Перетащите для изменения порядка"
            >
              <GripVertical className="h-5 w-5" />
            </button>
          )}

          <BlockRenderer
            block={block}
            selected={isSelected}
            readOnly={readOnly}
            onUpdate={handleBlockUpdate}
            onDelete={handleBlockDelete}
            onAddAfter={handleAddBlock}
            onKeyDown={(e) => handleKeyDown(e, block.id, index)}
            ref={blockRefs.current[block.id]}
          />

          {!readOnly && (
            <button
              className="absolute right-0 top-1/2 -translate-y-1/2 -mr-8 flex h-6 w-6 items-center justify-center text-foreground-muted hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedBlockId(block.id);
              }}
              aria-label="Параметры блока"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Add block button between blocks */}
        {!readOnly && index < blocks.length - 1 && (
          <button
            onClick={() => handleAddBlock(block.id)}
            className="flex items-center justify-center py-2 text-foreground-muted hover:text-foreground transition-colors"
            aria-label="Добавить блок"
          >
            <Plus className="h-5 w-5 opacity-50 hover:opacity-100" />
          </button>
        )}
      </Fragment>
    );
  }, [blocks, selectedBlockId, draggingId, readOnly, handleDragStart, handleDragOver, handleDrop, handleDragEnd, handleKeyDown, handleBlockUpdate, handleBlockDelete, handleAddBlock]);

  return (
    <div
      ref={editorRef}
      className="relative max-w-3xl mx-auto"
      role="textbox"
      aria-multiline="true"
    >
      {blocks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Type className="h-12 w-12 text-foreground-muted/50 mb-4" />
          <p className="text-foreground-muted">Начните вводить текст или нажмите <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded-sm">/</kbd> для команд</p>
        </div>
      ) : (
        blocks.map((block, index) => renderBlock(block, index))
      )}

      {/* Slash menu */}
      <SlashMenu
        isOpen={slashMenuOpen}
        position={slashMenuPosition}
        onClose={() => setSlashMenuOpen(false)}
        onSelect={handleSlashMenuSelect}
        blockTypes={BLOCK_TYPES}
      />

      {/* Inline toolbar */}
      {inlineToolbar && (
        <InlineToolbar
          position={inlineToolbar.position}
          selection={inlineToolbar.selection}
          onClose={() => setInlineToolbar(null)}
        />
      )}
    </div>
  );
}