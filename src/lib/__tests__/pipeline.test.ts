import { describe, expect, it } from 'vitest'
import { groupLeadsByStatus, PIPELINE_ORDER } from '../pipeline'

describe('pipeline ordering', () => {
  it('groups cards and follows the commercial sequence', () => {
    expect(groupLeadsByStatus([
      { id: '1', name: 'A', category: 'Academia', city: 'Santos', state: 'SP', score: 40, pipeline_status: 'NOVO', created_at: '2026-09-22' },
      { id: '2', name: 'B', category: 'Mercado', city: 'Santos', state: 'SP', score: 70, pipeline_status: 'FECHADO', created_at: '2026-09-22' },
    ]).NOVO).toHaveLength(1)
    expect(PIPELINE_ORDER).toEqual(['NOVO', 'CONTATO_REALIZADO', 'INTERESSADO', 'AGUARDANDO_FATURA', 'ANALISE', 'PROPOSTA', 'FECHADO'])
  })
})
