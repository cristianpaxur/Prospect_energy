export function renderTemplate(template: string, values: Record<string, string>) {
  return template.replace(/{{(nome_licenciado|nome_empresa|cidade)}}/g, (_match, key: string) => values[key] ?? '')
}

export function whatsappUrl(phone: string | null | undefined, message: string) {
  const digits = (phone ?? '').replace(/\D/g, '')
  const number = digits ? (digits.startsWith('55') ? digits : `55${digits}`) : ''
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}
