export function chunkByOrderKey<T extends Record<string, unknown>>(
  data: T[],
  maxSize: number,
  orderKey: string
): T[][] {
  const orderGroups = new Map<string, T[]>()
  for (const row of data) {
    const id = String(row[orderKey])
    const group = orderGroups.get(id)
    if (group) {
      group.push(row)
    } else {
      orderGroups.set(id, [row])
    }
  }

  const chunks: T[][] = []
  let current: T[] = []

  for (const group of orderGroups.values()) {
    if (current.length + group.length > maxSize && current.length > 0) {
      chunks.push(current)
      current = [...group]
    } else {
      current.push(...group)
    }
  }

  if (current.length > 0) {
    chunks.push(current)
  }

  return chunks
}
