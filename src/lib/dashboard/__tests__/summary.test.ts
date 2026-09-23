import { describe, expect, it } from 'vitest'
import { toDashboardSummary } from '../summary'

describe('dashboard summary', () => {
  it('maps tenant records into live KPIs and today tasks', () => {
    expect(toDashboardSummary({
      leads: [{ pipeline_status: 'NOVO' }, { pipeline_status: 'CONTATO_REALIZADO' }],
      invoices: [{ id: 'invoice-1' }],
      simulations: [{ lead_id: 'lead-1', estimated_monthly_savings: 462, created_at: '2026-09-22T10:00:00Z' }],
      tasks: [{ id: 'task-1', due_at: '2026-09-22T12:00:00.000Z', completed_at: null }],
    }, '2026-09-22')).toMatchObject({ leadCount: 2, contactedCount: 1, invoiceCount: 1, identifiedSavings: 462, todayTasks: [{ id: 'task-1' }] })
  })

  it('uses only the latest simulation for each lead in the savings KPI', () => {
    const summary = toDashboardSummary({
      leads: [], invoices: [], tasks: [],
      simulations: [
        { lead_id: 'lead-1', estimated_monthly_savings: 400, created_at: '2026-09-21T10:00:00Z' },
        { lead_id: 'lead-1', estimated_monthly_savings: 462, created_at: '2026-09-22T10:00:00Z' },
      ],
    }, '2026-09-22')
    expect(summary.identifiedSavings).toBe(462)
  })
})
