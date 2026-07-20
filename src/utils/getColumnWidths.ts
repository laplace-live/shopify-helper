import type { Cell, SheetData } from 'write-excel-file/node'

/** Breathing room added to the widest cell so text is not flush against the border. */
const PADDING = 2
/** Keep short columns (ie. 数量) readable rather than collapsing to their header. */
const MIN_WIDTH = 10
/** Stop one long product name from producing an unusable 200-character column. */
const MAX_WIDTH = 50

/**
 * Characters Excel renders at roughly double width: CJK ideographs, kana, Hangul and
 * the fullwidth forms (ie. `，` and `（）`, which appear in the 简易表单 layout).
 */
const FULL_WIDTH = /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹯＀-｠￠-￦]/

/**
 * Width of a cell in Excel's unit, which is the width of a `0` in the default font.
 * Multi-line values are measured by their longest line, not their total length.
 */
function displayWidth(cell: Cell): number {
  if (cell === null || cell === undefined || typeof cell === 'object') return 0

  return String(cell)
    .split('\n')
    .reduce((widest, line) => {
      let width = 0
      for (const char of line) width += FULL_WIDTH.test(char) ? 2 : 1
      return Math.max(widest, width)
    }, 0)
}

/**
 * Size every column to its widest cell so the exported sheet is readable without
 * manually dragging column borders. SheetJS never emitted column widths at all, so
 * this is purely additive — cell values and types are untouched.
 */
export function getColumnWidths(sheetData: SheetData): { width: number }[] {
  const widths: number[] = []

  for (const row of sheetData) {
    row.forEach((cell, index) => {
      widths[index] = Math.max(widths[index] ?? 0, displayWidth(cell))
    })
  }

  return widths.map(width => ({
    width: Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width + PADDING)),
  }))
}
