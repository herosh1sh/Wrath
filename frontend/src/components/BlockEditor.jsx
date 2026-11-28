import { useState, useRef, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { cn } from '../lib/utils';
import { BlockRenderer } from './BlockRenderer';
import { SlashMenu } from './SlashMenu';
import { BLOCK_TYPES, getBlockTypeIcon } from '../lib/utils';
import { Plus, GripVertical, Trash2, Copy, MoreHorizontal } from 'lucide-react';
import { Tooltip } from './ui/Tooltip';
import { Dropdown } from './ui/Dropdown';

export function BlockEditor({
  blocks,
  onChange,
  pageId,
  readOnly = false,
  blockRefs
}) {
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 });
  const [slashMenuQuery, setSlashMenuQuery] = useState('');
  const [focusedBlockId, setFocusedBlockId] = useState(null);
  const editorRef = useRef(null);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index && result.destination.droppableId === result.source.droppableId) return;

    const newBlocks = Array.from(blocks);
    const [removed] = newBlocks.splice(result.source.index, 1);
    newBlocks.splice(result.destination.index, 0, removed);

    // Update positions
    newBlocks.forEach((block, index) => {
      block.position = index;
    });

    onChange(newBlocks);
  };

  const addBlock = (type, afterIndex = -1) => {
    const newBlock = {
      id: crypto.randomUUID(),
      type,
      content: getDefaultContent(type),
      position: afterIndex + 1
    };

    const newBlocks = Array.from(blocks);
    newBlocks.splice(afterIndex + 1, 0, newBlock);
    newBlocks.forEach((block, index) => block.position = index);
    onChange(newBlocks);

    // Focus the new block
    setTimeout(() => {
      const element = document.querySelector(`[data-block-id="${newBlock.id}"]`);
      element?.focus();
    }, 0);
  };

  const deleteBlock = (blockId) => {
    const newBlocks = blocks.filter(b => b.id !== blockId);
    newBlocks.forEach((block, index) => block.position = index);
    onChange(newBlocks);
  };

  const duplicateBlock = (blockId) => {
    const index = blocks.findIndex(b => b.id === blockId);
    if (index === -1) return;

    const block = blocks[index];
    const newBlock = {
      ...block,
      id: crypto.randomUUID(),
      position: index + 1
    };

    const newBlocks = Array.from(blocks);
    newBlocks.splice(index + 1, 0, newBlock);
    newBlocks.forEach((b, i) => b.position = i);
    onChange(newBlocks);
  };

  const handleKeyDown = (e, blockId, index) => {
    if (e.key === '/' && e.target.textContent === '') {
      e.preventDefault();
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSlashMenuPosition({ x: rect.left, y: rect.bottom + window.scrollY });
        setSlashMenuQuery('');
        setSlashMenuOpen(true);
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      const block = blocks.find(b => b.id === blockId);
      if (block && block.type === 'paragraph' && block.content.text === '') {
        e.preventDefault();
        addBlock('paragraph', index);
      }
    }

    if (e.key === 'Backspace' && e.target.textContent === '') {
      const block = blocks.find(b => b.id === blockId);
      if (block && block.type === 'paragraph' && blocks.length > 1) {
        e.preventDefault();
        deleteBlock(blockId);
      }
    }
  };

  const filteredBlockTypes = BLOCK_TYPES.filter(bt =>
    bt.label.toLowerCase().includes(slashMenuQuery.toLowerCase())
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="blocks">
        {(provided, snapshot) => (
          <div
            ref={(el) => {
              editorRef.current = el;
              provided.innerRef(el);
            }}
            {...provided.droppableProps}
            className={cn('flex flex-col gap-2', snapshot.isDraggingOver && 'bg-primary-light/20')}
            data-editor="true"
          >
            {blocks.map((block, index) => (
              <Draggable key={block.id} draggableId={block.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={cn('relative', snapshot.isDragging && 'block-dragging')}
                  >
                    {/* Drag handle */}
                    {!readOnly && (
                      <Tooltip content="Drag to reorder" position="left">
                        <div
                          {...provided.dragHandleProps}
                          className="block-handle"
                          aria-label="Drag to reorder"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>
                      </Tooltip>
                    )}

                    {/* Block renderer */}
                    <BlockRenderer
                      block={block}
                      index={index}
                      readOnly={readOnly}
                      onChange={onChange}
                      onFocus={() => setFocusedBlockId(block.id)}
                      onBlur={() => setFocusedBlockId(null)}
                      onKeyDown={(e) => handleKeyDown(e, block.id, index)}
                      showSlashMenu={slashMenuOpen && focusedBlockId === block.id}
                      onSlashMenuChange={(open, query, pos) => {
                        if (open !== undefined) setSlashMenuOpen(open);
                        if (query !== undefined) setSlashMenuQuery(query);
                        if (pos !== undefined) setSlashMenuPosition(pos);
                      }}
                      ref={(el) => { if (el) blockRefs.current[block.id] = el; }}
                    />

                    {/* Block menu */}
                    {!readOnly && (
                      <Tooltip content="Block options" position="right">
                        <Dropdown
                          trigger={
                            <button className="p-1 rounded hover:bg-background-hover text-foreground-tertiary opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Block options">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          }
                          items={[
                            { label: 'Duplicate', icon: <Copy className="w-4 h-4" />, onClick: () => duplicateBlock(block.id), shortcut: '' },
                            { label: 'Delete', icon: <Trash2 className="w-4 h-4" />, onClick: () => deleteBlock(block.id), shortcut: '', className: 'text-error' }
                          ]}
                        />
                      </Tooltip>
                    )}

                    {/* Add block button between blocks */}
                    {!readOnly && index === blocks.length - 1 && (
                      <button
                        onClick={() => addBlock('paragraph', index)}
                        className="w-full flex items-center justify-center gap-2 py-3 text-foreground-tertiary hover:text-primary hover:bg-background-hover rounded-lg transition-colors border border-dashed border-border-light"
                        type="button"
                      >
                        <Plus className="w-5 h-5" />
                        <span className="text-sm">Add block</span>
                      </button>
                    )}
                  </div>
                )}
              </Draggable>
            ))}

            {blocks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center text-foreground-tertiary">
                <Plus className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg">Start writing...</p>
                <p className="text-sm mt-1">Type / for blocks, or just start typing</p>
              </div>
            )}

            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}

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