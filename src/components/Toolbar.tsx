import React, { useState, useRef, useEffect } from 'react';
import {
  Undo2,
  Redo2,
  Printer,
  Paintbrush,
  DollarSign,
  Percent,
  Bold,
  Italic,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sigma,
  ChevronDown,
  Grid3X3,
  Eraser,
  Type,
  Palette,
  Check,
} from 'lucide-react';
import { CellFormat, CellStyle } from '../types/spreadsheet';

interface ToolbarProps {
  currentStyle: CellStyle;
  onApplyStyle: (stylePatch: Partial<CellStyle>) => void;
  onClearFormat: () => void;
  onInsertFunction: (fnName: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onPrint: () => void;
  isFormatPainterActive: boolean;
  onToggleFormatPainter: () => void;
}

const COLOR_PALETTE = [
  '#000000', '#434343', '#666666', '#999999', '#cccccc', '#ffffff',
  '#990000', '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e',
  '#3d85c6', '#674ea7', '#a64d79', '#ea4335', '#fbbc04', '#34a853',
  '#4285f4', '#166534', '#1e40af', '#6b21a8', '#991b1b', '#d97706',
  '#f0fdf4', '#dcfce7', '#eff6ff', '#dbeafe', '#fef2f2', '#fee2e2',
  '#fef9c3', '#fef08a', '#ede9fe', '#f3e8ff', '#f8fafc', '#f1f5f9',
];

export const Toolbar: React.FC<ToolbarProps> = ({
  currentStyle,
  onApplyStyle,
  onClearFormat,
  onInsertFunction,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onPrint,
  isFormatPainterActive,
  onToggleFormatPainter,
}) => {
  const [showTextColor, setShowTextColor] = useState(false);
  const [showBgColor, setShowBgColor] = useState(false);
  const [showBorders, setShowBorders] = useState(false);
  const [showFunctions, setShowFunctions] = useState(false);
  const [showFormatMenu, setShowFormatMenu] = useState(false);

  const toolbarRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setShowTextColor(false);
        setShowBgColor(false);
        setShowBorders(false);
        setShowFunctions(false);
        setShowFormatMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentFontSize = currentStyle.fontSize || 11;
  const currentFormat = currentStyle.format || 'general';

  return (
    <div
      ref={toolbarRef}
      id="spreadsheet-toolbar"
      className="bg-gray-50 border-b border-gray-200 px-3 py-1 flex items-center gap-1 overflow-x-auto text-gray-700 text-xs select-none"
    >
      {/* Undo / Redo */}
      <button
        disabled={!canUndo}
        onClick={onUndo}
        className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 transition"
        title="Undo (Ctrl+Z)"
      >
        <Undo2 className="w-3.5 h-3.5" />
      </button>
      <button
        disabled={!canRedo}
        onClick={onRedo}
        className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 transition"
        title="Redo (Ctrl+Y)"
      >
        <Redo2 className="w-3.5 h-3.5" />
      </button>

      {/* Print */}
      <button
        onClick={onPrint}
        className="p-1.5 rounded hover:bg-gray-200 transition"
        title="Print (Ctrl+P)"
      >
        <Printer className="w-3.5 h-3.5" />
      </button>

      {/* Format Painter */}
      <button
        onClick={onToggleFormatPainter}
        className={`p-1.5 rounded transition ${
          isFormatPainterActive ? 'bg-blue-100 text-blue-600 ring-1 ring-blue-400' : 'hover:bg-gray-200'
        }`}
        title="Paint format"
      >
        <Paintbrush className="w-3.5 h-3.5" />
      </button>

      <div className="w-[1px] h-4 bg-gray-300 mx-1" />

      {/* Currency shortcut */}
      <button
        onClick={() => onApplyStyle({ format: 'currency' })}
        className={`p-1.5 rounded transition ${
          currentFormat === 'currency' ? 'bg-gray-200 font-semibold' : 'hover:bg-gray-200'
        }`}
        title="Format as currency ($)"
      >
        <DollarSign className="w-3.5 h-3.5" />
      </button>

      {/* Percentage shortcut */}
      <button
        onClick={() => onApplyStyle({ format: 'percent' })}
        className={`p-1.5 rounded transition ${
          currentFormat === 'percent' ? 'bg-gray-200 font-semibold' : 'hover:bg-gray-200'
        }`}
        title="Format as percent (%)"
      >
        <Percent className="w-3.5 h-3.5" />
      </button>

      {/* Format Type Dropdown */}
      <div className="relative">
        <button
          onClick={() => {
            setShowFormatMenu(!showFormatMenu);
            setShowTextColor(false);
            setShowBgColor(false);
            setShowBorders(false);
            setShowFunctions(false);
          }}
          className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-200 transition capitalize"
          title="Number formatting"
        >
          <span>{currentFormat}</span>
          <ChevronDown className="w-3 h-3 text-gray-500" />
        </button>

        {showFormatMenu && (
          <div className="absolute left-0 top-full mt-1 w-36 bg-white border border-gray-200 shadow-lg rounded-md py-1 z-50">
            {(['general', 'number', 'currency', 'percent', 'date', 'text'] as CellFormat[]).map((fmt) => (
              <button
                key={fmt}
                onClick={() => {
                  onApplyStyle({ format: fmt });
                  setShowFormatMenu(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center justify-between capitalize"
              >
                <span>{fmt}</span>
                {currentFormat === fmt && <Check className="w-3 h-3 text-emerald-600" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-[1px] h-4 bg-gray-300 mx-1" />

      {/* Font Size Selector */}
      <select
        value={currentFontSize}
        onChange={(e) => onApplyStyle({ fontSize: Number(e.target.value) })}
        className="bg-transparent hover:bg-gray-200 px-1 py-1 rounded border-none outline-none cursor-pointer text-xs"
        title="Font size"
      >
        {[9, 10, 11, 12, 14, 16, 18, 24].map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>

      <div className="w-[1px] h-4 bg-gray-300 mx-1" />

      {/* Bold */}
      <button
        onClick={() => onApplyStyle({ bold: !currentStyle.bold })}
        className={`p-1.5 rounded transition ${
          currentStyle.bold ? 'bg-gray-200 text-blue-700 font-bold' : 'hover:bg-gray-200'
        }`}
        title="Bold (Ctrl+B)"
      >
        <Bold className="w-3.5 h-3.5" />
      </button>

      {/* Italic */}
      <button
        onClick={() => onApplyStyle({ italic: !currentStyle.italic })}
        className={`p-1.5 rounded transition ${
          currentStyle.italic ? 'bg-gray-200 text-blue-700' : 'hover:bg-gray-200'
        }`}
        title="Italic (Ctrl+I)"
      >
        <Italic className="w-3.5 h-3.5" />
      </button>

      {/* Strikethrough */}
      <button
        onClick={() => onApplyStyle({ strikethrough: !currentStyle.strikethrough })}
        className={`p-1.5 rounded transition ${
          currentStyle.strikethrough ? 'bg-gray-200 text-blue-700' : 'hover:bg-gray-200'
        }`}
        title="Strikethrough"
      >
        <Strikethrough className="w-3.5 h-3.5" />
      </button>

      {/* Text Color Picker */}
      <div className="relative">
        <button
          onClick={() => {
            setShowTextColor(!showTextColor);
            setShowBgColor(false);
            setShowBorders(false);
            setShowFunctions(false);
            setShowFormatMenu(false);
          }}
          className="p-1.5 rounded hover:bg-gray-200 transition flex flex-col items-center"
          title="Text color"
        >
          <Type className="w-3.5 h-3.5" />
          <div
            className="w-3 h-1 mt-0.5 rounded-sm"
            style={{ backgroundColor: currentStyle.textColor || '#000000' }}
          />
        </button>

        {showTextColor && (
          <div className="absolute left-0 top-full mt-1 p-2 bg-white border border-gray-200 shadow-lg rounded-md z-50 w-48">
            <div className="text-[10px] text-gray-500 font-medium mb-1.5">Text Color</div>
            <div className="grid grid-cols-6 gap-1">
              {COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    onApplyStyle({ textColor: color });
                    setShowTextColor(false);
                  }}
                  className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fill / Background Color Picker */}
      <div className="relative">
        <button
          onClick={() => {
            setShowBgColor(!showBgColor);
            setShowTextColor(false);
            setShowBorders(false);
            setShowFunctions(false);
            setShowFormatMenu(false);
          }}
          className="p-1.5 rounded hover:bg-gray-200 transition flex flex-col items-center"
          title="Fill color"
        >
          <Palette className="w-3.5 h-3.5" />
          <div
            className="w-3 h-1 mt-0.5 rounded-sm border border-gray-300"
            style={{ backgroundColor: currentStyle.bgColor || '#ffffff' }}
          />
        </button>

        {showBgColor && (
          <div className="absolute left-0 top-full mt-1 p-2 bg-white border border-gray-200 shadow-lg rounded-md z-50 w-48">
            <div className="text-[10px] text-gray-500 font-medium mb-1.5">Fill Color</div>
            <div className="grid grid-cols-6 gap-1">
              {COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    onApplyStyle({ bgColor: color });
                    setShowBgColor(false);
                  }}
                  className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <button
              onClick={() => {
                onApplyStyle({ bgColor: undefined });
                setShowBgColor(false);
              }}
              className="mt-2 w-full text-center text-[11px] py-1 border border-gray-200 rounded hover:bg-gray-100"
            >
              Reset to No Fill
            </button>
          </div>
        )}
      </div>

      <div className="w-[1px] h-4 bg-gray-300 mx-1" />

      {/* Borders */}
      <div className="relative">
        <button
          onClick={() => {
            setShowBorders(!showBorders);
            setShowTextColor(false);
            setShowBgColor(false);
            setShowFunctions(false);
            setShowFormatMenu(false);
          }}
          className="p-1.5 rounded hover:bg-gray-200 transition"
          title="Borders"
        >
          <Grid3X3 className="w-3.5 h-3.5" />
        </button>

        {showBorders && (
          <div className="absolute left-0 top-full mt-1 w-36 bg-white border border-gray-200 shadow-lg rounded-md py-1 z-50">
            <button
              onClick={() => {
                onApplyStyle({ border: 'all' });
                setShowBorders(false);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-gray-100"
            >
              All borders
            </button>
            <button
              onClick={() => {
                onApplyStyle({ border: 'outer' });
                setShowBorders(false);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-gray-100"
            >
              Outer borders
            </button>
            <button
              onClick={() => {
                onApplyStyle({ border: 'none' });
                setShowBorders(false);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-gray-100"
            >
              Clear borders
            </button>
          </div>
        )}
      </div>

      <div className="w-[1px] h-4 bg-gray-300 mx-1" />

      {/* Horizontal Alignment */}
      <button
        onClick={() => onApplyStyle({ align: 'left' })}
        className={`p-1.5 rounded transition ${
          currentStyle.align === 'left' ? 'bg-gray-200' : 'hover:bg-gray-200'
        }`}
        title="Align left"
      >
        <AlignLeft className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onApplyStyle({ align: 'center' })}
        className={`p-1.5 rounded transition ${
          currentStyle.align === 'center' ? 'bg-gray-200' : 'hover:bg-gray-200'
        }`}
        title="Align center"
      >
        <AlignCenter className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onApplyStyle({ align: 'right' })}
        className={`p-1.5 rounded transition ${
          currentStyle.align === 'right' ? 'bg-gray-200' : 'hover:bg-gray-200'
        }`}
        title="Align right"
      >
        <AlignRight className="w-3.5 h-3.5" />
      </button>

      <div className="w-[1px] h-4 bg-gray-300 mx-1" />

      {/* Functions Dropdown */}
      <div className="relative">
        <button
          onClick={() => {
            setShowFunctions(!showFunctions);
            setShowTextColor(false);
            setShowBgColor(false);
            setShowBorders(false);
            setShowFormatMenu(false);
          }}
          className="flex items-center gap-1 p-1.5 rounded hover:bg-gray-200 transition"
          title="Insert function"
        >
          <Sigma className="w-3.5 h-3.5" />
          <ChevronDown className="w-2.5 h-2.5 text-gray-500" />
        </button>

        {showFunctions && (
          <div className="absolute left-0 top-full mt-1 w-44 bg-white border border-gray-200 shadow-lg rounded-md py-1 z-50">
            {['SUM', 'AVERAGE', 'COUNT', 'MAX', 'MIN', 'PRODUCT'].map((fn) => (
              <button
                key={fn}
                onClick={() => {
                  onInsertFunction(fn);
                  setShowFunctions(false);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center justify-between"
              >
                <span className="font-medium">{fn}</span>
                <span className="text-[10px] text-gray-400">Function</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Clear Formatting */}
      <button
        onClick={onClearFormat}
        className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-red-600 transition ml-auto"
        title="Clear formatting"
      >
        <Eraser className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
