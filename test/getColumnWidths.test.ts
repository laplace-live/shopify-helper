import { describe, expect, test } from 'bun:test'
import { getColumnWidths } from '../src/utils/getColumnWidths'

/** Widths are `content + 2` padding, clamped to [10, 50]. */
const widths = (rows: (string | number | null)[][]) => getColumnWidths(rows).map(c => c.width)

describe('getColumnWidths', () => {
  test('sizes a column to its widest cell', () => {
    // 'Milky Green Undead' is 18 chars, so 18 + 2 padding.
    expect(widths([['SKU'], ['short'], ['Milky Green Undead']])).toEqual([20])
  })

  test('counts CJK characters as double width', () => {
    // 12 ideographs render at ~24 columns, not 12.
    expect(widths([['广东省深圳市测试街道1号']])).toEqual([25])
  })

  test('counts fullwidth punctuation as double width', () => {
    // 快递单号（供应商填写） — 11 fullwidth chars.
    expect(widths([['快递单号（供应商填写）']])).toEqual([24])
  })

  test('measures the longest line of a multi-line value', () => {
    // Longest line is 广州市测试路2号 at 15, not the two lines combined at 24.
    expect(widths([['广州市测试路2号\n二单元301']])).toEqual([17])
  })

  test('never returns a column narrower than the minimum', () => {
    expect(widths([['数量'], [1]])).toEqual([10])
  })

  test('never returns a column wider than the maximum', () => {
    expect(widths([['x'.repeat(200)]])).toEqual([50])
  })

  test('ignores blank cells left by empty fields', () => {
    expect(widths([['备注'], [null]])).toEqual([10])
  })

  test('sizes each column independently', () => {
    expect(
      widths([
        ['订单ID', '产品信息'],
        ['SUBSPACE#5453', 'A Fairly Long Product Name'],
      ])
    ).toEqual([15, 28])
  })
})
