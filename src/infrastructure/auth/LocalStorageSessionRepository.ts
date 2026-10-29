import type { Session } from "../../domain/auth/entities.ts"
import type { SessionRepository } from "../../domain/auth/ports.ts"

const STORAGE_KEY = "nana-store.session"

export class LocalStorageSessionRepository implements SessionRepository {
  load(): Session | null {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as Session
      return parsed?.accountId ? parsed : null
    } catch {
      return null
    }
  }

  save(session: Session): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY)
  }
}
