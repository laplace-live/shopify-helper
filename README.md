# LAPLACE Shopify Helper

Shopify Helper is a set of tools to help you manage your Shopify store.

- Convert Shopify exported CSV to external providers
- Generate discount coupon codes for Shopify
- Variant ID lookup based on SKU

## Supported Providers

- Rouzao
- General providers (马帮, 芒果店长, etc.)
- 金碟管易

## Usage

```bash
bun run src/index.ts --input '/path/to/exported.csv'
```

## Development

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.1.0. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

## License

AGPL-3.0 😄
