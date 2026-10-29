import type { Customer } from "../../domain/auth/entities.ts"
import { toCustomer } from "../../domain/auth/entities.ts"
import type {
  AccountRepository,
  IdGenerator,
  PasswordHasher,
  SessionRepository,
} from "../../domain/auth/ports.ts"
import type { AuthResult } from "../../domain/auth/entities.ts"
import { normalizeEmail, registrationError } from "../../domain/auth/validation.ts"

type AuthDeps = {
  accounts: AccountRepository
  sessions: SessionRepository
  passwords: PasswordHasher
  ids: IdGenerator
}

export function currentCustomer(accounts: AccountRepository, sessions: SessionRepository): Customer | null {
  const session = sessions.load()
  if (!session) return null
  const account = accounts.findById(session.accountId)
  if (!account) {
    sessions.clear()
    return null
  }
  return toCustomer(account)
}

export async function registerCustomer(
  deps: AuthDeps,
  input: { name: string; email: string; password: string },
): Promise<AuthResult<Customer>> {
  const error = registrationError(input)
  if (error) return { ok: false, error }

  const email = normalizeEmail(input.email)
  if (deps.accounts.findByEmail(email)) return { ok: false, error: { type: "email-taken" } }

  const account = {
    id: deps.ids.next(),
    name: input.name.trim(),
    email,
    passwordHash: await deps.passwords.hash(input.password),
    createdAt: new Date().toISOString(),
  }
  deps.accounts.save(account)
  deps.sessions.save({ accountId: account.id })
  return { ok: true, value: toCustomer(account) }
}

export async function loginCustomer(
  deps: AuthDeps,
  input: { email: string; password: string },
): Promise<AuthResult<Customer>> {
  const account = deps.accounts.findByEmail(normalizeEmail(input.email))
  const matches = account ? await deps.passwords.verify(input.password, account.passwordHash) : false
  if (!account || !matches) return { ok: false, error: { type: "invalid-credentials" } }
  deps.sessions.save({ accountId: account.id })
  return { ok: true, value: toCustomer(account) }
}

export function logoutCustomer(sessions: SessionRepository): void {
  sessions.clear()
}
