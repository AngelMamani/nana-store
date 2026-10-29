import { createContext, useContext } from "react"
import type { AuthResult, Customer } from "../../domain/auth/entities.ts"

export type AuthContextValue = {
  customer: Customer | null
  loading: boolean
  login: (email: string, password: string) => Promise<AuthResult<Customer>>
  loginWithGoogle: () => Promise<AuthResult<Customer>>
  register: (name: string, email: string, password: string) => Promise<AuthResult<Customer>>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error("useAuth debe usarse dentro de AuthProvider")
  return value
}
