import { z } from 'zod'

export const noteSchema = z.object({ content: z.string().trim().min(1, 'Escreva uma anotação.').max(5000) })

export const taskSchema = z.object({
  type: z.enum(['LIGACAO', 'WHATSAPP', 'SOLICITAR_FATURA', 'ENVIAR_PROPOSTA', 'FOLLOW_UP', 'OUTRO']),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data.'),
  dueTime: z.string().regex(/^\d{2}:\d{2}$/, 'Informe o horário.'),
  description: z.string().trim().min(2, 'Descreva a próxima ação.').max(500),
})

export const contactActionSchema = z.enum(['WHATSAPP_ABERTO', 'LIGACAO_INICIADA', 'EMAIL_ABERTO', 'SITE_ABERTO', 'MAPA_ABERTO'])
