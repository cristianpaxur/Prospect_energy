export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function parseBRL(input: string): number | null {
  const stripped = input.trim().replace(/[^\d,.-]/g, '')
  if (!stripped || /^[-,.]+$/.test(stripped)) return null

  const normalized = stripped.replace(/\./g, '').replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}
