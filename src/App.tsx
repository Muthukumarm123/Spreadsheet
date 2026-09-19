import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  SpreadsheetDocument,
  Sheet,
  CellCoord,
  CellRange,
  CellStyle,
  CellData,
  SelectionStats,
} from './types/spreadsheet';
import {
  loadDocumentFromStorage,
  saveDocumentToStorage,
  createSampleDocument,
  createEmptySheet,
  exportSheetToCSV,
  importCSVToSheet,
} from './utils/storage';
import {
  cellKey,
  coordToA1,
  normalizeRange,
  parseCellKey,
} from './utils/coordinate';
import { evaluateCell } from './utils/formula';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { FormulaBar } from './components/FormulaBar';
import { Grid } from './components/Grid';
import { SheetTabs } from './components/SheetTabs';
import { FindReplaceModal } from './components/FindReplaceModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { JumpToCellModal } from './components/JumpToCellModal';

export default function App() {
  // 1. Core Document State with LocalStorage
  const [doc, setDoc] = useState<SpreadsheetDocument>(() => loadDocumentFromStorage());
  const [savedTime, setSavedTime] = useState<number>(Date.now());

  // 2. Undo / Redo History
  const [undoStack, setUndoStack] = useState<SpreadsheetDocument[]>([]);
  const [redoStack, setRedoStack] = useState<SpreadsheetDocument[]>([]);

  // 3. Active Sheet
  const activeSheet = useMemo(() => {
    return doc.sheets.find((s) => s.id === doc.activeSheetId) || doc.sheets[0];
  }, [doc.sheets, doc.activeSheetId]);

  // 4. Selection & Active Cell State
  const [activeCell, setActiveCell] = useState<CellCoord>({ row: 0, col: 0 });
  const [selectionRange, setSelectionRange] = useState<CellRange>({
    startRow: 0,
    startCol: 0,
    endRow: 0,
    endCol: 0,
  });

  // 5. In-cell & Formula bar editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  // 6. Format Painter state
  const [formatPainterStyle, setFormatPainterStyle] = useState<CellStyle | null>(null);

  // 7. Modals
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isJumpModalOpen, setIsJumpModalOpen] = useState(false);
  const [jumpTarget, setJumpTarget] = useState<CellCoord | null>(null);

  // 8. Auto-save to localStorage with debounce
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveDocumentToStorage(doc);
      setSavedTime(Date.now());
    }, 400);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [doc]);

  // Helper: Commit new document state with Undo history recording
  const updateDocument = useCallback(
    (newDoc: SpreadsheetDocument, pushUndo = true) => {
      if (pushUndo) {
        setUndoStack((prev) => [...prev.slice(-30), doc]);
        setRedoStack([]);
      }
      setDoc(newDoc);
    },
    [doc]
  );

  // Helper: Recompute all formulas in active sheet cells
  const recomputeSheetCells = useCallback(
    (cells: Record<string, CellData>): Record<string, CellData> => {
      const updated = { ...cells };
      for (const [k, cell] of Object.entries(updated)) {
        if (cell && cell.raw) {
          const res = evaluateCell(cell.raw, k, updated);
          updated[k] = {
            ...cell,
            computed: res.value,
            error: res.error,
          };
        }
      }
      return updated;
    },
    []
  );

  // Helper: Update active sheet's cells and re-evaluate
  const updateActiveSheetCells = useCallback(
    (newCells: Record<string, CellData>) => {
      const recomputed = recomputeSheetCells(newCells);
      const updatedSheets = doc.sheets.map((s) =>
        s.id === activeSheet.id ? { ...s, cells: recomputed } : s
      );
      updateDocument({
        ...doc,
        sheets: updatedSheets,
      });
    },
    [doc, activeSheet.id, updateDocument, recomputeSheetCells]
  );

  // Active cell's current raw value and style
  const activeCellKey = cellKey(activeCell.row, activeCell.col);
  const activeCellData = activeSheet.cells[activeCellKey];
  const activeCellRaw = activeCellData?.raw || '';
  const activeCellStyle: CellStyle = activeCellData?.style || {};

  // 9. Selection Summary Statistics calculation (SUM, AVG, MIN, MAX, COUNT)
  const selectionStats = useMemo<SelectionStats>(() => {
    const norm = normalizeRange(selectionRange);
    let sum = 0;
    let count = 0;
    let numCount = 0;
    let min: number | null = null;
    let max: number | null = null;

    // Scan selection bounds (capping check to max 20,000 cells for snappy responsiveness)
    const rowSpan = norm.endRow - norm.startRow + 1;
    const colSpan = norm.endCol - norm.startCol + 1;
    const totalSelectedCells = rowSpan * colSpan;

    if (totalSelectedCells > 50000) {
      return { sum: null, avg: null, min: null, max: null, count: totalSelectedCells, numCount: 0 };
    }

    for (let r = norm.startRow; r <= norm.endRow; r++) {
      for (let c = norm.startCol; c <= norm.endCol; c++) {
        const k = cellKey(r, c);
        const cell = activeSheet.cells[k];
        if (cell && cell.raw !== undefined && cell.raw !== '') {
          count++;
          const val = cell.computed !== undefined && cell.computed !== null ? cell.computed : cell.raw;
          const num = typeof val === 'number' ? val : Number(String(val).replace(/[$,]/g, ''));
          if (!isNaN(num) && typeof val !== 'boolean') {
            numCount++;
            sum += num;
            if (min === null || num < min) min = num;
            if (max === null || num > max) max = num;
          }
        }
      }
    }

    return {
      sum: numCount > 0 ? Math.round(sum * 100) / 100 : null,
      avg: numCount > 0 ? Math.round((sum / numCount) * 100) / 100 : null,
      min,
      max,
      count,
      numCount,
    };
  }, [selectionRange, activeSheet.cells]);

  // 10. Undo / Redo Actions
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((r) => [...r, doc]);
    setUndoStack((u) => u.slice(0, -1));
    setDoc(prev);
  }, [undoStack, doc]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((u) => [...u, doc]);
    setRedoStack((r) => r.slice(0, -1));
    setDoc(next);
  }, [redoStack, doc]);

  // Global keyboard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+F, Ctrl+G)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')
      ) {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setIsFindReplaceOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        setIsJumpModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleUndo, handleRedo]);

  // 11. Cell Selection & Edit Actions
  const handleSelectCell = useCallback(
    (coord: CellCoord, extendRange = false) => {
      setActiveCell(coord);
      if (extendRange) {
        setSelectionRange((prev) => ({
          ...prev,
          endRow: coord.row,
          endCol: coord.col,
        }));
      } else {
        setSelectionRange({
          startRow: coord.row,
          startCol: coord.col,
          endRow: coord.row,
          endCol: coord.col,
        });
      }
    },
    []
  );

  const handleRangeSelect = useCallback((range: CellRange) => {
    setSelectionRange(range);
    setActiveCell({ row: range.startRow, col: range.startCol });
  }, []);

  const handleStartEdit = useCallback(
    (initialValue?: string) => {
      setIsEditing(true);
      setEditValue(initialValue !== undefined ? initialValue : activeCellRaw);
    },
    [activeCellRaw]
  );

  const handleEditChange = useCallback((val: string) => {
    setEditValue(val);
  }, []);

  const handleCommitEdit = useCallback(
    (moveDir: 'down' | 'right' | 'none' = 'down') => {
      setIsEditing(false);
      const k = cellKey(activeCell.row, activeCell.col);
      const prevCell = activeSheet.cells[k] || { raw: '' };

      if (prevCell.raw !== editValue) {
        const updatedCells = {
          ...activeSheet.cells,
          [k]: {
            ...prevCell,
            raw: editValue,
          },
        };
        updateActiveSheetCells(updatedCells);
      }

      if (moveDir === 'down') {
        const nextRow = Math.min(activeSheet.rowCount - 1, activeCell.row + 1);
        handleSelectCell({ row: nextRow, col: activeCell.col });
      } else if (moveDir === 'right') {
        const nextCol = Math.min(activeSheet.colCount - 1, activeCell.col + 1);
        handleSelectCell({ row: activeCell.row, col: nextCol });
      }
    },
    [activeCell, activeSheet, editValue, updateActiveSheetCells, handleSelectCell]
  );

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditValue(activeCellRaw);
  }, [activeCellRaw]);

  // 12. Formula Bar Direct Updates
  const handleUpdateActiveCellRaw = useCallback(
    (newRaw: string, commit = false) => {
      setEditValue(newRaw);
      if (commit) {
        const k = cellKey(activeCell.row, activeCell.col);
        const prevCell = activeSheet.cells[k] || { raw: '' };
        const updatedCells = {
          ...activeSheet.cells,
          [k]: {
            ...prevCell,
            raw: newRaw,
          },
        };
        updateActiveSheetCells(updatedCells);
      }
    },
    [activeCell, activeSheet.cells, updateActiveSheetCells]
  );

  // 13. Jump to Cell
  const handleJumpToCoord = useCallback(
    (coord: CellCoord) => {
      const bounded: CellCoord = {
        row: Math.max(0, Math.min(activeSheet.rowCount - 1, coord.row)),
        col: Math.max(0, Math.min(activeSheet.colCount - 1, coord.col)),
      };
      handleSelectCell(bounded);
      setJumpTarget(bounded);
    },
    [activeSheet.rowCount, activeSheet.colCount, handleSelectCell]
  );

  // 14. Styling / Formatting
  const handleApplyStyle = useCallback(
    (stylePatch: Partial<CellStyle>) => {
      const norm = normalizeRange(selectionRange);
      const updatedCells = { ...activeSheet.cells };

      for (let r = norm.startRow; r <= norm.endRow; r++) {
        for (let c = norm.startCol; c <= norm.endCol; c++) {
          const k = cellKey(r, c);
          const cell = updatedCells[k] || { raw: '' };
          updatedCells[k] = {
            ...cell,
            style: {
              ...cell.style,
              ...stylePatch,
            },
          };
        }
      }

      updateActiveSheetCells(updatedCells);
    },
    [selectionRange, activeSheet.cells, updateActiveSheetCells]
  );

  const handleClearFormat = useCallback(() => {
    const norm = normalizeRange(selectionRange);
    const updatedCells = { ...activeSheet.cells };

    for (let r = norm.startRow; r <= norm.endRow; r++) {
      for (let c = norm.startCol; c <= norm.endCol; c++) {
        const k = cellKey(r, c);
        if (updatedCells[k]) {
          updatedCells[k] = {
            ...updatedCells[k],
            style: undefined,
          };
        }
      }
    }

    updateActiveSheetCells(updatedCells);
  }, [selectionRange, activeSheet.cells, updateActiveSheetCells]);

  // 15. Format Painter
  const handleToggleFormatPainter = useCallback(() => {
    if (formatPainterStyle) {
      setFormatPainterStyle(null);
    } else {
      setFormatPainterStyle(activeCellStyle);
    }
  }, [formatPainterStyle, activeCellStyle]);

  const handleFormatPainterApply = useCallback(() => {
    if (formatPainterStyle) {
      handleApplyStyle(formatPainterStyle);
      setFormatPainterStyle(null);
    }
  }, [formatPainterStyle, handleApplyStyle]);

  // 16. Insert Function shortcut
  const handleInsertFunction = useCallback(
    (fnName: string) => {
      const norm = normalizeRange(selectionRange);
      let formula = `=${fnName}()`;
      if (norm.startRow !== norm.endRow || norm.startCol !== norm.endCol) {
        const r1 = coordToA1(norm.startRow, norm.startCol);
        const r2 = coordToA1(norm.endRow, norm.endCol);
        formula = `=${fnName}(${r1}:${r2})`;
      }
      handleUpdateActiveCellRaw(formula, true);
    },
    [selectionRange, handleUpdateActiveCellRaw]
  );

  // 17. Copy / Paste / Delete
  const handleCopySelection = useCallback(() => {
    const norm = normalizeRange(selectionRange);
    const lines: string[] = [];

    for (let r = norm.startRow; r <= norm.endRow; r++) {
      const rowVals: string[] = [];
      for (let c = norm.startCol; c <= norm.endCol; c++) {
        const cell = activeSheet.cells[cellKey(r, c)];
        rowVals.push(cell?.raw || '');
      }
      lines.push(rowVals.join('\t'));
    }

    const text = lines.join('\n');
    navigator.clipboard?.writeText(text).catch(() => {});
  }, [selectionRange, activeSheet.cells]);

  const handlePasteToSelection = useCallback(async () => {
    try {
      const text = await navigator.clipboard?.readText();
      if (!text) return;

      const lines = text.split(/\r\n|\n|\r/);
      const updatedCells = { ...activeSheet.cells };

      lines.forEach((line, rOffset) => {
        if (!line && rOffset === lines.length - 1) return;
        const targetRow = activeCell.row + rOffset;
        if (targetRow >= activeSheet.rowCount) return;

        const cols = line.split('\t');
        cols.forEach((val, cOffset) => {
          const targetCol = activeCell.col + cOffset;
          if (targetCol >= activeSheet.colCount) return;

          const k = cellKey(targetRow, targetCol);
          const cell = updatedCells[k] || { raw: '' };
          updatedCells[k] = {
            ...cell,
            raw: val,
          };
        });
      });

      updateActiveSheetCells(updatedCells);
    } catch (e) {
      console.warn('Clipboard paste error', e);
    }
  }, [activeCell, activeSheet, updateActiveSheetCells]);

  const handleDeleteSelection = useCallback(() => {
    const norm = normalizeRange(selectionRange);
    const updatedCells = { ...activeSheet.cells };

    for (let r = norm.startRow; r <= norm.endRow; r++) {
      for (let c = norm.startCol; c <= norm.endCol; c++) {
        const k = cellKey(r, c);
        if (updatedCells[k]) {
          updatedCells[k] = {
            ...updatedCells[k],
            raw: '',
            computed: null,
            error: undefined,
          };
        }
      }
    }

    updateActiveSheetCells(updatedCells);
  }, [selectionRange, activeSheet.cells, updateActiveSheetCells]);

  // 18. AutoFill logic (copy downwards or rightwards)
  const handleAutoFill = useCallback(
    (source: CellRange, target: CellRange) => {
      const updatedCells = { ...activeSheet.cells };

      const srcWidth = source.endCol - source.startCol + 1;
      const srcHeight = source.endRow - source.startRow + 1;

      for (let r = target.startRow; r <= target.endRow; r++) {
        for (let c = target.startCol; c <= target.endCol; c++) {
          // If within source, skip
          if (
            r >= source.startRow &&
            r <= source.endRow &&
            c >= source.startCol &&
            c <= source.endCol
          ) {
            continue;
          }

          const srcR = source.startRow + ((r - target.startRow) % srcHeight);
          const srcC = source.startCol + ((c - target.startCol) % srcWidth);

          const srcCell = activeSheet.cells[cellKey(srcR, srcC)];
          if (srcCell) {
            const destKey = cellKey(r, c);
            updatedCells[destKey] = {
              raw: srcCell.raw,
              style: srcCell.style ? { ...srcCell.style } : undefined,
            };
          }
        }
      }

      updateActiveSheetCells(updatedCells);
      setSelectionRange(target);
    },
    [activeSheet.cells, updateActiveSheetCells]
  );

  // 19. Column & Row Resizing
  const handleUpdateColWidth = useCallback(
    (col: number, width: number) => {
      const updatedSheets = doc.sheets.map((s) => {
        if (s.id !== activeSheet.id) return s;
        return {
          ...s,
          colWidths: {
            ...s.colWidths,
            [col]: width,
          },
        };
      });
      updateDocument({ ...doc, sheets: updatedSheets }, false);
    },
    [doc, activeSheet.id, updateDocument]
  );

  const handleUpdateRowHeight = useCallback(
    (row: number, height: number) => {
      const updatedSheets = doc.sheets.map((s) => {
        if (s.id !== activeSheet.id) return s;
        return {
          ...s,
          rowHeights: {
            ...s.rowHeights,
            [row]: height,
          },
        };
      });
      updateDocument({ ...doc, sheets: updatedSheets }, false);
    },
    [doc, activeSheet.id, updateDocument]
  );

  // 20. Sheet Management Actions
  const handleSelectSheet = useCallback(
    (id: string) => {
      updateDocument({ ...doc, activeSheetId: id }, false);
      setActiveCell({ row: 0, col: 0 });
      setSelectionRange({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });
    },
    [doc, updateDocument]
  );

  const handleAddSheet = useCallback(() => {
    const nextNum = doc.sheets.length + 1;
    const newSheet = createEmptySheet(`sheet-${Date.now()}`, `Sheet${nextNum}`);
    updateDocument({
      ...doc,
      sheets: [...doc.sheets, newSheet],
      activeSheetId: newSheet.id,
    });
  }, [doc, updateDocument]);

  const handleRenameSheet = useCallback(
    (id: string, newName: string) => {
      const updatedSheets = doc.sheets.map((s) =>
        s.id === id ? { ...s, name: newName } : s
      );
      updateDocument({ ...doc, sheets: updatedSheets });
    },
    [doc, updateDocument]
  );

  const handleDuplicateSheet = useCallback(
    (id: string) => {
      const target = doc.sheets.find((s) => s.id === id);
      if (!target) return;
      const dup: Sheet = {
        ...target,
        id: `sheet-${Date.now()}`,
        name: `${target.name} (Copy)`,
        cells: { ...target.cells },
        colWidths: { ...target.colWidths },
        rowHeights: { ...target.rowHeights },
      };
      updateDocument({
        ...doc,
        sheets: [...doc.sheets, dup],
        activeSheetId: dup.id,
      });
    },
    [doc, updateDocument]
  );

  const handleDeleteSheet = useCallback(
    (id: string) => {
      if (doc.sheets.length <= 1) return;
      const remaining = doc.sheets.filter((s) => s.id !== id);
      const nextActiveId = doc.activeSheetId === id ? remaining[0].id : doc.activeSheetId;
      updateDocument({
        ...doc,
        sheets: remaining,
        activeSheetId: nextActiveId,
      });
    },
    [doc, updateDocument]
  );

  // 21. File / Header Actions
  const handleTitleChange = useCallback(
    (newTitle: string) => {
      updateDocument({ ...doc, title: newTitle });
    },
    [doc, updateDocument]
  );

  const handleNewSpreadsheet = useCallback(() => {
    const newSheet = createEmptySheet('sheet-1', 'Sheet1');
    updateDocument({
      id: `doc-${Date.now()}`,
      title: 'Untitled spreadsheet',
      sheets: [newSheet],
      activeSheetId: newSheet.id,
      updatedAt: Date.now(),
    });
  }, [updateDocument]);

  const handleLoadSample = useCallback(() => {
    const sample = createSampleDocument();
    updateDocument(sample);
  }, [updateDocument]);

  const handleExportCSV = useCallback(() => {
    exportSheetToCSV(activeSheet, doc.title);
  }, [activeSheet, doc.title]);

  const handleImportCSV = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) {
          const updated = importCSVToSheet(activeSheet, text);
          const updatedSheets = doc.sheets.map((s) =>
            s.id === activeSheet.id ? updated : s
          );
          updateDocument({
            ...doc,
            sheets: updatedSheets,
          });
        }
      };
      reader.readAsText(file);
    },
    [activeSheet, doc, updateDocument]
  );

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white font-sans text-gray-900 select-none">
      {/* 1. Header (Brand icon, Document title, Menu Bar, Save status) */}
      <Header
        title={doc.title}
        onTitleChange={handleTitleChange}
        onExportCSV={handleExportCSV}
        onImportCSV={handleImportCSV}
        onLoadSample={handleLoadSample}
        onNewSpreadsheet={handleNewSpreadsheet}
        onPrint={handlePrint}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onOpenFindReplace={() => setIsFindReplaceOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onJumpToCellPrompt={() => setIsJumpModalOpen(true)}
        savedTime={savedTime}
      />

      {/* 2. Formatting Toolbar */}
      <Toolbar
        currentStyle={activeCellStyle}
        onApplyStyle={handleApplyStyle}
        onClearFormat={handleClearFormat}
        onInsertFunction={handleInsertFunction}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onPrint={handlePrint}
        isFormatPainterActive={Boolean(formatPainterStyle)}
        onToggleFormatPainter={handleToggleFormatPainter}
      />

      {/* 3. Formula Bar (Name box + fx + Formula input) */}
      <FormulaBar
        activeCoord={activeCell}
        activeCellRaw={isEditing ? editValue : activeCellRaw}
        onUpdateActiveCellRaw={handleUpdateActiveCellRaw}
        onJumpToCoord={handleJumpToCoord}
      />

      {/* 4. Virtualized 1,000 x 1,000 Grid Viewport */}
      <div className="flex-1 w-full h-full relative overflow-hidden">
        <Grid
          sheet={activeSheet}
          activeCell={activeCell}
          selectionRange={selectionRange}
          isEditing={isEditing}
          editValue={editValue}
          onSelectCell={handleSelectCell}
          onRangeSelect={handleRangeSelect}
          onStartEdit={handleStartEdit}
          onEditChange={handleEditChange}
          onCommitEdit={handleCommitEdit}
          onCancelEdit={handleCancelEdit}
          onUpdateColWidth={handleUpdateColWidth}
          onUpdateRowHeight={handleUpdateRowHeight}
          onCopySelection={handleCopySelection}
          onPasteToSelection={handlePasteToSelection}
          onDeleteSelection={handleDeleteSelection}
          onAutoFill={handleAutoFill}
          onFormatPainterApply={formatPainterStyle ? handleFormatPainterApply : undefined}
          jumpTarget={jumpTarget}
          onJumpComplete={() => setJumpTarget(null)}
        />
      </div>

      {/* 5. Sheet Tabs and Status Bar (Summary stats like SUM, AVG, COUNT, MAX, MIN) */}
      <SheetTabs
        sheets={doc.sheets}
        activeSheetId={doc.activeSheetId}
        onSelectSheet={handleSelectSheet}
        onAddSheet={handleAddSheet}
        onRenameSheet={handleRenameSheet}
        onDuplicateSheet={handleDuplicateSheet}
        onDeleteSheet={handleDeleteSheet}
        selectionStats={selectionStats}
      />

      {/* 6. Modals */}
      <FindReplaceModal
        sheet={activeSheet}
        isOpen={isFindReplaceOpen}
        onClose={() => setIsFindReplaceOpen(false)}
        onSelectCell={(row, col) => handleJumpToCoord({ row, col })}
        onUpdateCells={updateActiveSheetCells}
      />

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      <JumpToCellModal
        isOpen={isJumpModalOpen}
        onClose={() => setIsJumpModalOpen(false)}
        onJump={handleJumpToCoord}
      />
    </div>
  );
}
