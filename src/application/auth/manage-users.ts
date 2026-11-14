import type { StoreUser, UserRole } from "../../domain/auth/entities.ts"
import { isProtectedDeveloper } from "../../domain/auth/entities.ts"
import type { UserDirectory } from "../../domain/auth/ports.ts"

export function listStoreUsers(users: UserDirectory): Promise<StoreUser[]> {
  return users.listUsers()
}

export function changeStoreUserRole(
  users: UserDirectory,
  target: StoreUser,
  role: UserRole,
): Promise<void> {
  if (isProtectedDeveloper(target.email) && role !== "desarrollador") {
    return Promise.reject(new Error("protected-developer"))
  }
  return users.updateUserRole(target.id, role)
}