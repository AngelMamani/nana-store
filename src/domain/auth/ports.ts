import type { Account, Session, StoreUser, UserRole } from "./entities.ts"

export interface AccountRepository {
  findByEmail(email: string): Account | null
  findById(id: string): Account | null
  save(account: Account): void
}

export interface SessionRepository {
  load(): Session | null
  save(session: Session): void
  clear(): void
}

export interface PasswordHasher {
  hash(password: string): Promise<string>
  verify(password: string, passwordHash: string): Promise<boolean>
}

export interface IdGenerator {
  next(): string
}

export interface UserDirectory {
  listUsers(): Promise<StoreUser[]>
  updateUserRole(id: string, role: UserRole): Promise<void>
}
