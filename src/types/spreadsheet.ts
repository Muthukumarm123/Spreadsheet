export type CellFormat = 'general' | 'number' | 'currency' | 'percent' | 'date' | 'text';

export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  textColor?: string;
  bgColor?: string;
  align?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  fontSize?: number;
  fontFamily?: string;
  format?: CellFormat;
  border?: 'none' | 'all' | 'outer' | 'bottom' | 'top' | 'left' | 'right';
}

export interface CellData {
  raw: string; // raw input, e.g. "=SUM(A1:A5)" or "100" or "Sales"
  computed?: string | number | null; // evaluated result
  error?: string;
  style?: CellStyle;
}

export interface CellCoord {
  row: number; // 0-based
  col: number; // 0-based
}

export interface CellRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export interface Sheet {
  id: string;
  name: string;
  rowCount: number; // default 1000
  colCount: number; // default 1000
  cells: Record<string, CellData>; // key is "row:col" e.g. "0:0"
  colWidths: Record<number, number>; // colIndex -> width in px
  rowHeights: Record<number, number>; // rowIndex -> height in px
}

export interface SpreadsheetDocument {
  id: string;
  title: string;
  sheets: Sheet[];
  activeSheetId: string;
  updatedAt: number;
}

export interface SelectionStats {
  sum: number | null;
  avg: number | null;
  min: number | null;
  max: number | null;
  count: number;
  numCount: number;
}
