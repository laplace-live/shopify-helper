#!/usr/bin/env bun
import { parseArgs } from 'node:util'

// Types for Shopify API responses
type ShopifyVariant = {
  id: string
  product_id: string
  title: string
  sku: string
  price: string
  option1: string | null
  option2: string | null
  option3: string | null
}

type ShopifyProduct = {
  id: string
  title: string
  variants: ShopifyVariant[]
}

type ShopifyProductsResponse = {
  products: ShopifyProduct[]
}

// Parse command line arguments
const { values } = parseArgs({
  args: Bun.argv,
  options: {
    sku: {
      type: 'string',
    },
    title: {
      type: 'string',
    },
    option1: {
      type: 'string',
    },
    option2: {
      type: 'string',
    },
    option3: {
      type: 'string',
    },
  },
  strict: true,
  allowPositionals: true,
})

// Get environment variables
const shop = process.env.SHOPIFY_SHOP_SLUG
const accessToken = process.env.SHOPIFY_API_SECRET

async function findProduct() {
  if (!shop || !accessToken) {
    console.error('Missing required environment variables: SHOPIFY_SHOP_SLUG and/or SHOPIFY_API_SECRET')
    process.exit(1)
  }

  // Validate that at least one search parameter is provided
  if (!values.sku && !values.title && !values.option1 && !values.option2 && !values.option3) {
    console.error('Please provide at least one search parameter: --sku, --title, --option1, --option2, or --option3')
    process.exit(1)
  }

  try {
    // Initialize an empty array to store all products
    let allProducts: ShopifyProduct[] = []
    let hasNextPage = true
    let nextPageToken = ''

    // Fetch all products (paginated)
    while (hasNextPage) {
      const url = new URL(`https://${shop}.myshopify.com/admin/api/2024-01/products.json`)
      url.searchParams.append('limit', '250') // Maximum allowed by Shopify
      if (nextPageToken) {
        url.searchParams.append('page_info', nextPageToken)
      }

      const response = await fetch(url.toString(), {
        headers: {
          'X-Shopify-Access-Token': accessToken,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${await response.text()}`)
      }

      const linkHeader = response.headers.get('Link')
      nextPageToken = ''

      if (linkHeader) {
        const matches = linkHeader.match(/(?<=page_info=)[^>]+/)
        if (matches) {
          nextPageToken = matches[0]
        } else {
          hasNextPage = false
        }
      } else {
        hasNextPage = false
      }

      const data = (await response.json()) as ShopifyProductsResponse
      allProducts = allProducts.concat(data.products)
    }

    // Filter products based on provided criteria
    const matchingProducts = allProducts.filter(product => {
      return product.variants.some(variant => {
        let match = true

        if (values.sku) {
          match = match && variant.sku === values.sku
        }
        if (values.title) {
          match =
            match &&
            (product.title.toLowerCase().includes(values.title.toLowerCase()) ||
              variant.title.toLowerCase().includes(values.title.toLowerCase()))
        }
        if (values.option1) {
          match = match && variant.option1?.toLowerCase() === values.option1.toLowerCase()
        }
        if (values.option2) {
          match = match && variant.option2?.toLowerCase() === values.option2.toLowerCase()
        }
        if (values.option3) {
          match = match && variant.option3?.toLowerCase() === values.option3.toLowerCase()
        }

        return match
      })
    })

    if (matchingProducts.length === 0) {
      console.log('No products found matching the specified criteria.')
      return
    }

    // Display results
    console.log(`Found ${matchingProducts.length} matching product(s):\n`)
    matchingProducts.forEach(product => {
      console.log(`Product: ${product.title}`)
      console.log(`Product ID: ${product.id}`)
      console.log('\nMatching variants:')

      const matchingVariants = product.variants.filter(variant => {
        let match = true
        if (values.sku) match = match && variant.sku === values.sku
        if (values.option1) match = match && variant.option1?.toLowerCase() === values.option1.toLowerCase()
        if (values.option2) match = match && variant.option2?.toLowerCase() === values.option2.toLowerCase()
        if (values.option3) match = match && variant.option3?.toLowerCase() === values.option3.toLowerCase()
        return match
      })

      matchingVariants.forEach(variant => {
        console.log(`\nVariant ID: ${variant.id}`)
        console.log(`SKU: ${variant.sku}`)
        console.log(`Price: ${variant.price}`)
        if (variant.option1) console.log(`Option 1: ${variant.option1}`)
        if (variant.option2) console.log(`Option 2: ${variant.option2}`)
        if (variant.option3) console.log(`Option 3: ${variant.option3}`)
      })
      console.log('\n---')
    })
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error finding products:', error.message)
    } else {
      console.error('An unknown error occurred:', error)
    }
    process.exit(1)
  }
}

// Run the script
findProduct()
