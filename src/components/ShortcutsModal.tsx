import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Enter', desc: 'Confirm edit & move down one cell' },
    { key: 'Tab', desc: 'Confirm edit & move right one cell' },
    { key: 'Shift + Enter', desc: 'Confirm edit & move up one cell' },
    { key: 'Shift + Tab', desc: 'Confirm edit & move left one cell' },
    { key: 'Arrow Keys', desc: 'Navigate between cells' },
    { key: 'Shift + Arrows', desc: 'Expand cell selection range' },
    { key: 'F2 / Double Click', desc: 'Edit active cell' },
    { key: 'Escape', desc: 'Cancel editing / dismiss selection' },
    { key: 'Delete / Backspace', desc: 'Clear contents of selected cell(s)' },
    { key: 'Ctrl + C', desc: 'Copy selected cell(s)' },
    { key: 'Ctrl + V', desc: 'Paste into selected cell(s)' },
    { key: 'Ctrl + Z', desc: 'Undo last change' },
    { key: 'Ctrl + Y', desc: 'Redo last change' },
    { key: 'Ctrl + B', desc: 'Toggle bold on selection' },
    { key: 'Ctrl + I', desc: 'Toggle italic on selection' },
    { key: 'Ctrl + F', desc: 'Open Find & Replace' },
    { key: 'Ctrl + G', desc: 'Jump to specific cell (e.g. ALL1000)' },
  ];

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-lg p-5 text-gray-800 text-sm animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            <Keyboard className="w-4 h-4 text-emerald-600" />
            <span>Keyboard Shortcuts</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto py-3 space-y-2 flex-1 pr-1">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {shortcuts.map((s, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded bg-gray-50 border border-gray-200"
              >
                <span className="text-gray-600 truncate mr-2">{s.desc}</span>
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded shadow-2xs font-mono text-[11px] text-gray-800 whitespace-nowrap">
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded shadow-2xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
