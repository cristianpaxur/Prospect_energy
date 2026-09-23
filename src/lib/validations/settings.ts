import { z } from 'zod'

const optionalMoney = z.preprocess((value) => value === '' || value === null || value === undefined ? null : Number(value), z.number().nonnegative().nullable())

export const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  phone: z.string().trim().min(10).max(20),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().length(2).transform((value) => value.toUpperCase()),
})

export const organizationSchema = z.object({ name: z.string().trim().min(2).max(120) })

export const templateSchema = z.object({
  templateKey: z.enum(['PRIMEIRO_CONTATO', 'FOLLOW_UP', 'SOLICITAR_FATURA', 'ENVIAR_SIMULACAO', 'ENVIAR_PROPOSTA']),
  title: z.string().trim().min(2).max(80),
  content: z.string().trim().min(5).max(2000),
})

export const eligibilityRuleSchema = z.object({
  ruleId: z.string().uuid().optional().or(z.literal('')),
  provider: z.string().trim().min(2).max(80),
  state: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  customerType: z.enum(['RESIDENCIAL', 'COMERCIAL', 'RURAL', 'INDUSTRIAL', 'OUTRO']),
  minimumAmount: optionalMoney,
  maximumAmount: optionalMoney,
  discountPercentage: z.preprocess((value) => Number(value), z.number().gt(0).lte(100)),
  active: z.preprocess((value) => value === true || value === 'on' || value === 'true', z.boolean()),
}).superRefine((rule, context) => {
  if (rule.minimumAmount !== null && rule.maximumAmount !== null && rule.minimumAmount > rule.maximumAmount) {
    context.addIssue({ code: 'custom', path: ['maximumAmount'], message: 'O valor máximo deve ser maior ou igual ao mínimo.' })
  }
})
