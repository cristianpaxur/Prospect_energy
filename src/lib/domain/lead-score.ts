import type { Potential, ScoreInput } from '@/types/domain'

const CATEGORY_POINTS: Record<string, number> = {
  academia: 30,
  academias: 30,
  mercado: 40,
  mercados: 40,
  hotel: 40,
  hoteis: 40,
  restaurante: 25,
  restaurantes: 25,
}

export function scoreLead(input: ScoreInput): number {
  const category = input.category.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('pt-BR')
  const points = (CATEGORY_POINTS[category] ?? 0)
    + (input.hasWebsite ? 5 : 0)
    + (input.hasPhone ? 10 : 0)
    + (input.openHours !== null && input.openHours > 12 ? 10 : 0)
  return Math.min(100, Math.max(0, points))
}

export function potentialFromScore(score: number): Potential {
  if (score <= 30) return 'BAIXO'
  if (score <= 60) return 'MEDIO'
  if (score <= 80) return 'ALTO'
  return 'MUITO_ALTO'
}
