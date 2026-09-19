import { SpreadsheetDocument, Sheet, CellData } from '../types/spreadsheet';
import { cellKey, coordToA1 } from './coordinate';
import { evaluateCell } from './formula';

const STORAGE_KEY = 'gsheet_app_data_v1';

export function createEmptySheet(id: string, name: string): Sheet {
  return {
    id,
    name,
    rowCount: 1000,
    colCount: 1000,
    cells: {},
    colWidths: {
      0: 160, // Col A often holds descriptions
      1: 110,
      2: 110,
      3: 110,
      4: 110,
      5: 120,
    },
    rowHeights: {},
  };
}

export function createSampleDocument(): SpreadsheetDocument {
  const sheet1 = createEmptySheet('sheet-1', 'Financial Model');

  // Populate rich realistic spreadsheet with formulas, styles, and numbers
  const cells: Record<string, CellData> = {};

  const setCell = (row: number, col: number, raw: string, style?: CellData['style']) => {
    const k = cellKey(row, col);
    cells[k] = {
      raw,
      style,
    };
  };

  // Title Banner
  setCell(0, 0, '2026 Global Tech Inc. - Annual Financial Forecast (in USD)', {
    bold: true,
    fontSize: 16,
    textColor: '#1e3a8a',
  });
  setCell(1, 0, 'Model dimensions: 1,000 Rows × 1,000 Columns (1,000,000 Virtualized Cells)', {
    italic: true,
    textColor: '#64748b',
    fontSize: 11,
  });

  // Headers (Row 3)
  const headers = ['Category / Line Item', 'Q1 Actual', 'Q2 Projected', 'Q3 Projected', 'Q4 Projected', 'Full Year Total', 'Quarterly Average', 'Growth Rate'];
  headers.forEach((h, idx) => {
    setCell(3, idx, h, {
      bold: true,
      bgColor: '#166534',
      textColor: '#ffffff',
      align: idx === 0 ? 'left' : 'right',
      border: 'all',
    });
  });

  // Revenue section
  setCell(4, 0, 'Revenue Streams', { bold: true, bgColor: '#f0fdf4', textColor: '#14532d' });
  const revItems = [
    { name: 'Cloud SaaS Subscriptions', q1: 185000, q2: 215000, q3: 248000, q4: 290000 },
    { name: 'Enterprise API License Fees', q1: 120000, q2: 135000, q3: 152000, q4: 175000 },
    { name: 'Professional Services & Training', q1: 45000, q2: 52000, q3: 49000, q4: 61000 },
    { name: 'Developer Marketplace Add-ons', q1: 28000, q2: 34000, q3: 41000, q4: 53000 },
  ];

  revItems.forEach((item, i) => {
    const r = 5 + i;
    setCell(r, 0, item.name, { align: 'left' });
    setCell(r, 1, String(item.q1), { format: 'currency', align: 'right' });
    setCell(r, 2, String(item.q2), { format: 'currency', align: 'right' });
    setCell(r, 3, String(item.q3), { format: 'currency', align: 'right' });
    setCell(r, 4, String(item.q4), { format: 'currency', align: 'right' });
    // Formulas!
    setCell(r, 5, `=SUM(B${r + 1}:E${r + 1})`, { format: 'currency', bold: true, align: 'right' });
    setCell(r, 6, `=AVERAGE(B${r + 1}:E${r + 1})`, { format: 'currency', align: 'right' });
    setCell(r, 7, `=(E${r + 1}-B${r + 1})/B${r + 1}`, { format: 'percent', align: 'right' });
  });

  // Total Revenue Row
  const totalRevRow = 9;
  setCell(totalRevRow, 0, 'Total Gross Revenue', { bold: true, bgColor: '#dcfce7', textColor: '#166534' });
  setCell(totalRevRow, 1, '=SUM(B6:B9)', { format: 'currency', bold: true, bgColor: '#dcfce7', align: 'right' });
  setCell(totalRevRow, 2, '=SUM(C6:C9)', { format: 'currency', bold: true, bgColor: '#dcfce7', align: 'right' });
  setCell(totalRevRow, 3, '=SUM(D6:D9)', { format: 'currency', bold: true, bgColor: '#dcfce7', align: 'right' });
  setCell(totalRevRow, 4, '=SUM(E6:E9)', { format: 'currency', bold: true, bgColor: '#dcfce7', align: 'right' });
  setCell(totalRevRow, 5, '=SUM(F6:F9)', { format: 'currency', bold: true, bgColor: '#dcfce7', align: 'right' });
  setCell(totalRevRow, 6, '=AVERAGE(B10:E10)', { format: 'currency', bold: true, bgColor: '#dcfce7', align: 'right' });
  setCell(totalRevRow, 7, '=(E10-B10)/B10', { format: 'percent', bold: true, bgColor: '#dcfce7', align: 'right' });

  // Operating Expenses Section
  setCell(11, 0, 'Operating Expenses (OpEx)', { bold: true, bgColor: '#fef2f2', textColor: '#991b1b' });
  const opexItems = [
    { name: 'Cloud Server Infrastructure', q1: 42000, q2: 48000, q3: 55000, q4: 64000 },
    { name: 'Research & Engineering Salaries', q1: 110000, q2: 125000, q3: 135000, q4: 145000 },
    { name: 'Sales & Growth Marketing', q1: 58000, q2: 65000, q3: 72000, q4: 84000 },
    { name: 'Office, Legal & Compliance', q1: 22000, q2: 24000, q3: 25000, q4: 26000 },
  ];

  opexItems.forEach((item, i) => {
    const r = 12 + i;
    setCell(r, 0, item.name, { align: 'left' });
    setCell(r, 1, String(item.q1), { format: 'currency', align: 'right' });
    setCell(r, 2, String(item.q2), { format: 'currency', align: 'right' });
    setCell(r, 3, String(item.q3), { format: 'currency', align: 'right' });
    setCell(r, 4, String(item.q4), { format: 'currency', align: 'right' });
    setCell(r, 5, `=SUM(B${r + 1}:E${r + 1})`, { format: 'currency', bold: true, align: 'right' });
    setCell(r, 6, `=AVERAGE(B${r + 1}:E${r + 1})`, { format: 'currency', align: 'right' });
    setCell(r, 7, `=(E${r + 1}-B${r + 1})/B${r + 1}`, { format: 'percent', align: 'right' });
  });

  // Total OpEx Row
  const totalOpexRow = 16;
  setCell(totalOpexRow, 0, 'Total Operating Expenses', { bold: true, bgColor: '#fee2e2', textColor: '#991b1b' });
  setCell(totalOpexRow, 1, '=SUM(B13:B16)', { format: 'currency', bold: true, bgColor: '#fee2e2', align: 'right' });
  setCell(totalOpexRow, 2, '=SUM(C13:C16)', { format: 'currency', bold: true, bgColor: '#fee2e2', align: 'right' });
  setCell(totalOpexRow, 3, '=SUM(D13:D16)', { format: 'currency', bold: true, bgColor: '#fee2e2', align: 'right' });
  setCell(totalOpexRow, 4, '=SUM(E13:E16)', { format: 'currency', bold: true, bgColor: '#fee2e2', align: 'right' });
  setCell(totalOpexRow, 5, '=SUM(F13:F16)', { format: 'currency', bold: true, bgColor: '#fee2e2', align: 'right' });
  setCell(totalOpexRow, 6, '=AVERAGE(B17:E17)', { format: 'currency', bold: true, bgColor: '#fee2e2', align: 'right' });
  setCell(totalOpexRow, 7, '=(E17-B17)/B17', { format: 'percent', bold: true, bgColor: '#fee2e2', align: 'right' });

  // Net Operating Income (EBITDA)
  const netRow = 18;
  setCell(netRow, 0, 'Net Operating Income (EBITDA)', { bold: true, bgColor: '#dbeafe', textColor: '#1e40af' });
  setCell(netRow, 1, '=B10-B17', { format: 'currency', bold: true, bgColor: '#dbeafe', align: 'right' });
  setCell(netRow, 2, '=C10-C17', { format: 'currency', bold: true, bgColor: '#dbeafe', align: 'right' });
  setCell(netRow, 3, '=D10-D17', { format: 'currency', bold: true, bgColor: '#dbeafe', align: 'right' });
  setCell(netRow, 4, '=E10-E17', { format: 'currency', bold: true, bgColor: '#dbeafe', align: 'right' });
  setCell(netRow, 5, '=F10-F17', { format: 'currency', bold: true, bgColor: '#dbeafe', align: 'right' });
  setCell(netRow, 6, '=AVERAGE(B19:E19)', { format: 'currency', bold: true, bgColor: '#dbeafe', align: 'right' });
  setCell(netRow, 7, '=(E19-B19)/B19', { format: 'percent', bold: true, bgColor: '#dbeafe', align: 'right' });

  // Profit Margin %
  const marginRow = 19;
  setCell(marginRow, 0, 'Net Profit Margin %', { bold: true, bgColor: '#eff6ff', textColor: '#1e40af' });
  setCell(marginRow, 1, '=B19/B10', { format: 'percent', bold: true, bgColor: '#eff6ff', align: 'right' });
  setCell(marginRow, 2, '=C19/C10', { format: 'percent', bold: true, bgColor: '#eff6ff', align: 'right' });
  setCell(marginRow, 3, '=D19/D10', { format: 'percent', bold: true, bgColor: '#eff6ff', align: 'right' });
  setCell(marginRow, 4, '=E19/E10', { format: 'percent', bold: true, bgColor: '#eff6ff', align: 'right' });
  setCell(marginRow, 5, '=F19/F10', { format: 'percent', bold: true, bgColor: '#eff6ff', align: 'right' });
  setCell(marginRow, 6, '=AVERAGE(B20:E20)', { format: 'percent', bold: true, bgColor: '#eff6ff', align: 'right' });
  setCell(marginRow, 7, '="Target met: YES"', { italic: true, bgColor: '#eff6ff', align: 'right' });

  // Add a sample test entry far down to showcase 1000 rows & 1000 cols
  setCell(99, 0, 'Row 100 Milestone Checkpoint', { bold: true, bgColor: '#fef9c3' });
  setCell(99, 1, 'Quick Jump Proof', { italic: true });

  setCell(499, 25, 'Halfway cell Z500!', { bold: true, bgColor: '#ede9fe', textColor: '#6b21a8' });
  setCell(999, 999, 'Boundary cell ALL1000 (Row 1000, Col 1000)!', {
    bold: true,
    bgColor: '#fef08a',
    textColor: '#854d0e',
  });

  // Evaluate computed values for all cells
  for (const [k, cell] of Object.entries(cells)) {
    const res = evaluateCell(cell.raw, k, cells);
    cell.computed = res.value;
    if (res.error) cell.error = res.error;
  }

  sheet1.cells = cells;

  const sheet2 = createEmptySheet('sheet-2', 'Product Inventory');
  sheet2.cells[cellKey(0, 0)] = { raw: 'SKU Inventory List', style: { bold: true, fontSize: 14 } };
  sheet2.cells[cellKey(2, 0)] = { raw: 'Item Code', style: { bold: true, bgColor: '#0284c7', textColor: '#ffffff' } };
  sheet2.cells[cellKey(2, 1)] = { raw: 'Product Name', style: { bold: true, bgColor: '#0284c7', textColor: '#ffffff' } };
  sheet2.cells[cellKey(2, 2)] = { raw: 'Stock Qty', style: { bold: true, bgColor: '#0284c7', textColor: '#ffffff' } };
  sheet2.cells[cellKey(2, 3)] = { raw: 'Unit Cost', style: { bold: true, bgColor: '#0284c7', textColor: '#ffffff' } };
  sheet2.cells[cellKey(2, 4)] = { raw: 'Total Value', style: { bold: true, bgColor: '#0284c7', textColor: '#ffffff' } };

  sheet2.cells[cellKey(3, 0)] = { raw: 'PRD-001', computed: 'PRD-001' };
  sheet2.cells[cellKey(3, 1)] = { raw: 'Ultra-Slim Mechanical Keyboard', computed: 'Ultra-Slim Mechanical Keyboard' };
  sheet2.cells[cellKey(3, 2)] = { raw: '250', computed: 250, style: { format: 'number', align: 'right' } };
  sheet2.cells[cellKey(3, 3)] = { raw: '89.5', computed: 89.5, style: { format: 'currency', align: 'right' } };
  sheet2.cells[cellKey(3, 4)] = { raw: '=C4*D4', computed: 22375, style: { format: 'currency', bold: true, align: 'right' } };

  return {
    id: 'doc-1',
    title: 'Untitled spreadsheet',
    sheets: [sheet1, sheet2],
    activeSheetId: 'sheet-1',
    updatedAt: Date.now(),
  };
}

