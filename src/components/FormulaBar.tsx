import React, { useState, useEffect, useRef } from 'react';
import { a1ToCoord, coordToA1 } from '../utils/coordinate';
import { CellCoord } from '../types/spreadsheet';

interface FormulaBarProps {
  activeCoord: CellCoord;
  activeCellRaw: string;
  onUpdateActiveCellRaw: (newRaw: string, commit?: boolean) => void;
  onJumpToCoord: (coord: CellCoord) => void;
}

export const FormulaBar: React.FC<FormulaBarProps> = ({
  activeCoord,
  activeCellRaw,
  onUpdateActiveCellRaw,
  onJumpToCoord,
}) => {
  const currentA1 = coordToA1(activeCoord.row, activeCoord.col);
  const [nameBoxValue, setNameBoxValue] = useState(currentA1);
  const [formulaValue, setFormulaValue] = useState(activeCellRaw);
  const formulaInputRef = useRef<HTMLInputElement>(null);

  // Sync with active coordinate changes
  useEffect(() => {
    setNameBoxValue(currentA1);
  }, [currentA1]);

  // Sync with cell raw value changes
  useEffect(() => {
    setFormulaValue(activeCellRaw);
  }, [activeCellRaw]);

  const handleNameBoxSubmit = () => {
    const parsed = a1ToCoord(nameBoxValue);
    if (parsed) {
      onJumpToCoord(parsed);
    } else {
      setNameBoxValue(currentA1);
    }
  };

  const handleFormulaSubmit = () => {
    onUpdateActiveCellRaw(formulaValue, true);
  };

  return (
    <div
      id="spreadsheet-formula-bar"
      className="flex items-center gap-1.5 px-3 py-1 bg-white border-b border-gray-200 text-xs text-gray-700 select-none"
    >
      {/* Name Box (Jump to cell input) */}
      <div className="relative flex-shrink-0">
        <input
          type="text"
          value={nameBoxValue}
          onChange={(e) => setNameBoxValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleNameBoxSubmit();
            if (e.key === 'Escape') setNameBoxValue(currentA1);
          }}
          onBlur={handleNameBoxSubmit}
          className="w-20 text-center font-medium uppercase py-1 px-1.5 bg-gray-50 hover:bg-gray-100 focus:bg-white border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
          title="Active cell reference. Type e.g. ALL1000 or Z500 to jump directly."
        />
      </div>

      <div className="w-[1px] h-4 bg-gray-300 mx-1 flex-shrink-0" />

      {/* Function 'fx' indicator button */}
      <div
        className="text-gray-400 font-serif italic text-sm font-semibold select-none px-1.5 cursor-default flex-shrink-0"
        title="Formula input"
      >
        fx
      </div>

      {/* Formula Input */}
      <div className="flex-1 relative">
        <input
          ref={formulaInputRef}
          type="text"
          value={formulaValue}
          onChange={(e) => {
            setFormulaValue(e.target.value);
            onUpdateActiveCellRaw(e.target.value, false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleFormulaSubmit();
            }
            if (e.key === 'Escape') {
              setFormulaValue(activeCellRaw);
              onUpdateActiveCellRaw(activeCellRaw, true);
            }
          }}
          onBlur={handleFormulaSubmit}
          placeholder="Enter a value or formula starting with = (e.g. =SUM(B6:B9))"
          className="w-full font-mono text-xs text-gray-800 py-1 px-2 border border-transparent hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded outline-none transition"
        />
      </div>
    </div>
  );
};
