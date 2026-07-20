import { beforeAll, describe, expect, test } from 'bun:test'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { readSheet } from 'read-excel-file/node'

const FIXTURE = 'test/fixtures/orders_export_sample.csv'

let outputDir: string
let files: string[]

/** Locate a produced file by its `<collection>_<provider>` suffix, ignoring the timestamp prefix. */
function find(suffix: string): string {
  const match = files.find(f => f.endsWith(`${suffix}.xlsx`))
  if (!match) throw new Error(`No output file for "${suffix}" in: ${files.join(', ')}`)
  return path.join(outputDir, match)
}

/** `readSheet` returns the rows; the default export returns a list of sheets. */
const read = (suffix: string) => readSheet(find(suffix))

beforeAll(async () => {
  outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shopify-helper-test-'))

  const proc = Bun.spawn(['bun', 'run', 'src/index.ts', '--input', FIXTURE, '--outputDir', outputDir], {
    env: {
      ...process.env,
      PROVIDERS: 'ROUZAO_,SUBSPACE_WH1_,TAOBAO_MJT_,HICUSTOM_',
      ORDER_PREFIX: 'SUBSPACE',
      GUANYI_ERP_SHOP_NAME: 'TEST_SHOP',
      GUANYI_ERP_PRIVATE_MODE: '',
    },
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const exitCode = await proc.exited
  if (exitCode !== 0) {
    throw new Error(`Converter failed (${exitCode}): ${await new Response(proc.stderr).text()}`)
  }

  files = fs.readdirSync(outputDir).filter(f => f.endsWith('.xlsx'))
})

describe('order filtering', () => {
  test('writes one file per provider and collection', () => {
    expect(files).toHaveLength(4)
  })

  test('routes a __COLLE: suffixed SKU into its own collection', () => {
    expect(files.some(f => f.includes('special_hicustom'))).toBe(true)
  })

  test('skips cancelled, non-pending, already-requested, and SKU-less rows', async () => {
    // #T005 cancelled, #T006 fulfilled, #T007 tagged, #T008 no SKU — none may appear.
    const rouzao = await read('default_rouzao')
    const orderIds = rouzao.slice(1).map(row => row[0])
    expect(orderIds).toEqual(['SUBSPACE#T001'])
  })
})

describe('rouzao layout', () => {
  test('writes the expected header row', async () => {
    const rows = await read('default_rouzao')
    expect(rows[0]).toEqual(['第三方订单号', '收件人', '联系电话', '收件地址', '商家编码', '下单数量'])
  })

  test('concatenates province, city and street into the address', async () => {
    const rows = await read('default_rouzao')
    expect(rows[1]?.[3]).toBe('广东省深圳市测试街道1号')
  })

  test('keeps quantity and phone as numbers', async () => {
    const rows = await read('default_rouzao')
    expect(rows[1]?.[2]).toBe(13800000001)
    expect(rows[1]?.[5]).toBe(1)
  })
})

describe('金蝶管易 layout', () => {
  test('writes all 48 columns even though most values are blank', async () => {
    const rows = await read('default_subspace_wh1')
    expect(rows[0]).toHaveLength(48)
    expect(rows[0]?.slice(0, 6)).toEqual(['店铺', '平台单号', '买家会员', '支付金额', '商品名称', '商品代码'])
  })

  test('fills the populated fields', async () => {
    const rows = await read('default_subspace_wh1')
    expect(rows[1]?.[0]).toBe('TEST_SHOP')
    expect(rows[1]?.[1]).toBe('SUBSPACE#T002')
    expect(rows[1]?.[3]).toBe(25.5)
    expect(rows[1]?.[4]).toBe('Test Hoodie')
  })

  test('preserves a newline embedded in a quoted CSV address field', async () => {
    const rows = await read('default_subspace_wh1')
    expect(rows[1]?.[17]).toBe('广东省广州市测试路2号\n二单元301')
  })

  test('renders empty fields as blank cells', async () => {
    // write-excel-file omits empty-string cells rather than writing them as `""`.
    // The column headers are still present, which is what the ERP layout depends on.
    const rows = await read('default_subspace_wh1')
    expect(rows[1]?.[7]).toBeNull()
    expect(rows[1]?.[8]).toBeNull()
  })
})

describe('simple form layout', () => {
  test('strips the provider prefix from the product code', async () => {
    const rows = await read('default_taobao_mjt')
    expect(rows[0]).toEqual(['产品编号', '产品数量', '收货地址', '备注', '快递单号（供应商填写）'])
    expect(rows[1]?.[0]).toBe('3003')
    expect(rows[1]?.[1]).toBe(3)
  })

  test('combines name, phone and address into a single field', async () => {
    const rows = await read('default_taobao_mjt')
    expect(rows[1]?.[2]).toBe('测试买家三，13800000003，广东省深圳市测试大道3号')
  })
})

describe('general provider layout', () => {
  test('writes the expected header row', async () => {
    const rows = await read('special_hicustom')
    expect(rows[0]).toEqual([
      '订单ID',
      '商品编号',
      '产品信息',
      '数量',
      'SKU',
      '姓名',
      '州/省',
      '城市',
      '地址1',
      '邮编',
      '电话2',
      '收货国家',
    ])
  })

  test('keeps an apostrophe-guarded postal code as text, not a number', async () => {
    // Shopify exports zips as `'130000`; the apostrophe must be stripped and the
    // value must stay a string so leading zeros are never lost.
    const rows = await read('special_hicustom')
    expect(rows[1]?.[9]).toBe('130000')
  })

  test('strips the __COLLE: suffix from the SKU', async () => {
    const rows = await read('special_hicustom')
    expect(rows[1]?.[4]).toBe('4004')
    expect(rows[1]?.[3]).toBe(2)
  })
})
