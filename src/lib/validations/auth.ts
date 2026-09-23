import { z } from 'zod'

export const signUpSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome.').max(100),
  email: z.string().trim().email('Informe um e-mail válido.'),
  phone: z.string().trim().min(10, 'Informe um telefone com DDD.').max(20),
  city: z.string().trim().min(2, 'Informe sua cidade.').max(100),
  state: z.string().trim().length(2, 'Use a sigla de dois caracteres.').transform((state) => state.toUpperCase()),
  password: z.string().min(8, 'A senha deve ter ao menos 8 caracteres.').max(72),
})

export const loginSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.'),
})

export const resetPasswordSchema = z.object({ email: z.string().trim().email('Informe um e-mail válido.') })
export const updatePasswordSchema = z.object({ password: z.string().min(8, 'A senha deve ter ao menos 8 caracteres.').max(72) })
