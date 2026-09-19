import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  CellCoord,
  CellRange,
  CellStyle,
  CellData,
  Sheet,
} from '../types/spreadsheet';
import {
  cellKey,
  colIndexToLabel,
  coordToA1,
  normalizeRange,
  isCoordInRange,
} from '../utils/coordinate';
import { formatCellValue } from '../utils/formula';
import { buildPrefixSums, findIndexAtOffset } from '../utils/prefixSum';

interface GridProps {
  sheet: Sheet;
  activeCell: CellCoord;
  selectionRange: CellRange;
  isEditing: boolean;
  editValue: string;
  onSelectCell: (coord: CellCoord, extendRange?: boolean) => void;
  onRangeSelect: (range: CellRange) => void;
  onStartEdit: (initialValue?: string) => void;
  onEditChange: (val: string) => void;
  onCommitEdit: (moveDir?: 'down' | 'right' | 'none') => void;
  onCancelEdit: () => void;
  onUpdateColWidth: (col: number, width: number) => void;
  onUpdateRowHeight: (row: number, height: number) => void;
  onCopySelection: () => void;
  onPasteToSelection: () => void;
  onDeleteSelection: () => void;
  onAutoFill: (sourceRange: CellRange, targetRange: CellRange) => void;
  onFormatPainterApply?: () => void;
  jumpTarget: CellCoord | null;
  onJumpComplete: () => void;
}

const DEFAULT_ROW_HEIGHT = 24;
const DEFAULT_COL_WIDTH = 100;
const HEADER_HEIGHT = 26;
const HEADER_WIDTH = 50;

