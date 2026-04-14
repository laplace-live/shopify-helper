export function sanitizeName(name: string | number | undefined): string {
  if (!name && name !== 0) return ''
  return String(name)
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .trim()
}