export function loadDocumentFromStorage(): SpreadsheetDocument {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as SpreadsheetDocument;
      if (parsed && Array.isArray(parsed.sheets) && parsed.sheets.length > 0) {
        // Ensure rowCount and colCount are 1000
        parsed.sheets.forEach(s => {
          if (!s.rowCount || s.rowCount < 1000) s.rowCount = 1000;
          if (!s.colCount || s.colCount < 1000) s.colCount = 1000;
          if (!s.colWidths) s.colWidths = {};
          if (!s.rowHeights) s.rowHeights = {};
          if (!s.cells) s.cells = {};
        });
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load spreadsheet from localStorage', e);
  }
  return createSampleDocument();
}

export function saveDocumentToStorage(doc: SpreadsheetDocument): void {
  try {
    const toSave = {
      ...doc,
      updatedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.error('Failed to save spreadsheet to localStorage', e);
  }
}

export function clearDocumentStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error(e);
  }
}

/**
 * Exports current sheet to CSV
 */
export function exportSheetToCSV(sheet: Sheet, docTitle: string): void {
  // Find highest row and col with data
  let maxR = 0;
  let maxC = 0;
  for (const k of Object.keys(sheet.cells)) {
    const [r, c] = k.split(':').map(Number);
    if (!isNaN(r) && r > maxR) maxR = r;
    if (!isNaN(c) && c > maxC) maxC = c;
  }

  // Minimum export bounds: at least 10 rows x 5 cols
  maxR = Math.min(sheet.rowCount - 1, Math.max(10, maxR));
  maxC = Math.min(sheet.colCount - 1, Math.max(5, maxC));

  const rows: string[] = [];
  for (let r = 0; r <= maxR; r++) {
    const rowCells: string[] = [];
    for (let c = 0; c <= maxC; c++) {
      const cell = sheet.cells[cellKey(r, c)];
      let val = '';
      if (cell) {
        val = cell.computed !== undefined && cell.computed !== null ? String(cell.computed) : cell.raw || '';
      }
      // Escape quotes and commas
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        val = `"${val.replace(/"/g, '""')}"`;
      }
      rowCells.push(val);
    }
    rows.push(rowCells.join(','));
  }

  const csvContent = '\uFEFF' + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${(docTitle || 'Spreadsheet').replace(/\s+/g, '_')}_${sheet.name}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Imports CSV text into a sheet
 */
export function importCSVToSheet(sheet: Sheet, csvText: string): Sheet {
  const lines = csvText.split(/\r\n|\n|\r/);
  const newCells = { ...sheet.cells };

  lines.forEach((line, r) => {
    if (r >= sheet.rowCount) return;
    if (!line.trim()) return;

    // Simple CSV parser supporting quotes
    const cells: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        cells.push(cur);
        cur = '';
      } else {
        cur += char;
      }
    }
    cells.push(cur);

    cells.forEach((cellVal, c) => {
      if (c >= sheet.colCount) return;
      const trimmed = cellVal.trim();
      if (trimmed) {
        const k = cellKey(r, c);
        const evalRes = evaluateCell(trimmed, k, newCells);
        newCells[k] = {
          raw: trimmed,
          computed: evalRes.value,
          error: evalRes.error,
        };
      }
    });
  });

  return {
    ...sheet,
    cells: newCells,
  };
}
