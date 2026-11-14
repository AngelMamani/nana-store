export type UserRole = "cliente" | "administrador" | "desarrollador"

export const SUPERADMIN_EMAIL = "amamanim@unamad.edu.pe"

export type StoreUser = {
  id: string
  name: string
  email: string
  role: UserRole
  createdAt: string | null
}

export function isProtectedDeveloper(email: string) {
  return email.trim().toLowerCase() === SUPERADMIN_EMAIL.toLowerCase()
}

export function roleLabel(role: UserRole) {
  if (role === "desarrollador") return "Desarrollador"
  if (role === "administrador") return "Administrador"
  return "Cliente"
}

export type Customer = {
  id: string
  name: string
  email: string
  role?: UserRole
}

export type Account = Customer & {
  passwordHash: string
  createdAt: string
}

export type Session = {
  accountId: string
}

export type AuthFailure =
  | { type: "invalid-name" }
  | { type: "invalid-email" }
  | { type: "weak-password" }
  | { type: "email-taken" }
  | { type: "invalid-credentials" }
  | { type: "unauthorized-domain" }
  | { type: "redirect-pending" }

export type AuthResult<T> = { ok: true; value: T } | { ok: false; error: AuthFailure }

export function toCustomer(account: Account): Customer {
  return { id: account.id, name: account.name, email: account.email, role: account.role || "cliente" }
}
