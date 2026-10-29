import type { AuthFailure } from "./entities.ts"

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function registrationError(input: {
  name: string
  email: string
  password: string
}): AuthFailure | null {
  if (input.name.trim().length < 2) return { type: "invalid-name" }
  if (!EMAIL.test(normalizeEmail(input.email))) return { type: "invalid-email" }
  if (input.password.length < 8) return { type: "weak-password" }
  return null
}
