import { useMemo, useState, type ReactNode } from "react"
import type { Customer } from "../../domain/auth/entities.ts"
import { container } from "../../infrastructure/composition/container.ts"
import { AuthContext, type AuthContextValue } from "./auth-context.ts"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(() => container.currentCustomer())

  const value = useMemo<AuthContextValue>(
    () => ({
      customer,
      login: async (email, password) => {
        const result = await container.loginCustomer({ email, password })
        if (result.ok) setCustomer(result.value)
        return result
      },
      register: async (name, email, password) => {
        const result = await container.registerCustomer({ name, email, password })
        if (result.ok) setCustomer(result.value)
        return result
      },
      logout: () => {
        container.logoutCustomer()
        setCustomer(null)
      },
    }),
    [customer],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
