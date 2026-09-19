import { CellData, CellFormat, CellStyle } from '../types/spreadsheet';
import { a1ToCoord, cellKey, parseRange } from './coordinate';

interface FormulaContext {
  cells: Record<string, CellData>;
  visiting?: Set<string>;
}

/**
 * Parses and evaluates a raw cell string.
 * If starts with '=', treats as formula. Otherwise returns trimmed/parsed value.
 */
export function evaluateCell(
  raw: string,
  key: string,
  cells: Record<string, CellData>,
  visiting: Set<string> = new Set()
): { value: string | number | null; error?: string } {
  if (!raw || typeof raw !== 'string') {
    return { value: null };
  }

  const trimmed = raw.trim();
  if (!trimmed.startsWith('=')) {
    // Check if numeric
    const num = Number(trimmed);
    if (!isNaN(num) && trimmed !== '') {
      return { value: num };
    }
    return { value: raw };
  }

  // Check circular reference
  if (visiting.has(key)) {
    return { value: '#REF!', error: 'Circular reference detected' };
  }

  visiting.add(key);
  try {
    const expr = trimmed.substring(1).trim();
    const result = evaluateExpression(expr, { cells, visiting });
    visiting.delete(key);
    return { value: result };
  } catch (err: any) {
    visiting.delete(key);
    const msg = err?.message || 'Formula error';
    if (msg.includes('DIV/0')) return { value: '#DIV/0!', error: msg };
    if (msg.includes('REF')) return { value: '#REF!', error: msg };
    if (msg.includes('VALUE')) return { value: '#VALUE!', error: msg };
    return { value: '#ERROR!', error: msg };
  }
}

/**
 * Evaluates an expression string like:
 * SUM(A1:A5)
 * A1 + B1 * 2
 * IF(A1 > 10, "Yes", "No")
 */
function evaluateExpression(expr: string, ctx: FormulaContext): string | number {
  if (!expr) return '';

  // 1. Check for functions like SUM(...), AVERAGE(...), etc.
  const fnMatch = expr.match(/^([A-Z_]+)\s*\((.*)\)$/i);
  if (fnMatch) {
    const fnName = fnMatch[1].toUpperCase();
    const innerArgs = splitArgs(fnMatch[2]);
    return executeFunction(fnName, innerArgs, ctx);
  }

  // 2. Expand range references or cell references inside arithmetic expressions
  // Replace cell references (e.g. A1, B2) with their evaluated numeric or string values
  const tokenized = replaceCellReferencesInExpr(expr, ctx);

  // 3. Evaluate safe math expression
  return safeMathEval(tokenized);
}

/**
 * Splits comma-separated arguments at top level (ignoring commas inside nested parentheses/quotes)
 */
