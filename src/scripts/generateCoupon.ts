#!/usr/bin/env bun
import { parseArgs } from 'node:util'
import { createCanvas } from '@napi-rs/canvas'
import type { RestResources } from '@shopify/shopify-api/rest/admin/2026-01'

type PriceRule = InstanceType<RestResources['PriceRule']>
type DiscountCode = InstanceType<RestResources['DiscountCode']>
type Variant = InstanceType<RestResources['Variant']>

type PriceRuleResponse = { price_rule: PriceRule }
type DiscountCodeResponse = { discount_code: DiscountCode }
type VariantResponse = { variant: Variant }

type CommandLineArgs = {
  values: {
    variantId: string
    discount: string
    note?: string
    png?: boolean
  }
  positionals: string[]
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
      type: 'string',
      required: false,
    },
    png: {
      type: 'boolean',
      default: false,
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
if (Number.isNaN(discountValue) || discountValue < 0 || discountValue > 100) {
  console.error('Discount must be a number between 0 and 100')
  process.exit(1)
}

// Generate a random coupon code
const generateCouponCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = 'SUBSPACE_'
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Function to create PNG image
async function createImage(content: string[], code: string) {
  const fontSize = 16
  const lineHeight = fontSize * 1.5
  const padding = 30
  const charWidth = fontSize * 0.6 // Monospace character width

  // Calculate maximum line width
  const maxWidth = Math.max(...content.map(line => line.length)) * charWidth + padding * 2

  // Create canvas with monospace font
  const canvas = createCanvas(maxWidth, content.length * lineHeight + padding * 2)
  const ctx = canvas.getContext('2d')

  // Set background
  ctx.fillStyle = '#7000ff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Set text style
  ctx.font = `${fontSize}px "Menlo"`
  ctx.fillStyle = '#f3e9ff'
  ctx.textBaseline = 'top'

  // Draw each line
  content.forEach((line, index) => {
    ctx.fillText(line, padding, padding + index * lineHeight)
  })

  // Save image
  const filename = `output/${code}.png`
  const buffer = canvas.toBuffer('image/png')
  const uint8Array = new Uint8Array(buffer)
  await Bun.write(filename, uint8Array)
  // console.log(`PNG image saved as: ${filename}`)
}

// Create the price rule and discount code
async function createCoupon() {
  if (!shop || !accessToken) {
    console.error('Missing required environment variables: SHOPIFY_SHOP_SLUG and/or SHOPIFY_API_SECRET')
    process.exit(1)
  }

  try {
    const code = generateCouponCode()

    // First, create the price rule targeting the specific variant
    const priceRuleResponse = await fetch(`https://${shop}.myshopify.com/admin/api/2026-01/price_rules.json`, {
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
    })

    if (!priceRuleResponse.ok) {
      throw new Error(`Failed to create price rule: ${await priceRuleResponse.text()}`)
    }

    const priceJson: PriceRuleResponse = await priceRuleResponse.json()
    const priceRule = priceJson.price_rule

    // Then, create the discount code
    const discountResponse = await fetch(
      `https://${shop}.myshopify.com/admin/api/2026-01/price_rules/${priceRule.id}/discount_codes.json`,
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

    const discountJson: DiscountCodeResponse = await discountResponse.json()
    const discount = discountJson.discount_code

    // Prepare content for both console and image
    const asciiArt = [
      '        #                               #           ',
      ' ## # # ###  ## ###  ## ### ###      ## ### ### ### ',
      ' #  # # # #  #  # # # # #   ##       #  # # # # # # ',
      '##  ### ### ##  ### ### ### ###     ##  # # ### ### ',
      '                #                #              #   ',
    ]
    const content = [
      ...asciiArt,
      'Your one-time coupon:',
      `Code: ${discount.code}`,
      `Discount: ${discountValue}% off`,
      `Variant ID: ${values.variantId}`,
      `Redeem at: subspace.shop`,
    ]

    // Print to console
    content.forEach(line => {
      console.log(line)
    })

    // If PNG option is enabled, create image
    if (values.png) {
      await createImage(content, code)
    }

    // Fetch variant details to show more information
    const variantResponse = await fetch(
      `https://${shop}.myshopify.com/admin/api/2026-01/variants/${values.variantId}.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
        },
      }
    )

    if (variantResponse.ok) {
      const variantJson: VariantResponse = await variantResponse.json()
      const variant = variantJson.variant
      console.log(`Variant Title: ${variant.title}`)
      console.log(`Original Price: $${variant.price}`)
      console.log(`Discounted Price: $${(parseFloat(variant.price ?? '0') * (1 - discountValue / 100)).toFixed(2)}`)
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