export const Grid: React.FC<GridProps> = ({
  sheet,
  activeCell,
  selectionRange,
  isEditing,
  editValue,
  onSelectCell,
  onRangeSelect,
  onStartEdit,
  onEditChange,
  onCommitEdit,
  onCancelEdit,
  onUpdateColWidth,
  onUpdateRowHeight,
  onCopySelection,
  onPasteToSelection,
  onDeleteSelection,
  onAutoFill,
  onFormatPainterApply,
  jumpTarget,
  onJumpComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Viewport scroll offsets and client dimensions
  const [scrollPos, setScrollPos] = useState({ top: 0, left: 0 });
  const [viewportSize, setViewportSize] = useState({ width: 1200, height: 700 });

  // Mouse interaction state
  const isDraggingSelectionRef = useRef(false);
  const isDraggingAutoFillRef = useRef(false);
  const [autoFillEndCoord, setAutoFillEndCoord] = useState<CellCoord | null>(null);

  // Resize column or row state
  const resizingColRef = useRef<{ col: number; startX: number; startWidth: number } | null>(null);
  const resizingRowRef = useRef<{ row: number; startY: number; startHeight: number } | null>(null);
  const [resizeIndicator, setResizeIndicator] = useState<{
    type: 'col' | 'row';
    pos: number;
  } | null>(null);

  // 1. Build prefix sums for 1000 rows and 1000 cols
  const rowOffsets = useMemo(() => {
    return buildPrefixSums(sheet.rowCount, sheet.rowHeights, DEFAULT_ROW_HEIGHT);
  }, [sheet.rowCount, sheet.rowHeights]);

  const colOffsets = useMemo(() => {
    return buildPrefixSums(sheet.colCount, sheet.colWidths, DEFAULT_COL_WIDTH);
  }, [sheet.colCount, sheet.colWidths]);

  const totalWidth = colOffsets[sheet.colCount];
  const totalHeight = rowOffsets[sheet.rowCount];

  // 2. Measure viewport dimensions with ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setViewportSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 3. Track scroll position with requestAnimationFrame for 60fps virtualization
  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    setScrollPos({ top: el.scrollTop, left: el.scrollLeft });
  }, []);

  // 4. Calculate visible rows & columns (with overscan buffer for smooth scrolling)
  const startRow = Math.max(0, findIndexAtOffset(rowOffsets, scrollPos.top) - 4);
  const endRow = Math.min(
    sheet.rowCount - 1,
    findIndexAtOffset(rowOffsets, scrollPos.top + viewportSize.height) + 5
  );

  const startCol = Math.max(0, findIndexAtOffset(colOffsets, scrollPos.left) - 2);
  const endCol = Math.min(
    sheet.colCount - 1,
    findIndexAtOffset(colOffsets, scrollPos.left + viewportSize.width) + 3
  );

  // 5. Scroll cell into view when activeCell changes or when jumpTarget is set
  const scrollToCell = useCallback(
    (r: number, c: number) => {
      const el = containerRef.current;
      if (!el) return;

      const cellTop = rowOffsets[r];
      const cellBottom = rowOffsets[r + 1];
      const cellLeft = colOffsets[c];
      const cellRight = colOffsets[c + 1];

      const viewTop = el.scrollTop;
      const viewBottom = el.scrollTop + viewportSize.height - HEADER_HEIGHT;
      const viewLeft = el.scrollLeft;
      const viewRight = el.scrollLeft + viewportSize.width - HEADER_WIDTH;

      if (cellTop < viewTop) {
        el.scrollTop = cellTop;
      } else if (cellBottom > viewBottom) {
        el.scrollTop = cellBottom - viewportSize.height + HEADER_HEIGHT + 40;
      }

      if (cellLeft < viewLeft) {
        el.scrollLeft = cellLeft;
      } else if (cellRight > viewRight) {
        el.scrollLeft = cellRight - viewportSize.width + HEADER_WIDTH + 60;
      }
    },
    [rowOffsets, colOffsets, viewportSize]
  );

  useEffect(() => {
    if (jumpTarget) {
      scrollToCell(jumpTarget.row, jumpTarget.col);
      onJumpComplete();
    }
  }, [jumpTarget, scrollToCell, onJumpComplete]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // 6. Cell Mouse Down Handler
  const handleCellMouseDown = (e: React.MouseEvent, row: number, col: number) => {
    if (e.button !== 0) return; // Only left click

    if (onFormatPainterApply) {
      onSelectCell({ row, col });
      onFormatPainterApply();
      return;
    }

    if (e.shiftKey) {
      onSelectCell({ row, col }, true);
    } else {
      if (isEditing) {
        onCommitEdit('none');
      }
      onSelectCell({ row, col }, false);
      isDraggingSelectionRef.current = true;
    }
  };

  const handleCellMouseEnter = (row: number, col: number) => {
    if (isDraggingSelectionRef.current) {
      onSelectCell({ row, col }, true);
    } else if (isDraggingAutoFillRef.current) {
      setAutoFillEndCoord({ row, col });
    }
  };

  // Mouse up across window to complete dragging/resizing
  useEffect(() => {
    const handleMouseUp = () => {
      if (isDraggingSelectionRef.current) {
        isDraggingSelectionRef.current = false;
      }

      if (isDraggingAutoFillRef.current && autoFillEndCoord) {
        isDraggingAutoFillRef.current = false;
        const norm = normalizeRange(selectionRange);
        // Execute autofill
        const target: CellRange = {
          startRow: Math.min(norm.startRow, autoFillEndCoord.row),
          startCol: Math.min(norm.startCol, autoFillEndCoord.col),
          endRow: Math.max(norm.endRow, autoFillEndCoord.row),
          endCol: Math.max(norm.endCol, autoFillEndCoord.col),
        };
        onAutoFill(norm, target);
        setAutoFillEndCoord(null);
      }

      if (resizingColRef.current) {
        resizingColRef.current = null;
        setResizeIndicator(null);
      }

      if (resizingRowRef.current) {
        resizingRowRef.current = null;
        setResizeIndicator(null);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (resizingColRef.current) {
        const delta = e.clientX - resizingColRef.current.startX;
        const newW = Math.max(40, resizingColRef.current.startWidth + delta);
        onUpdateColWidth(resizingColRef.current.col, newW);
        setResizeIndicator({ type: 'col', pos: e.clientX });
      }

      if (resizingRowRef.current) {
        const delta = e.clientY - resizingRowRef.current.startY;
        const newH = Math.max(18, resizingRowRef.current.startHeight + delta);
        onUpdateRowHeight(resizingRowRef.current.row, newH);
        setResizeIndicator({ type: 'row', pos: e.clientY });
      }
    };

    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [selectionRange, autoFillEndCoord, onAutoFill, onUpdateColWidth, onUpdateRowHeight]);

  // 7. Keyboard Navigation & Shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isEditing) {
      if (e.key === 'Enter') {
        e.preventDefault();
        onCommitEdit(e.shiftKey ? 'none' : 'down');
        scrollToCell(Math.min(sheet.rowCount - 1, activeCell.row + 1), activeCell.col);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        onCommitEdit('right');
        scrollToCell(activeCell.row, Math.min(sheet.colCount - 1, activeCell.col + 1));
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancelEdit();
      }
      return;
    }

    // Navigation when NOT in edit mode
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const r = Math.max(0, activeCell.row - 1);
      onSelectCell({ row: r, col: activeCell.col }, e.shiftKey);
      scrollToCell(r, activeCell.col);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const r = Math.min(sheet.rowCount - 1, activeCell.row + 1);
      onSelectCell({ row: r, col: activeCell.col }, e.shiftKey);
      scrollToCell(r, activeCell.col);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const c = Math.max(0, activeCell.col - 1);
      onSelectCell({ row: activeCell.row, col: c }, e.shiftKey);
      scrollToCell(activeCell.row, c);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const c = Math.min(sheet.colCount - 1, activeCell.col + 1);
      onSelectCell({ row: activeCell.row, col: c }, e.shiftKey);
      scrollToCell(activeCell.row, c);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onStartEdit();
    } else if (e.key === 'F2') {
      e.preventDefault();
      onStartEdit();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const nextCol = e.shiftKey
        ? Math.max(0, activeCell.col - 1)
        : Math.min(sheet.colCount - 1, activeCell.col + 1);
      onSelectCell({ row: activeCell.row, col: nextCol });
      scrollToCell(activeCell.row, nextCol);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onDeleteSelection();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      e.preventDefault();
      onCopySelection();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      e.preventDefault();
      onPasteToSelection();
    } else if (
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      e.key.length === 1 &&
      e.key >= ' '
    ) {
      // Immediate typing begins editing cell
      e.preventDefault();
      onStartEdit(e.key);
    }
  };

  // 8. Normalized selection box coordinates
  const normSelection = useMemo(() => normalizeRange(selectionRange), [selectionRange]);

  const selBox = useMemo(() => {
    const left = colOffsets[normSelection.startCol];
    const top = rowOffsets[normSelection.startRow];
    const width = colOffsets[normSelection.endCol + 1] - left;
    const height = rowOffsets[normSelection.endRow + 1] - top;
    return { left, top, width, height };
  }, [normSelection, colOffsets, rowOffsets]);

  // Active cell box coordinates
  const activeBox = useMemo(() => {
    const left = colOffsets[activeCell.col];
    const top = rowOffsets[activeCell.row];
    const width = colOffsets[activeCell.col + 1] - left;
    const height = rowOffsets[activeCell.row + 1] - top;
    return { left, top, width, height };
  }, [activeCell, colOffsets, rowOffsets]);

  // 9. Resize Column Start Handler
  const handleColResizeStart = (e: React.MouseEvent, c: number) => {
    e.stopPropagation();
    e.preventDefault();
    const currentW = colOffsets[c + 1] - colOffsets[c];
    resizingColRef.current = {
      col: c,
      startX: e.clientX,
      startWidth: currentW,
    };
  };

  // 10. Resize Row Start Handler
  const handleRowResizeStart = (e: React.MouseEvent, r: number) => {
    e.stopPropagation();
    e.preventDefault();
    const currentH = rowOffsets[r + 1] - rowOffsets[r];
    resizingRowRef.current = {
      row: r,
      startY: e.clientY,
      startHeight: currentH,
    };
  };

  // Auto-Fill square drag start
  const handleAutoFillStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    isDraggingAutoFillRef.current = true;
    setAutoFillEndCoord(activeCell);
  };

  return (
    <div
      ref={containerRef}
      id="spreadsheet-grid-viewport"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onScroll={onScroll}
      className="flex-1 w-full h-full overflow-auto bg-[#f8f9fa] relative select-none outline-none"
      style={{
        scrollbarWidth: 'thin',
      }}
    >
      {/* Virtual Content Dimension Canvas */}
      <div
        className="relative"
        style={{
          width: totalWidth + HEADER_WIDTH,
          height: totalHeight + HEADER_HEIGHT,
        }}
      >
        {/* =========================================
            TOP-LEFT CORNER HEADER (Select All)
            ========================================= */}
        <div
          onClick={() => {
            onRangeSelect({
              startRow: 0,
              startCol: 0,
              endRow: sheet.rowCount - 1,
              endCol: sheet.colCount - 1,
            });
          }}
          className="fixed top-0 left-0 bg-[#f8f9fa] border-r border-b border-gray-300 z-40 flex items-center justify-center hover:bg-gray-200 cursor-pointer transition"
          style={{
            width: HEADER_WIDTH,
            height: HEADER_HEIGHT,
            position: 'sticky',
            top: 0,
            left: 0,
          }}
          title="Select all cells (1,000 x 1,000)"
        >
          <div className="w-2.5 h-2.5 bg-gray-400/50 rounded-xs" />
        </div>

        {/* =========================================
            STICKY COLUMN HEADERS (A ... ALL)
            ========================================= */}
        <div
          className="sticky top-0 z-30 flex bg-[#f8f9fa] border-b border-gray-300"
          style={{
            height: HEADER_HEIGHT,
            marginLeft: HEADER_WIDTH,
            width: totalWidth,
          }}
        >
          {Array.from({ length: endCol - startCol + 1 }).map((_, idx) => {
            const colIdx = startCol + idx;
            const left = colOffsets[colIdx];
            const width = colOffsets[colIdx + 1] - left;
            const isColSelected =
              colIdx >= normSelection.startCol && colIdx <= normSelection.endCol;

            return (
              <div
                key={colIdx}
                onClick={(e) => {
                  if (e.shiftKey) {
                    onRangeSelect({
                      ...selectionRange,
                      endCol: colIdx,
                    });
                  } else {
                    onRangeSelect({
                      startRow: 0,
                      startCol: colIdx,
                      endRow: sheet.rowCount - 1,
                      endCol: colIdx,
                    });
                  }
                }}
                className={`absolute top-0 h-full border-r border-gray-300 flex items-center justify-center text-[11px] font-semibold tracking-wider cursor-pointer group transition ${
                  isColSelected
                    ? 'bg-emerald-100 text-emerald-900 border-b-2 border-b-emerald-600'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
                style={{
                  left,
                  width,
                }}
              >
                <span>{colIndexToLabel(colIdx)}</span>

                {/* Column resize grabber handle */}
                <div
                  onMouseDown={(e) => handleColResizeStart(e, colIdx)}
                  className="absolute right-0 top-0 w-1.5 h-full cursor-col-resize hover:bg-emerald-500 z-10"
                />
              </div>
            );
          })}
        </div>

        {/* =========================================
            STICKY ROW HEADERS (1 ... 1000)
            ========================================= */}
        <div
          className="sticky left-0 z-20 bg-[#f8f9fa] border-r border-gray-300"
          style={{
            width: HEADER_WIDTH,
            height: totalHeight,
          }}
        >
          {Array.from({ length: endRow - startRow + 1 }).map((_, idx) => {
            const rowIdx = startRow + idx;
            const top = rowOffsets[rowIdx];
            const height = rowOffsets[rowIdx + 1] - top;
            const isRowSelected =
              rowIdx >= normSelection.startRow && rowIdx <= normSelection.endRow;

            return (
              <div
                key={rowIdx}
                onClick={(e) => {
                  if (e.shiftKey) {
                    onRangeSelect({
                      ...selectionRange,
                      endRow: rowIdx,
                    });
                  } else {
                    onRangeSelect({
                      startRow: rowIdx,
                      startCol: 0,
                      endRow: rowIdx,
                      endCol: sheet.colCount - 1,
                    });
                  }
                }}
                className={`absolute left-0 w-full border-b border-gray-300 flex items-center justify-center text-[11px] font-medium font-mono cursor-pointer transition ${
                  isRowSelected
                    ? 'bg-emerald-100 text-emerald-900 border-r-2 border-r-emerald-600'
                    : 'text-gray-500 hover:bg-gray-200'
                }`}
                style={{
                  top,
                  height,
                }}
              >
                <span>{rowIdx + 1}</span>

                {/* Row resize grabber handle */}
                <div
                  onMouseDown={(e) => handleRowResizeStart(e, rowIdx)}
                  className="absolute bottom-0 left-0 w-full h-1.5 cursor-row-resize hover:bg-emerald-500 z-10"
                />
              </div>
            );
          })}
        </div>

        {/* =========================================
            VIRTUALIZED CELLS VIEWPORT
            ========================================= */}
        <div
          className="absolute"
          style={{
            top: HEADER_HEIGHT,
            left: HEADER_WIDTH,
            width: totalWidth,
            height: totalHeight,
          }}
        >
          {/* Render visible cells */}
          {Array.from({ length: endRow - startRow + 1 }).flatMap((_, rIdx) => {
            const r = startRow + rIdx;
            const top = rowOffsets[r];
            const height = rowOffsets[r + 1] - top;

            return Array.from({ length: endCol - startCol + 1 }).map((_, cIdx) => {
              const c = startCol + cIdx;
              const left = colOffsets[c];
              const width = colOffsets[c + 1] - left;

              const k = cellKey(r, c);
              const cell = sheet.cells[k];
              const isCellActive = activeCell.row === r && activeCell.col === c;
              const inRange = isCoordInRange({ row: r, col: c }, normSelection);

              const formattedVal = cell
                ? formatCellValue(
                    cell.computed !== undefined && cell.computed !== null ? cell.computed : cell.raw,
                    cell.style?.format,
                    cell.style
                  )
                : '';

              const cellStyle = cell?.style || {};

              return (
                <div
                  key={k}
                  onMouseDown={(e) => handleCellMouseDown(e, r, c)}
                  onMouseEnter={() => handleCellMouseEnter(r, c)}
                  onDoubleClick={() => onStartEdit()}
                  className={`absolute border-r border-b border-gray-200 text-xs px-1.5 overflow-hidden whitespace-nowrap cursor-cell flex items-center ${
                    inRange && !isCellActive ? 'bg-blue-500/10' : ''
                  }`}
                  style={{
                    top,
                    left,
                    width,
                    height,
                    backgroundColor: cellStyle.bgColor || (inRange && !isCellActive ? undefined : '#ffffff'),
                    color: cellStyle.textColor || '#111827',
                    fontWeight: cellStyle.bold ? 'bold' : 'normal',
                    fontStyle: cellStyle.italic ? 'italic' : 'normal',
                    textDecoration: [
                      cellStyle.underline ? 'underline' : '',
                      cellStyle.strikethrough ? 'line-through' : '',
                    ]
                      .filter(Boolean)
                      .join(' ') || undefined,
                    fontSize: cellStyle.fontSize ? `${cellStyle.fontSize}px` : '11.5px',
                    justifyContent:
                      cellStyle.align === 'right'
                        ? 'flex-end'
                        : cellStyle.align === 'center'
                        ? 'center'
                        : 'flex-start',
                    borderTop: cellStyle.border === 'all' || cellStyle.border === 'top' ? '1px solid #94a3b8' : undefined,
                    borderBottom: cellStyle.border === 'all' || cellStyle.border === 'bottom' ? '1px solid #94a3b8' : undefined,
                    borderLeft: cellStyle.border === 'all' || cellStyle.border === 'left' ? '1px solid #94a3b8' : undefined,
                    borderRight: cellStyle.border === 'all' || cellStyle.border === 'right' ? '1px solid #94a3b8' : undefined,
                  }}
                  title={`${coordToA1(r, c)}: ${cell?.raw || ''}`}
                >
                  <span className="truncate">{formattedVal}</span>
                </div>
              );
            });
          })}

          {/* =========================================
              SELECTION HIGHLIGHT & OUTLINE BOX
              ========================================= */}
          <div
            className="absolute pointer-events-none border-2 border-blue-600 bg-blue-500/8 z-10 transition-[width,height,left,top] duration-75"
            style={{
              left: selBox.left,
              top: selBox.top,
              width: selBox.width,
              height: selBox.height,
            }}
          >
            {/* Auto-Fill Drag Handle (Little blue square at bottom-right corner) */}
            <div
              onMouseDown={handleAutoFillStart}
              className="absolute -bottom-1.5 -right-1.5 w-2.5 h-2.5 bg-blue-600 border border-white pointer-events-auto cursor-crosshair z-20 hover:scale-125 transition"
              title="Drag to auto-fill cells"
            />
          </div>

          {/* Active Cell Focus Ring if Range is Larger than single cell */}
          {(normSelection.startRow !== normSelection.endRow ||
            normSelection.startCol !== normSelection.endCol) && (
            <div
              className="absolute pointer-events-none border border-blue-400 z-15"
              style={{
                left: activeBox.left,
                top: activeBox.top,
                width: activeBox.width,
                height: activeBox.height,
              }}
            />
          )}

          {/* =========================================
              IN-CELL EDITING INPUT OVERLAY
              ========================================= */}
          {isEditing && (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              className="absolute z-25 bg-white border-2 border-blue-600 px-1.5 outline-none shadow-md text-xs font-mono"
              style={{
                left: activeBox.left - 1,
                top: activeBox.top - 1,
                width: Math.max(activeBox.width + 2, 120),
                height: activeBox.height + 2,
                fontSize: sheet.cells[cellKey(activeCell.row, activeCell.col)]?.style?.fontSize
                  ? `${sheet.cells[cellKey(activeCell.row, activeCell.col)]?.style?.fontSize}px`
                  : '12px',
                fontWeight: sheet.cells[cellKey(activeCell.row, activeCell.col)]?.style?.bold
                  ? 'bold'
                  : 'normal',
                fontStyle: sheet.cells[cellKey(activeCell.row, activeCell.col)]?.style?.italic
                  ? 'italic'
                  : 'normal',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