function splitArgs(argStr: string): string[] {
  const args: string[] = [];
  let current = '';
  let depth = 0;
  let inQuotes = false;

  for (let i = 0; i < argStr.length; i++) {
    const char = argStr[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === '(' && !inQuotes) {
      depth++;
      current += char;
    } else if (char === ')' && !inQuotes) {
      depth--;
      current += char;
    } else if (char === ',' && depth === 0 && !inQuotes) {
      args.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim().length > 0) {
    args.push(current.trim());
  }
  return args;
}

/**
 * Resolves a range like "A1:A5" or single cell "A1" into an array of values
 */
function resolveRangeValues(rangeStr: string, ctx: FormulaContext): (number | string)[] {
  const clean = rangeStr.trim();
  const range = parseRange(clean);
  if (!range) {
    // Might be a literal value or sub-expression
    const subVal = evaluateExpression(clean, ctx);
    return [subVal];
  }

  const values: (number | string)[] = [];
  for (let r = range.startRow; r <= range.endRow; r++) {
    for (let c = range.startCol; c <= range.endCol; c++) {
      const k = cellKey(r, c);
      const cell = ctx.cells[k];
      if (cell && cell.raw) {
        const evalRes = evaluateCell(cell.raw, k, ctx.cells, new Set(ctx.visiting));
        if (evalRes.value !== null && evalRes.value !== '') {
          values.push(evalRes.value);
        }
      }
    }
  }
  return values;
}

/**
 * Filter numbers from range values
 */
function extractNumbers(values: (number | string)[]): number[] {
  return values
    .map(v => {
      if (typeof v === 'number') return v;
      if (typeof v === 'string') {
        const n = Number(v.replace(/[$,]/g, ''));
        return isNaN(n) ? null : n;
      }
      return null;
    })
    .filter((v): v is number => v !== null);
}

/**
 * Executes a known spreadsheet function
 */
function executeFunction(fnName: string, rawArgs: string[], ctx: FormulaContext): string | number {
  switch (fnName) {
    case 'SUM': {
      let nums: number[] = [];
      for (const arg of rawArgs) {
        nums = nums.concat(extractNumbers(resolveRangeValues(arg, ctx)));
      }
      const sum = nums.reduce((acc, curr) => acc + curr, 0);
      return Math.round(sum * 100000) / 100000;
    }

    case 'AVERAGE':
    case 'AVG': {
      let nums: number[] = [];
      for (const arg of rawArgs) {
        nums = nums.concat(extractNumbers(resolveRangeValues(arg, ctx)));
      }
      if (nums.length === 0) return 0;
      const sum = nums.reduce((acc, curr) => acc + curr, 0);
      return Math.round((sum / nums.length) * 100000) / 100000;
    }

    case 'COUNT': {
      let count = 0;
      for (const arg of rawArgs) {
        count += extractNumbers(resolveRangeValues(arg, ctx)).length;
      }
      return count;
    }

    case 'COUNTA': {
      let count = 0;
      for (const arg of rawArgs) {
        count += resolveRangeValues(arg, ctx).filter(v => v !== null && v !== '').length;
      }
      return count;
    }

    case 'MIN': {
      let nums: number[] = [];
      for (const arg of rawArgs) {
        nums = nums.concat(extractNumbers(resolveRangeValues(arg, ctx)));
      }
      if (nums.length === 0) return 0;
      return Math.min(...nums);
    }

    case 'MAX': {
      let nums: number[] = [];
      for (const arg of rawArgs) {
        nums = nums.concat(extractNumbers(resolveRangeValues(arg, ctx)));
      }
      if (nums.length === 0) return 0;
      return Math.max(...nums);
    }

    case 'PRODUCT': {
      let nums: number[] = [];
      for (const arg of rawArgs) {
        nums = nums.concat(extractNumbers(resolveRangeValues(arg, ctx)));
      }
      if (nums.length === 0) return 0;
      return nums.reduce((acc, curr) => acc * curr, 1);
    }

    case 'ROUND': {
      if (rawArgs.length === 0) return 0;
      const val = Number(evaluateExpression(rawArgs[0], ctx));
      const decimals = rawArgs.length > 1 ? Number(evaluateExpression(rawArgs[1], ctx)) : 0;
      const factor = Math.pow(10, decimals);
      return Math.round(val * factor) / factor;
    }

    case 'ABS': {
      if (rawArgs.length === 0) return 0;
      const val = Number(evaluateExpression(rawArgs[0], ctx));
      return Math.abs(val);
    }

    case 'SQRT': {
      if (rawArgs.length === 0) return 0;
      const val = Number(evaluateExpression(rawArgs[0], ctx));
      if (val < 0) throw new Error('#NUM! Negative square root');
      return Math.sqrt(val);
    }

    case 'POWER': {
      if (rawArgs.length < 2) throw new Error('#VALUE! Missing arguments');
      const base = Number(evaluateExpression(rawArgs[0], ctx));
      const exp = Number(evaluateExpression(rawArgs[1], ctx));
      return Math.pow(base, exp);
    }

    case 'IF': {
      if (rawArgs.length < 2) throw new Error('#VALUE! IF requires at least 2 arguments');
      const conditionStr = rawArgs[0];
      const trueVal = evaluateExpression(rawArgs[1], ctx);
      const falseVal = rawArgs.length > 2 ? evaluateExpression(rawArgs[2], ctx) : '';
      const condResult = evaluateCondition(conditionStr, ctx);
      return condResult ? trueVal : falseVal;
    }

    case 'CONCAT':
    case 'CONCATENATE': {
      let str = '';
      for (const arg of rawArgs) {
        const val = evaluateExpression(arg, ctx);
        str += String(val ?? '');
      }
      return str;
    }

    case 'UPPER': {
      const val = evaluateExpression(rawArgs[0] || '', ctx);
      return String(val ?? '').toUpperCase();
    }

    case 'LOWER': {
      const val = evaluateExpression(rawArgs[0] || '', ctx);
      return String(val ?? '').toLowerCase();
    }

    case 'TRIM': {
      const val = evaluateExpression(rawArgs[0] || '', ctx);
      return String(val ?? '').trim();
    }

    case 'LEN': {
      const val = evaluateExpression(rawArgs[0] || '', ctx);
      return String(val ?? '').length;
    }

    case 'TODAY': {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    case 'NOW': {
      return new Date().toLocaleString();
    }

    default:
      throw new Error(`#NAME? Unknown function ${fnName}`);
  }
}

/**
 * Replaces cell references like A1, B2 in a math formula with their numerical or string values
 */
function replaceCellReferencesInExpr(expr: string, ctx: FormulaContext): string {
  // Regex matches cell references like A1, ALL1000, $A$1
  return expr.replace(/\$?[A-Za-z]+\$?\d+/g, match => {
    const cleanRef = match.replace(/\$/g, '');
    const coord = a1ToCoord(cleanRef);
    if (!coord) return match;
    const k = cellKey(coord.row, coord.col);
    const cell = ctx.cells[k];
    if (!cell || !cell.raw) return '0';

    const res = evaluateCell(cell.raw, k, ctx.cells, new Set(ctx.visiting));
    if (res.error) throw new Error(res.value as string);
    if (typeof res.value === 'number') return String(res.value);
    if (res.value === null || res.value === '') return '0';
    const num = Number(res.value);
    return isNaN(num) ? JSON.stringify(res.value) : String(num);
  });
}

/**
 * Evaluates conditions like `A1 > 50`, `B2 = "Yes"`, `C1 != 0`
 */
function evaluateCondition(condStr: string, ctx: FormulaContext): boolean {
  const compMatch = condStr.match(/^(.*?)(<=|>=|!=|<>|<|>|=)(.*)$/);
  if (!compMatch) {
    // Boolean truthiness
    const val = evaluateExpression(condStr, ctx);
    return Boolean(val && val !== '0' && val !== 'false' && val !== 'FALSE');
  }

  const left = evaluateExpression(compMatch[1].trim(), ctx);
  const op = compMatch[2].trim();
  const right = evaluateExpression(compMatch[3].trim(), ctx);

  const numL = Number(left);
  const numR = Number(right);
  const isNumeric = !isNaN(numL) && !isNaN(numR);

  const v1 = isNumeric ? numL : String(left);
  const v2 = isNumeric ? numR : String(right);

  switch (op) {
    case '=': return v1 == v2;
    case '!=':
    case '<>': return v1 != v2;
    case '<': return v1 < v2;
    case '<=': return v1 <= v2;
    case '>': return v1 > v2;
    case '>=': return v1 >= v2;
    default: return false;
  }
}

/**
 * Evaluates basic math expressions using standard operator precedence (+, -, *, /, %, ^, &, parentheses)
 */
function safeMathEval(expr: string): number | string {
  // Handle string concatenation operator '&'
  if (expr.includes('&')) {
    const parts = expr.split('&');
    return parts.map(p => {
      const res = safeMathEval(p.trim());
      return typeof res === 'string' ? res.replace(/^"|"$/g, '') : String(res);
    }).join('');
  }

  // Handle quoted string literal
  if (/^".*"$/.test(expr.trim())) {
    return expr.trim().slice(1, -1);
  }

  // Sanitize math string
  const clean = expr.replace(/\^/g, '**');
  if (!/^[0-9+\-*/().\s*%]+$/.test(clean)) {
    // If not pure math, return raw
    return expr;
  }

  try {
    // Safe evaluation of mathematical tokens
    const fn = new Function(`"use strict"; return (${clean});`);
    const val = fn();
    if (val === Infinity || val === -Infinity) {
      throw new Error('#DIV/0!');
    }
    if (isNaN(val)) {
      return '#VALUE!';
    }
    return Math.round(val * 100000) / 100000;
  } catch {
    throw new Error('#ERROR!');
  }
}

/**
 * Formats a computed value according to cell style and format settings
 */
export function formatCellValue(value: string | number | null | undefined, format?: CellFormat, _style?: CellStyle): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string') {
    if (value.startsWith('#')) return value; // Errors like #REF!, #DIV/0!
  }

  const num = typeof value === 'number' ? value : Number(value);
  const isNum = !isNaN(num) && typeof value !== 'boolean';

  if (!isNum) return String(value);

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);

    case 'percent':
      return `${(num * 100).toFixed(1)}%`;

    case 'number':
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);

    case 'date':
      try {
        const d = new Date(num);
        return d.toLocaleDateString();
      } catch {
        return String(num);
      }

    case 'general':
    default:
      if (Number.isInteger(num)) return String(num);
      return String(Math.round(num * 10000) / 10000);
  }
}
