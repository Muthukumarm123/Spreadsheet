/**
 * Builds prefix sums for row heights or column widths.
 * Size is count + 1.
 */
export function buildPrefixSums(
  count: number,
  sizes: Record<number, number>,
  defaultSize: number
): number[] {
  const prefix = new Array<number>(count + 1);
  prefix[0] = 0;
  for (let i = 0; i < count; i++) {
    const size = sizes[i] !== undefined ? sizes[i] : defaultSize;
    prefix[i + 1] = prefix[i] + size;
  }
  return prefix;
}

/**
 * Binary search to find the index where prefix[index] <= target < prefix[index + 1]
 */
export function findIndexAtOffset(prefix: number[], target: number): number {
  if (target <= 0) return 0;
  const count = prefix.length - 1;
  if (target >= prefix[count]) return count - 1;

  let low = 0;
  let high = count - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (prefix[mid] <= target && target < prefix[mid + 1]) {
      return mid;
    }
    if (prefix[mid] > target) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  return Math.max(0, Math.min(count - 1, low));
}
