export function extractCollection(sku: string): string {
  const match = sku.match(/__COLLE:(.+)$/)
  return match?.[1] ?? 'default'
}
