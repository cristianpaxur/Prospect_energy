import { z } from 'zod'

export const prospectFiltersSchema = z.object({
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  category: z.enum(['Academia', 'Mercado', 'Padaria', 'Restaurante', 'Hotel', 'Farmácia', 'Clínica', 'Loja', 'Outros']),
  radiusKm: z.coerce.number().int().refine((value) => [5, 10, 20, 30, 50].includes(value)),
  hasPhone: z.coerce.boolean().default(false),
  hasWebsite: z.coerce.boolean().default(false),
  minRating: z.preprocess((value) => value === '' || value === null || value === undefined ? undefined : Number(value), z.number().min(0).max(5).optional()),
  openNow: z.coerce.boolean().default(false),
})

export const prospectSearchRequestSchema = prospectFiltersSchema.extend({
  pageToken: z.string().trim().min(1).max(4096).optional(),
})

export const importProspectsSchema = z.array(z.object({
  placeId: z.string().min(1).max(250),
  name: z.string().trim().min(1, 'Preencha o nome do lead no CRM.').max(200),
  category: z.enum(['Academia', 'Mercado', 'Padaria', 'Restaurante', 'Hotel', 'Farmácia', 'Clínica', 'Loja', 'Outros']),
  address: z.string().max(500),
  city: z.string().min(2).max(100),
  state: z.string().length(2),
  phone: z.string().trim().max(30),
  email: z.union([z.literal(''), z.string().trim().email()]),
  website: z.union([z.literal(''), z.string().trim().url()]),
  openHours: z.preprocess((value) => value === '' || value === undefined ? null : Number(value), z.number().min(0).max(24).nullable()),
}).strict()).min(1).max(50)

export const quickImportProspectSchema = z.object({
  placeId: z.string().min(1).max(250),
  name: z.string().trim().min(1).max(200),
  category: z.enum(['Academia', 'Mercado', 'Padaria', 'Restaurante', 'Hotel', 'Farmácia', 'Clínica', 'Loja', 'Outros']),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  address: z.string().trim().max(500),
  phone: z.string().trim().max(30),
  website: z.union([z.literal(''), z.string().trim().url()]),
  openHours: z.preprocess((value) => value === '' || value === undefined ? null : Number(value), z.number().min(0).max(24).nullable()),
}).strict()

export type ProspectFilters = z.infer<typeof prospectFiltersSchema>
export type ProspectSearchRequest = z.infer<typeof prospectSearchRequestSchema>
