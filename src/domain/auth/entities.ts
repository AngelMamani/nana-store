export type UserRole = "cliente" | "administrador" | "desarrollador"

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

export type AuthResult<T> = { ok: true; value: T } | { ok: false; error: AuthFailure }

export function toCustomer(account: Account): Customer {
  return { id: account.id, name: account.name, email: account.email, role: account.role || "cliente" }
}
