import { CellCoord, CellRange } from '../types/spreadsheet';

/**
 * Converts a 0-based column index to an Excel/Sheets column label.
 * e.g., 0 -> A, 25 -> Z, 26 -> AA, 999 -> ALL
 */
export function colIndexToLabel(index: number): string {
  if (index < 0) return 'A';
  let temp = index;
  let label = '';
  while (temp >= 0) {
    label = String.fromCharCode((temp % 26) + 65) + label;
    temp = Math.floor(temp / 26) - 1;
  }
  return label;
}

/**
 * Converts an Excel/Sheets column label to a 0-based column index.
 * e.g., 'A' -> 0, 'Z' -> 25, 'AA' -> 26, 'ALL' -> 999
 */
export function labelToColIndex(label: string): number {
  if (!label) return 0;
  const clean = label.toUpperCase().trim();
  let result = 0;
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    if (code < 65 || code > 90) continue;
    result = result * 26 + (code - 64);
  }
  return Math.max(0, result - 1);
}

/**
 * Converts 0-based row and col to A1 notation.
 * e.g., (0, 0) -> "A1", (999, 999) -> "ALL1000"
 */
export function coordToA1(row: number, col: number): string {
  return `${colIndexToLabel(col)}${row + 1}`;
}

/**
 * Parses A1 notation into 0-based { row, col }.
 * Returns null if invalid.
 */
export function a1ToCoord(a1: string): CellCoord | null {
  if (!a1) return null;
  const match = a1.trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  const colLabel = match[1];
  const rowNum = parseInt(match[2], 10);
  if (isNaN(rowNum) || rowNum <= 0) return null;
  return {
    row: rowNum - 1,
    col: labelToColIndex(colLabel),
  };
}

/**
 * Returns canonical cell map key "row:col"
 */
export function cellKey(row: number, col: number): string {
  return `${row}:${col}`;
}

/**
 * Parses "row:col" to { row, col }
 */
export function parseCellKey(key: string): CellCoord {
  const parts = key.split(':');
  return {
    row: parseInt(parts[0], 10) || 0,
    col: parseInt(parts[1], 10) || 0,
  };
}

/**
 * Parses a range like "A1:B5" or "A1" into a normalized CellRange.
 */
export function parseRange(rangeStr: string): CellRange | null {
  if (!rangeStr) return null;
  const parts = rangeStr.trim().split(':');
  if (parts.length === 1) {
    const coord = a1ToCoord(parts[0]);
    if (!coord) return null;
    return {
      startRow: coord.row,
      startCol: coord.col,
      endRow: coord.row,
      endCol: coord.col,
    };
  }
  if (parts.length === 2) {
    const c1 = a1ToCoord(parts[0]);
    const c2 = a1ToCoord(parts[1]);
    if (!c1 || !c2) return null;
    return {
      startRow: Math.min(c1.row, c2.row),
      startCol: Math.min(c1.col, c2.col),
      endRow: Math.max(c1.row, c2.row),
      endCol: Math.max(c1.col, c2.col),
    };
  }
  return null;
}

/**
 * Checks if a coordinate is within a range.
 */
export function isCoordInRange(coord: CellCoord, range: CellRange): boolean {
  const minRow = Math.min(range.startRow, range.endRow);
  const maxRow = Math.max(range.startRow, range.endRow);
  const minCol = Math.min(range.startCol, range.endCol);
  const maxCol = Math.max(range.startCol, range.endCol);

  return (
    coord.row >= minRow &&
    coord.row <= maxRow &&
    coord.col >= minCol &&
    coord.col <= maxCol
  );
}

/**
 * Normalizes a range so start <= end
 */
export function normalizeRange(range: CellRange): CellRange {
  return {
    startRow: Math.min(range.startRow, range.endRow),
    startCol: Math.min(range.startCol, range.endCol),
    endRow: Math.max(range.startRow, range.endRow),
    endCol: Math.max(range.startCol, range.endCol),
  };
}
