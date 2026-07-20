import type { Cell, SheetData } from 'write-excel-file/node'

/**
 * Convert a list of plain objects into `write-excel-file` sheet data.
 *
 * Reproduces the behaviour of SheetJS `XLSX.utils.json_to_sheet`: the header row is
 * the union of keys across every row in first-seen order. A single provider can emit
 * more than one row shape (ie. `SUBSPACE_` matches both the 金蝶管易 layout via
 * `SUBSPACE_WH1_` and the general layout), so taking only the first row's keys would
 * silently drop columns.
 *
 * Cell types are derived from the values by `write-excel-file`, which keeps numbers
 * (quantity, price, phone) as numeric cells and everything else as text.
 *
 * One difference from SheetJS: `write-excel-file` treats `''` as an empty cell and
 * omits it, where SheetJS wrote an explicit empty string. The header row and the
 * sheet's declared dimensions are unaffected, so the 金蝶管易 column layout the ERP
 * expects still arrives intact — the blank cells are simply absent rather than empty.
 */
export function toSheetData<T extends object>(rows: T[]): SheetData {
  const headers: string[] = []
  const seen = new Set<string>()

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (seen.has(key)) continue
      seen.add(key)
      headers.push(key)
    }
  }

  return [headers, ...rows.map(row => headers.map(header => (row as Record<string, Cell>)[header]))]
}
