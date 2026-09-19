import React, { useState } from 'react';
import { Plus, MoreVertical, Trash2, Copy, Edit2, Calculator } from 'lucide-react';
import { Sheet, SelectionStats } from '../types/spreadsheet';

interface SheetTabsProps {
  sheets: Sheet[];
  activeSheetId: string;
  onSelectSheet: (id: string) => void;
  onAddSheet: () => void;
  onRenameSheet: (id: string, newName: string) => void;
  onDuplicateSheet: (id: string) => void;
  onDeleteSheet: (id: string) => void;
  selectionStats: SelectionStats;
}

export const SheetTabs: React.FC<SheetTabsProps> = ({
  sheets,
  activeSheetId,
  onSelectSheet,
  onAddSheet,
  onRenameSheet,
  onDuplicateSheet,
  onDeleteSheet,
  selectionStats,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const startRename = (sheet: Sheet) => {
    setEditingId(sheet.id);
    setEditName(sheet.name);
    setMenuOpenId(null);
  };

  const finishRename = () => {
    if (editingId && editName.trim()) {
      onRenameSheet(editingId, editName.trim());
    }
    setEditingId(null);
  };

  return (
    <div
      id="spreadsheet-sheet-tabs"
      className="h-9 bg-gray-100 border-t border-gray-300 flex items-center justify-between px-2 text-xs select-none relative z-20"
    >
      {/* Left: Add Sheet (+) + Sheet Tab List */}
      <div className="flex items-center gap-1 overflow-x-auto h-full py-0.5">
        <button
          onClick={onAddSheet}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-gray-700 transition"
          title="Add Sheet"
        >
          <Plus className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-0.5 h-full">
          {sheets.map((sheet) => {
            const isActive = sheet.id === activeSheetId;
            return (
              <div
                key={sheet.id}
                className={`relative flex items-center gap-1 px-3 h-full rounded-t border-t-2 text-xs font-medium cursor-pointer transition ${
                  isActive
                    ? 'bg-white border-emerald-600 text-emerald-900 shadow-sm'
                    : 'bg-gray-200/70 border-transparent text-gray-600 hover:bg-gray-200'
                }`}
                onClick={() => onSelectSheet(sheet.id)}
              >
                {editingId === sheet.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={finishRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') finishRename();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus
                    className="w-24 text-xs font-medium border border-blue-500 rounded px-1 outline-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      startRename(sheet);
                    }}
                    className="truncate max-w-[140px]"
                    title="Double click to rename"
                  >
                    {sheet.name}
                  </span>
                )}

                {/* Tab Options Menu Trigger */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpenId(menuOpenId === sheet.id ? null : sheet.id);
                  }}
                  className="p-0.5 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-700"
                >
                  <MoreVertical className="w-3 h-3" />
                </button>

                {/* Tab Menu Dropdown */}
                {menuOpenId === sheet.id && (
                  <div
                    className="absolute bottom-full mb-1 left-0 w-36 bg-white border border-gray-200 shadow-lg rounded-md py-1 z-50 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => startRename(sheet)}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center gap-2 text-gray-700"
                    >
                      <Edit2 className="w-3 h-3 text-gray-500" />
                      <span>Rename</span>
                    </button>
                    <button
                      onClick={() => {
                        onDuplicateSheet(sheet.id);
                        setMenuOpenId(null);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center gap-2 text-gray-700"
                    >
                      <Copy className="w-3 h-3 text-gray-500" />
                      <span>Duplicate</span>
                    </button>
                    {sheets.length > 1 && (
                      <button
                        onClick={() => {
                          onDeleteSheet(sheet.id);
                          setMenuOpenId(null);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center gap-2 text-red-600 border-t border-gray-100 mt-1 pt-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Quick Selection Statistics Display (Google Sheets bottom-right summary) */}
      <div className="flex items-center gap-3 text-xs text-gray-600">
        {selectionStats.count > 0 && (
          <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded border border-gray-200 shadow-xs">
            {selectionStats.sum !== null && (
              <span className="font-mono text-[11px]">
                <strong className="text-gray-500 font-normal">SUM:</strong>{' '}
                <span className="font-semibold text-gray-900">
                  {selectionStats.sum.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </span>
              </span>
            )}

            {selectionStats.avg !== null && (
              <span className="font-mono text-[11px] border-l border-gray-200 pl-2">
                <strong className="text-gray-500 font-normal">AVG:</strong>{' '}
                <span className="text-gray-900">
                  {selectionStats.avg.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </span>
              </span>
            )}

            {selectionStats.min !== null && (
              <span className="font-mono text-[11px] border-l border-gray-200 pl-2">
                <strong className="text-gray-500 font-normal">MIN:</strong>{' '}
                <span className="text-gray-900">{selectionStats.min}</span>
              </span>
            )}

            {selectionStats.max !== null && (
              <span className="font-mono text-[11px] border-l border-gray-200 pl-2">
                <strong className="text-gray-500 font-normal">MAX:</strong>{' '}
                <span className="text-gray-900">{selectionStats.max}</span>
              </span>
            )}

            <span className="font-mono text-[11px] border-l border-gray-200 pl-2">
              <strong className="text-gray-500 font-normal">COUNT:</strong>{' '}
              <span className="text-gray-900">{selectionStats.count}</span>
            </span>
          </div>
        )}

        <div className="text-[11px] text-gray-500 hidden md:block">
          1,000 Rows × 1,000 Columns
        </div>
      </div>
    </div>
  );
};
