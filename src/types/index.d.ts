export interface ShopifyOrderExportItem {
  '__rowNum__': number
  /**
   * ie. `#1165`
   */
  'Name': string
  'Email': string
  /**
   * `45384.34789351852`
   */
  'Created at': number
  'Lineitem quantity': number
  /**
   * 商品名称
   */
  'Lineitem name': string
  'Lineitem price': number
  'Lineitem compare at price': number
  'Lineitem sku': string
  'Lineitem requires shipping': 'true' | 'false'
  'Lineitem taxable': 'true' | 'false'
  'Lineitem fulfillment status': 'pending' | 'not_eligible' | 'fulfilled'
  'Vendor': string
  'Lineitem discount': number

  'Financial Status'?: 'paid'
  /**
   * `45384.34789351852`
   */
  'Paid at'?: number
  'Fulfillment Status'?: 'unfulfilled'
  'Accepts Marketing'?: 'yes' | 'no'
  'Currency'?: string
  'Subtotal'?: number
  'Shipping'?: number
  'Taxes'?: number
  /**
   * 实际支付价格
   */
  'Total'?: number
  /**
   * 优惠码
   */
  'Discount Code'?: string
  'Discount Amount'?: number
  'Shipping Method'?: string
  'Billing Name'?: string
  'Billing Street'?: string
  'Billing Address1'?: string
  'Billing City'?: string
  'Billing Zip'?: number
  /**
   * 'BJ'
   */
  'Billing Province'?: string
  /**
   * 'CN'
   */
  'Billing Country'?: string
  'Billing Phone'?: number
  'Shipping Name'?: string
  'Shipping Street'?: string
  'Shipping Address1'?: string
  'Shipping City'?: string
  'Shipping Zip'?: number
  /**
   * 'BJ'
   */
  'Shipping Province'?: string
  /**
   * 'CN'
   */
  'Shipping Country'?: string
  /**
   * can be string: `133 3333 3333` or number `13333333333` or number with country prefix `8613333333333`
   */
  'Shipping Phone'?: string | number
  /**
   * If the order is cancelled, this field will be filled
   */
  'Cancelled at'?: string
  'Payment Method'?: string
  'Payment Reference'?: string
  'Refunded Amount'?: number
  'Outstanding Balance'?: number
  'Id'?: number
  'Tags'?: string
  'Risk Level'?: string
  'Source'?: string
  'Tax 1 Name'?: string
  'Tax 1 Value'?: number
  /**
   * 'Guangdong'
   */
  'Billing Province Name': string
  /**
   * 'Guangdong'
   */
  'Shipping Province Name': string
  'Payment ID': string
  'Payment References': string
}
