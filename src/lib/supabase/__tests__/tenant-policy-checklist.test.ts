import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('release configuration guard', () => {
  it('keeps privileged credentials out of runtime config and ignores local secrets', () => {
    const envExample = readFileSync(resolve(process.cwd(), '.env.example'), 'utf8')
    const gitignore = readFileSync(resolve(process.cwd(), '.gitignore'), 'utf8')
    expect(envExample).toContain('NEXT_PUBLIC_SUPABASE_URL=')
    expect(envExample).toContain('GOOGLE_MAPS_API_KEY=')
    expect(envExample).not.toContain('SUPABASE_SERVICE_ROLE_KEY')
    expect(gitignore).toMatch(/^\.env$/m)
    expect(gitignore).toContain('.env.local')
  })
})
