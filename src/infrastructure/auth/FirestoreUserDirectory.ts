import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore"
import type { StoreUser, UserRole } from "../../domain/auth/entities.ts"
import { isProtectedDeveloper } from "../../domain/auth/entities.ts"
import type { UserDirectory } from "../../domain/auth/ports.ts"
import { firebaseDb } from "../firebase/firebase.ts"

function asUser(id: string, data: Record<string, unknown>): StoreUser {
  const email = String(data.email ?? "")
  const role = (data.role as UserRole) || "cliente"
  return {
    id,
    name: String(data.name || "Sin nombre"),
    email,
    role: isProtectedDeveloper(email) ? "desarrollador" : role,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : null,
  }
}

function sortUsers(users: StoreUser[]) {
  return [...users].sort((left, right) => left.name.localeCompare(right.name, "es"))
}

export class FirestoreUserDirectory implements UserDirectory {
  #users: StoreUser[] = []
  #listeners = new Set<() => void>()
  #ready: Promise<void> | null = null

  subscribe(listener: () => void) {
    this.#listeners.add(listener)
    void this.hydrate().catch(() => undefined)
    return () => {
      this.#listeners.delete(listener)
    }
  }

  async hydrate() {
    if (this.#ready) return this.#ready
    this.#ready = new Promise((resolve, reject) => {
      onSnapshot(
        collection(firebaseDb, "users"),
        (snap) => {
          this.#users = sortUsers(snap.docs.map((item) => asUser(item.id, item.data())))
          this.#notify()
          resolve()
        },
        (error) => {
          this.#ready = null
          reject(error)
        },
      )
    })
    return this.#ready
  }

  async listUsers(): Promise<StoreUser[]> {
    await this.hydrate()
    return this.#users
  }

  async updateUserRole(id: string, role: UserRole): Promise<void> {
    await updateDoc(doc(firebaseDb, "users", id), { role })
    this.#users = sortUsers(
      this.#users.map((user) => (user.id === id ? { ...user, role } : user)),
    )
    this.#notify()
  }

  #notify() {
    for (const listener of this.#listeners) listener()
  }
}