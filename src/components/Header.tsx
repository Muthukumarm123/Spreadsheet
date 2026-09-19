import React, { useState, useRef, useEffect } from 'react';
import {
  FileSpreadsheet,
  Save,
  CheckCircle2,
  Printer,
  FileDown,
  FileUp,
  RotateCcw,
  Sparkles,
  Search,
  HelpCircle,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { Sheet } from '../types/spreadsheet';

interface HeaderProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  onExportCSV: () => void;
  onImportCSV: (file: File) => void;
  onLoadSample: () => void;
  onNewSpreadsheet: () => void;
  onPrint: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onOpenFindReplace: () => void;
  onOpenShortcuts: () => void;
  onJumpToCellPrompt: () => void;
  savedTime: number;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  onTitleChange,
  onExportCSV,
  onImportCSV,
  onLoadSample,
  onNewSpreadsheet,
  onPrint,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onOpenFindReplace,
  onOpenShortcuts,
  onJumpToCellPrompt,
  savedTime,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTempTitle(title);
  }, [title]);

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (tempTitle.trim()) {
      onTitleChange(tempTitle.trim());
    } else {
      setTempTitle(title);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportCSV(file);
    }
    if (e.target) e.target.value = '';
  };

  return (
    <header className="bg-white border-b border-gray-200 select-none text-gray-800" id="app-header">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.txt"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex items-center justify-between px-3 py-1.5 gap-3">
        {/* Left: Brand Icon + Title + Menu Bar */}
        <div className="flex items-center gap-3">
          {/* Sheets Icon */}
          <div
            className="w-10 h-10 rounded bg-emerald-600 flex items-center justify-center text-white shadow-sm flex-shrink-0 cursor-pointer hover:bg-emerald-700 transition"
            title="Google Sheets 1000x1000 Grid"
          >
            <FileSpreadsheet className="w-6 h-6" />
          </div>

          <div>
            {/* Document Title */}
            <div className="flex items-center gap-2">
              {isEditingTitle ? (
                <input
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onBlur={handleTitleSubmit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleTitleSubmit();
                    if (e.key === 'Escape') {
                      setTempTitle(title);
                      setIsEditingTitle(false);
                    }
                  }}
                  autoFocus
                  className="text-base font-medium text-gray-800 border border-blue-500 rounded px-1.5 py-0.5 outline-none"
                />
              ) : (
                <span
                  onClick={() => setIsEditingTitle(true)}
                  className="text-base font-medium text-gray-800 px-1.5 py-0.5 rounded hover:bg-gray-100 hover:ring-1 hover:ring-gray-300 cursor-pointer transition max-w-sm truncate"
                  title="Click to rename spreadsheet"
                >
                  {title || 'Untitled spreadsheet'}
                </span>
              )}

              {/* Saved Status badge */}
              <div className="flex items-center gap-1 text-xs text-gray-500 pl-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Saved to localStorage</span>
              </div>
            </div>

            {/* Menu Bar: File, Edit, View, Insert, Format, Data, Tools, Help */}
            <div
              ref={menuContainerRef}
              className="flex items-center gap-0.5 text-xs text-gray-700 mt-0.5 relative"
            >
              {/* File Menu */}
              <div className="relative">
                <button
                  onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
                  className={`px-2 py-0.5 rounded hover:bg-gray-100 transition ${
                    activeMenu === 'file' ? 'bg-gray-200' : ''
                  }`}
                >
                  File
                </button>
                {activeMenu === 'file' && (
                  <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-gray-200 shadow-lg rounded-md py-1 z-50 text-xs">
                    <button
                      onClick={() => {
                        setActiveMenu(null);
                        onNewSpreadsheet();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                      <span>New spreadsheet</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveMenu(null);
                        onLoadSample();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center gap-2 text-emerald-700 font-medium"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Load Financial Demo Data</span>
                    </button>
                    <div className="border-t border-gray-200 my-1" />
                    <button
                      onClick={() => {
                        setActiveMenu(null);
                        fileInputRef.current?.click();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <FileUp className="w-3.5 h-3.5 text-gray-500" />
                      <span>Import CSV file...</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveMenu(null);
                        onExportCSV();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <FileDown className="w-3.5 h-3.5 text-gray-500" />
                      <span>Download as CSV (.csv)</span>
                    </button>
                    <div className="border-t border-gray-200 my-1" />
                    <button
                      onClick={() => {
                        setActiveMenu(null);
                        onPrint();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <Printer className="w-3.5 h-3.5 text-gray-500" />
                        Print
                      </span>
                      <span className="text-gray-400 text-[10px]">Ctrl+P</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Edit Menu */}
              <div className="relative">
                <button
                  onClick={() => setActiveMenu(activeMenu === 'edit' ? null : 'edit')}
                  className={`px-2 py-0.5 rounded hover:bg-gray-100 transition ${
                    activeMenu === 'edit' ? 'bg-gray-200' : ''
                  }`}
                >
                  Edit
                </button>
                {activeMenu === 'edit' && (
                  <div className="absolute left-0 top-full mt-1 w-52 bg-white border border-gray-200 shadow-lg rounded-md py-1 z-50 text-xs">
                    <button
                      disabled={!canUndo}
                      onClick={() => {
                        setActiveMenu(null);
                        onUndo();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-100 disabled:opacity-40 flex justify-between"
                    >
                      <span>Undo</span>
                      <span className="text-gray-400 text-[10px]">Ctrl+Z</span>
                    </button>
                    <button
                      disabled={!canRedo}
                      onClick={() => {
                        setActiveMenu(null);
                        onRedo();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-100 disabled:opacity-40 flex justify-between"
                    >
                      <span>Redo</span>
                      <span className="text-gray-400 text-[10px]">Ctrl+Y</span>
                    </button>
                    <div className="border-t border-gray-200 my-1" />
                    <button
                      onClick={() => {
                        setActiveMenu(null);
                        onOpenFindReplace();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex justify-between"
                    >
                      <span>Find and replace</span>
                      <span className="text-gray-400 text-[10px]">Ctrl+F</span>
                    </button>
                  </div>
                )}
              </div>

              {/* View Menu */}
              <div className="relative">
                <button
                  onClick={() => setActiveMenu(activeMenu === 'view' ? null : 'view')}
                  className={`px-2 py-0.5 rounded hover:bg-gray-100 transition ${
                    activeMenu === 'view' ? 'bg-gray-200' : ''
                  }`}
                >
                  View
                </button>
                {activeMenu === 'view' && (
                  <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-gray-200 shadow-lg rounded-md py-1 z-50 text-xs">
                    <div className="px-3 py-1.5 text-gray-500 font-semibold uppercase text-[10px]">
                      Grid Settings
                    </div>
                    <div className="px-3 py-1 text-gray-700 flex items-center justify-between">
                      <span>1,000 Rows</span>
                      <span className="text-emerald-600 font-mono font-medium">✓ Active</span>
                    </div>
                    <div className="px-3 py-1 text-gray-700 flex items-center justify-between">
                      <span>1,000 Columns (A-ALL)</span>
                      <span className="text-emerald-600 font-mono font-medium">✓ Active</span>
                    </div>
                    <div className="px-3 py-1 text-gray-700 flex items-center justify-between">
                      <span>Virtual Windowing</span>
                      <span className="text-emerald-600 font-mono font-medium">60 FPS</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Tools Menu */}
              <div className="relative">
                <button
                  onClick={() => setActiveMenu(activeMenu === 'tools' ? null : 'tools')}
                  className={`px-2 py-0.5 rounded hover:bg-gray-100 transition ${
                    activeMenu === 'tools' ? 'bg-gray-200' : ''
                  }`}
                >
                  Tools
                </button>
                {activeMenu === 'tools' && (
                  <div className="absolute left-0 top-full mt-1 w-52 bg-white border border-gray-200 shadow-lg rounded-md py-1 z-50 text-xs">
                    <button
                      onClick={() => {
                        setActiveMenu(null);
                        onJumpToCellPrompt();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex justify-between"
                    >
                      <span>Jump to Cell (e.g. ALL1000)</span>
                      <span className="text-gray-400 text-[10px]">Ctrl+G</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Help Menu */}
              <div className="relative">
                <button
                  onClick={() => setActiveMenu(activeMenu === 'help' ? null : 'help')}
                  className={`px-2 py-0.5 rounded hover:bg-gray-100 transition ${
                    activeMenu === 'help' ? 'bg-gray-200' : ''
                  }`}
                >
                  Help
                </button>
                {activeMenu === 'help' && (
                  <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-gray-200 shadow-lg rounded-md py-1 z-50 text-xs">
                    <button
                      onClick={() => {
                        setActiveMenu(null);
                        onOpenShortcuts();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-gray-500" />
                      <span>Keyboard Shortcuts Reference</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Action Controls: Jump to Cell + Grid dimension indicator */}
        <div className="flex items-center gap-2">
          {/* Quick Jump to cell button */}
          <button
            onClick={onJumpToCellPrompt}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium border border-gray-300 transition"
            title="Quickly jump to any cell like ALL1000 or Z500"
          >
            <Search className="w-3.5 h-3.5 text-gray-500" />
            <span>Go to cell...</span>
          </button>

          {/* Grid Spec Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>1,000 × 1,000 (1M Cells)</span>
          </div>
        </div>
      </div>
    </header>
  );
};
