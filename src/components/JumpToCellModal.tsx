import React, { useState } from 'react';
import { X, Navigation, Sparkles } from 'lucide-react';
import { a1ToCoord } from '../utils/coordinate';
import { CellCoord } from '../types/spreadsheet';

interface JumpToCellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJump: (coord: CellCoord) => void;
}

export const JumpToCellModal: React.FC<JumpToCellModalProps> = ({
  isOpen,
  onClose,
  onJump,
}) => {
  const [target, setTarget] = useState('ALL1000');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (val?: string) => {
    const raw = (val || target).trim().toUpperCase();
    const parsed = a1ToCoord(raw);
    if (!parsed) {
      setError('Please enter a valid cell reference like B4, Z500, or ALL1000');
      return;
    }
    if (parsed.row < 0 || parsed.row >= 1000 || parsed.col < 0 || parsed.col >= 1000) {
      setError('Coordinate must be within 1,000 rows (1-1000) and 1,000 columns (A-ALL)');
      return;
    }
    onJump(parsed);
    onClose();
  };

  const presets = [
    { label: 'A1', desc: 'Top-Left origin', coord: 'A1' },
    { label: 'Z500', desc: 'Center milestone (Row 500)', coord: 'Z500' },
    { label: 'ALL1000', desc: 'Far corner (Cell #1,000,000)', coord: 'ALL1000' },
    { label: 'E10', desc: 'Revenue Summary', coord: 'E10' },
    { label: 'AA100', desc: 'Row 100 Col AA', coord: 'AA100' },
  ];

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-sm p-5 text-gray-800 text-sm animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            <Navigation className="w-4 h-4 text-emerald-600" />
            <span>Go to cell in 1,000 × 1,000 Grid</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Enter Cell Reference (A1 to ALL1000)
            </label>
            <input
              type="text"
              value={target}
              onChange={(e) => {
                setTarget(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
                if (e.key === 'Escape') onClose();
              }}
              placeholder="e.g. ALL1000 or Z500"
              autoFocus
              className="w-full px-3 py-2 font-mono text-sm font-semibold uppercase tracking-wider border border-gray-300 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
          </div>

          <div>
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block mb-1.5">
              Quick Jump Presets
            </span>
            <div className="space-y-1">
              {presets.map((p) => (
                <button
                  key={p.coord}
                  onClick={() => handleSubmit(p.coord)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded hover:bg-emerald-50 hover:text-emerald-900 border border-gray-100 hover:border-emerald-200 transition text-xs"
                >
                  <span className="font-mono font-bold text-gray-800">{p.label}</span>
                  <span className="text-gray-500">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded transition"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSubmit()}
            className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded shadow-xs transition flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Navigate</span>
          </button>
        </div>
      </div>
    </div>
  );
};
