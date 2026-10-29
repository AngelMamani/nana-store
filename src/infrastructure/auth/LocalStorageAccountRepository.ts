import type { Account } from "../../domain/auth/entities.ts"
import type { AccountRepository } from "../../domain/auth/ports.ts"

const STORAGE_KEY = "nana-store.accounts"

export class LocalStorageAccountRepository implements AccountRepository {
  findByEmail(email: string): Account | null {
    return this.#read().find((account) => account.email === email) ?? null
  }

  findById(id: string): Account | null {
    return this.#read().find((account) => account.id === id) ?? null
  }

  save(account: Account): void {
    const accounts = this.#read().filter((item) => item.id !== account.id)
    accounts.push(account)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
  }

  #read(): Account[] {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw) as Account[]
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
}
