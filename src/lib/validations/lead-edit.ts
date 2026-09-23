import { z } from 'zod'

const optionalText = (max: number) => z.string().trim().max(max).transform((value) => value || null)

export const leadEditSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome da empresa.').max(200),
  category: z.enum(['Academia', 'Mercado', 'Padaria', 'Restaurante', 'Hotel', 'Farmácia', 'Clínica', 'Loja', 'Outros']),
  address: optionalText(500),
  city: z.string().trim().min(2, 'Informe a cidade.').max(100),
  state: z.string().trim().length(2, 'Informe a UF com duas letras.').transform((value) => value.toUpperCase()),
  phone: optionalText(30),
  email: z.union([z.literal(''), z.string().trim().email('Informe um e-mail válido.').max(254)]).transform((value) => value || null),
  website: z.union([z.literal(''), z.string().trim().url('Informe uma URL válida.').max(500)]).transform((value) => value || null),
  openHours: z.preprocess((value) => value === '' || value === undefined ? null : Number(value), z.number().min(0).max(24).nullable()),
})
