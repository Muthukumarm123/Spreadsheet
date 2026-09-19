import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import { Sheet, CellData } from '../types/spreadsheet';
import { cellKey, parseCellKey, coordToA1 } from '../utils/coordinate';

interface FindReplaceModalProps {
  sheet: Sheet;
  isOpen: boolean;
  onClose: () => void;
  onSelectCell: (row: number, col: number) => void;
  onUpdateCells: (updatedCells: Record<string, CellData>) => void;
}

export const FindReplaceModal: React.FC<FindReplaceModalProps> = ({
  sheet,
  isOpen,
  onClose,
  onSelectCell,
  onUpdateCells,
}) => {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [matchEntireCell, setMatchEntireCell] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  if (!isOpen) return null;

  const getMatchingKeys = (): string[] => {
    if (!findText) return [];
    const keys: string[] = [];
    const target = matchCase ? findText : findText.toLowerCase();

    for (const [key, cell] of Object.entries(sheet.cells)) {
      if (!cell || !cell.raw) continue;
      const val = matchCase ? cell.raw : cell.raw.toLowerCase();
      if (matchEntireCell) {
        if (val === target) keys.push(key);
      } else {
        if (val.includes(target)) keys.push(key);
      }
    }
    return keys;
  };

  const handleFindNext = () => {
    const matches = getMatchingKeys();
    if (matches.length === 0) {
      setStatusMessage('No matching cells found');
      return;
    }
    const firstKey = matches[0];
    const { row, col } = parseCellKey(firstKey);
    onSelectCell(row, col);
    setStatusMessage(`Found ${matches.length} matching cell(s) (at ${coordToA1(row, col)})`);
  };

  const handleReplace = () => {
    const matches = getMatchingKeys();
    if (matches.length === 0) {
      setStatusMessage('No matches to replace');
      return;
    }
    const key = matches[0];
    const cell = sheet.cells[key];
    if (!cell) return;

    let newRaw = cell.raw;
    if (matchEntireCell) {
      newRaw = replaceText;
    } else {
      const regex = new RegExp(findText, matchCase ? 'g' : 'gi');
      newRaw = newRaw.replace(regex, replaceText);
    }

    onUpdateCells({
      ...sheet.cells,
      [key]: {
        ...cell,
        raw: newRaw,
      },
    });

    const { row, col } = parseCellKey(key);
    onSelectCell(row, col);
    setStatusMessage(`Replaced at ${coordToA1(row, col)}`);
  };

  const handleReplaceAll = () => {
    const matches = getMatchingKeys();
    if (matches.length === 0) {
      setStatusMessage('No matches to replace');
      return;
    }

    const updated = { ...sheet.cells };
    const regex = new RegExp(findText, matchCase ? 'g' : 'gi');

    matches.forEach((key) => {
      const cell = updated[key];
      if (cell) {
        let newRaw = cell.raw;
        if (matchEntireCell) {
          newRaw = replaceText;
        } else {
          newRaw = newRaw.replace(regex, replaceText);
        }
        updated[key] = {
          ...cell,
          raw: newRaw,
        };
      }
    });

    onUpdateCells(updated);
    setStatusMessage(`Successfully replaced in ${matches.length} cell(s)`);
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-md p-5 text-gray-800 text-sm animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            <Search className="w-4 h-4 text-emerald-600" />
            <span>Find and replace</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3.5 py-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Find</label>
            <input
              type="text"
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              placeholder="Search in sheet..."
              autoFocus
              className="w-full px-3 py-1.5 border border-gray-300 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Replace with</label>
            <input
              type="text"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder="Replacement text..."
              className="w-full px-3 py-1.5 border border-gray-300 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs"
            />
          </div>

          <div className="space-y-1.5 pt-1 text-xs text-gray-600">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={matchCase}
                onChange={(e) => setMatchCase(e.target.checked)}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Match case</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={matchEntireCell}
                onChange={(e) => setMatchEntireCell(e.target.checked)}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Match entire cell contents</span>
            </label>
          </div>

          {statusMessage && (
            <div className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded border border-emerald-200">
              {statusMessage}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <div className="flex gap-2">
            <button
              onClick={handleReplaceAll}
              disabled={!findText}
              className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-40 rounded text-gray-700 font-medium transition"
            >
              Replace all
            </button>
            <button
              onClick={handleReplace}
              disabled={!findText}
              className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-40 rounded text-gray-700 font-medium transition"
            >
              Replace
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleFindNext}
              disabled={!findText}
              className="px-3.5 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded text-white font-medium shadow-xs transition"
            >
              Find
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
