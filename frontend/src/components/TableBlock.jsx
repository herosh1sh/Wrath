import { useState } from 'react';
import { Plus, Trash2, GripVertical, MoreVertical } from 'lucide-react';
import { Button } from './ui/Button';
import { Dropdown, DropdownItem, DropdownSeparator } from './ui/Dropdown';

export function TableBlock({ content, readOnly, onUpdate }) {
  const [rows, setRows] = useState(content.rows || [
    { id: '1', cells: ['', '', ''] },
    { id: '2', cells: ['', '', ''] },
    { id: '3', cells: ['', '', ''] },
  ]);
  const [columns, setColumns] = useState(content.columns || 3);

  useEffect(() => {
    setRows(content.rows || rows);
    setColumns(content.columns || columns);
  }, [content.rows, content.columns]);

  const updateContent = () => {
    onUpdate?.({ content: { ...content, rows, columns } });
  };

  const addRow = (afterIndex = -1) => {
    const newRow = {
      id: Date.now().toString(),
      cells: Array(columns).fill(''),
    };
    setRows(prev => {
      const newRows = [...prev];
      newRows.splice(afterIndex + 1, 0, newRow);
      return newRows;
    });
  };

  const deleteRow = (rowId) => {
    if (rows.length <= 1) return;
    setRows(prev => prev.filter(r => r.id !== rowId));
  };

  const addColumn = () => {
    setColumns(prev => {
      const newCount = prev + 1;
      setRows(r => r.map(row => ({ ...row, cells: [...row.cells, ''] })));
      return newCount;
    });
  };

  const deleteColumn = (colIndex) => {
    if (columns <= 1) return;
    setColumns(prev => prev - 1);
    setRows(prev => prev.map(row => {
      const newCells = [...row.cells];
      newCells.splice(colIndex, 1);
      return { ...row, cells: newCells };
    }));
  };

  const handleCellChange = (rowId, colIndex, value) => {
    setRows(prev => prev.map(row =>
      row.id === rowId ? { ...row, cells: row.cells.map((c, i) => i === colIndex ? value : c) } : row
    ));
  };

  return (
    <div className="relative overflow-x-auto">
      <table className="w-full border-collapse border border-border">
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <th key={colIndex} className="border border-border bg-muted p-2 text-left font-medium text-sm">
                <div className="flex items-center gap-1">
                  <span>Столбец {colIndex + 1}</span>
                  {!readOnly && (
                    <Dropdown
                      trigger={({ open, onClick }) => (
                        <button onClick={onClick} className="btn-icon text-foreground-muted hover:text-foreground" aria-label="Параметры столбца">
                          <MoreVertical className="h-3 w-3" />
                        </button>
                      )}
                    >
                      <DropdownItem onClick={() => addColumn()}>
                        <Plus className="h-3 w-3" /> Добавить столбец справа
                      </DropdownItem>
                      <DropdownItem onClick={() => deleteColumn(colIndex)} variant="destructive">
                        <Trash2 className="h-3 w-3" /> Удалить столбец
                      </DropdownItem>
                    </Dropdown>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={row.id}>
              {row.cells.map((cell, colIndex) => (
                <td key={`${row.id}-${colIndex}`} className="border border-border p-2">
                  {!readOnly && colIndex === 0 && (
                    <div className="absolute -left-8 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        className="btn-icon text-foreground-muted hover:text-foreground"
                        onClick={() => addRow(rowIndex)}
                        aria-label="Добавить строку ниже"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        className="btn-icon text-foreground-muted hover:text-foreground"
                        onClick={() => deleteRow(row.id)}
                        aria-label="Удалить строку"
                        disabled={rows.length <= 1}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  <input
                    type="text"
                    value={cell}
                    onChange={(e) => handleCellChange(row.id, colIndex, e.target.value)}
                    readOnly={readOnly}
                    className="w-full px-2 py-1 text-sm bg-transparent border-none outline-none"
                    placeholder=" "
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!readOnly && (
        <div className="mt-2 flex gap-2">
          <Button variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-4 w-4 mr-1" /> Добавить строку
          </Button>
          <Button variant="outline" size="sm" onClick={addColumn}>
            <Plus className="h-4 w-4 mr-1" /> Добавить столбец
          </Button>
        </div>
      )}
    </div>
  );
}

import { useEffect } from 'react';