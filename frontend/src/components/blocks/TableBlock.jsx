import { forwardRef, useRef, useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { Dropdown } from '../ui/Dropdown';

export const TableBlock = forwardRef((
  { block, readOnly, onChange, onKeyDown },
  ref
) => {
  const [rows, setRows] = useState(block.content?.rows || [['', ''], ['', '']]);
  const cellRefs = useRef({});

  useEffect(() => {
    if (block.content?.rows) {
      setRows(block.content.rows);
    }
  }, [block.content?.rows]);

  const updateCell = (rowIndex, colIndex, value) => {
    const newRows = rows.map((row, rIdx) =>
      rIdx === rowIndex
        ? row.map((cell, cIdx) => (cIdx === colIndex ? value : cell))
        : row
    );
    setRows(newRows);
    onChange?.({ ...block.content, rows: newRows });
  };

  const addRow = (afterIndex = -1) => {
    const newRows = [...rows];
    const emptyRow = new Array(rows[0]?.length || 2).fill('');
    newRows.splice(afterIndex + 1, 0, emptyRow);
    setRows(newRows);
    onChange?.({ ...block.content, rows: newRows });
  };

  const deleteRow = (index) => {
    if (rows.length <= 1) return;
    const newRows = rows.filter((_, i) => i !== index);
    setRows(newRows);
    onChange?.({ ...block.content, rows: newRows });
  };

  const addColumn = () => {
    const newRows = rows.map(row => [...row, '']);
    setRows(newRows);
    onChange?.({ ...block.content, rows: newRows });
  };

  const deleteColumn = (index) => {
    if (rows[0]?.length <= 1) return;
    const newRows = rows.map(row => row.filter((_, i) => i !== index));
    setRows(newRows);
    onChange?.({ ...block.content, rows: newRows });
  };

  const handleKeyDown = (e, rowIndex, colIndex) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const nextCol = colIndex + 1;
      if (nextCol < rows[rowIndex].length) {
        cellRefs.current[`${rowIndex}-${nextCol}`]?.focus();
      } else if (rowIndex + 1 < rows.length) {
        cellRefs.current[`${rowIndex + 1}-0`]?.focus();
      } else {
        addRow(rowIndex);
        setTimeout(() => {
          cellRefs.current[`${rowIndex + 1}-0`]?.focus();
        }, 0);
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addRow(rowIndex);
      setTimeout(() => {
        cellRefs.current[`${rowIndex + 1}-${colIndex}`]?.focus();
      }, 0);
    }

    onKeyDown?.(e);
  };

  return (
    <div className="prose prose-neutral max-w-none my-4 overflow-x-auto">
      <div className="relative group">
        <table className="w-full border-collapse border border-border-light rounded-lg overflow-hidden">
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className={cn('border-border-light', rowIndex === 0 && 'bg-background-tertiary')}>
                {row.map((cell, colIndex) => (
                  <td
                    key={colIndex}
                    ref={(el) => { cellRefs.current[`${rowIndex}-${colIndex}`] = el; }}
                    contentEditable={!readOnly}
                    onInput={(e) => updateCell(rowIndex, colIndex, e.target.innerText)}
                    onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                    onPaste={(e) => {
                      e.preventDefault();
                      const text = e.clipboardData.getData('text/plain');
                      document.execCommand('insertText', false, text);
                    }}
                    className={cn(
                      'px-3 py-2 min-w-[100px] min-h-[2.5rem] border-r border-border-light',
                      'focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-offset-1',
                      'prose prose-neutral max-w-none',
                      'text-foreground-primary',
                      rowIndex === 0 && 'font-semibold',
                      readOnly ? 'pointer-events-none' : ''
                    )}
                    data-placeholder=""
                    spellCheck={true}
                    suppressContentEditableWarning
                    style={{ outline: 'none' }}
                  >
                    {cell}
                  </td>
                ))}
                {!readOnly && (
                  <td className="w-10 border-r-0 text-center">
                    <Tooltip content="Row options" position="right">
                      <Dropdown
                        trigger={
                          <button className="p-1 rounded hover:bg-background-hover text-foreground-tertiary opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Row options">
                            <GripVertical className="w-4 h-4" />
                          </button>
                        }
                        items={[
                          { label: 'Add row below', icon: <Plus className="w-4 h-4" />, onClick: () => addRow(rowIndex), shortcut: '' },
                          { label: 'Delete row', icon: <Trash2 className="w-4 h-4" />, onClick: () => deleteRow(rowIndex), shortcut: '', className: 'text-error' }
                        ]}
                      />
                    </Tooltip>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {!readOnly && (
          <div className="absolute bottom-0 right-0 m-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Tooltip content="Add column" position="top">
              <button
                onClick={addColumn}
                className="p-2 bg-background-primary/90 backdrop-blur rounded hover:bg-background-hover transition-colors"
                aria-label="Add column"
              >
                <Plus className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
});

TableBlock.displayName = 'TableBlock';