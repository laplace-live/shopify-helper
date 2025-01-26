#!/usr/bin/env bun
import { parseArgs } from 'util'

// Types for our command line arguments
type CommandLineArgs = {
  values: {
    variantId: string
    discount: string
    note?: string
  }
  positionals: string[]
}

// Types for Shopify API responses
type ShopifyPriceRule = {
  id: string
  value_type: string
  value: string
  customer_selection: string
  target_type: string
  target_selection: string
  allocation_method: string
  entitled_variant_ids: string[]
}

type ShopifyDiscount = {
  id: string
  price_rule_id: string
  code: string
}

// Parse command line arguments
const { values } = parseArgs({
  args: Bun.argv,
  options: {
    variantId: {
      type: 'string',
      required: true,
    },
    discount: {
      type: 'string',
      required: true,
    },
    note: {
      // Added note option
      type: 'string',
      required: false,
    },
  },
  strict: true,
  allowPositionals: true,
}) as CommandLineArgs

// Get environment variables
const shop = process.env.SHOPIFY_SHOP_SLUG
const accessToken = process.env.SHOPIFY_API_SECRET

// Validate discount value
const discountValue = parseFloat(values.discount)
if (isNaN(discountValue) || discountValue < 0 || discountValue > 100) {
  console.error('Discount must be a number between 0 and 100')
  process.exit(1)
}

// Generate a random coupon code
const generateCouponCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = 'SUBSPACE✦'
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Create the price rule and discount code
async function createCoupon() {
  if (!shop || !accessToken) {
    console.error(
      'Missing required environment variables: SHOPIFY_SHOP_SLUG and/or SHOPIFY_API_SECRET'
    )
    process.exit(1)
  }

  try {
    const code = generateCouponCode()

    // First, create the price rule targeting the specific variant
    const priceRuleResponse = await fetch(
      `https://${shop}.myshopify.com/admin/api/2024-01/price_rules.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
        },
        body: JSON.stringify({
          price_rule: {
            title: `${code} - One-time ${discountValue}% off ${values.note ? ` for ${values.note}` : ''}`,
            target_type: 'line_item',
            target_selection: 'entitled',
            allocation_method: 'across',
            value_type: 'percentage',
            value: `-${discountValue}`,
            customer_selection: 'all',
            entitled_variant_ids: [values.variantId],
            once_per_customer: true,
            starts_at: new Date().toISOString(),
            usage_limit: 1,
          },
        }),
      }
    )

    if (!priceRuleResponse.ok) {
      throw new Error(`Failed to create price rule: ${await priceRuleResponse.text()}`)
    }

    const priceRule = (await priceRuleResponse.json()).price_rule as ShopifyPriceRule

    // Then, create the discount code
    const discountResponse = await fetch(
      `https://${shop}.myshopify.com/admin/api/2024-01/price_rules/${priceRule.id}/discount_codes.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
        },
        body: JSON.stringify({
          discount_code: {
            code,
          },
        }),
      }
    )

    if (!discountResponse.ok) {
      throw new Error(`Failed to create discount code: ${await discountResponse.text()}`)
    }

    const discount = (await discountResponse.json()).discount_code as ShopifyDiscount

    console.log(`
        #                               #
 ## # # ### ###  ##  ## ### ###      ## ### ### ###
 #  # # # # # #  #  # # #   ##       #  # # # # # #
##  ### ### ### ##  ### ### ###     ##  # # ### ###
            #                    #              #
`)
    console.log('Your one-time coupon:')
    console.log(`Code: ${discount.code}`)
    console.log(`Discount: ${discountValue}% off`)
    console.log(`Variant ID: ${values.variantId}`)

    // Fetch variant details to show more information
    const variantResponse = await fetch(
      `https://${shop}.myshopify.com/admin/api/2024-01/variants/${values.variantId}.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
        },
      }
    )

    if (variantResponse.ok) {
      const variantData = await variantResponse.json()
      console.log(`Variant Title: ${variantData.variant.title}`)
      console.log(`Original Price: $${variantData.variant.price}`)
      console.log(
        `Discounted Price: $${(parseFloat(variantData.variant.price) * (1 - discountValue / 100)).toFixed(2)}`
      )
      console.log(`Redeem at: subspace.shop`)
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error creating coupon:', error.message)
    } else {
      console.error('An unknown error occurred:', error)
    }
    process.exit(1)
  }
}

// Run the script
createCoupon()
