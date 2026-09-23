import { describe, expect, it } from 'vitest'
import { taskSchema } from '../lead'
import { renderTemplate } from '../../messages'

describe('lead workbench validation', () => {
  it('accepts a valid dated follow-up task', () => {
    expect(taskSchema.safeParse({ type: 'WHATSAPP', dueDate: '2026-09-23', dueTime: '14:30', description: 'Retornar para Academia Strong' }).success).toBe(true)
  })

  it('renders only the approved message variables', () => {
    expect(renderTemplate('Olá {{nome_empresa}}, sou {{nome_licenciado}} de {{cidade}}.', {
      nome_empresa: 'Academia Strong', nome_licenciado: 'Cristian', cidade: 'Santos',
    })).toBe('Olá Academia Strong, sou Cristian de Santos.')
  })
})
