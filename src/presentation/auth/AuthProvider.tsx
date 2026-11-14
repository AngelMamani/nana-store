import { useEffect, useMemo, useState, type ReactNode } from "react"
import type { Customer } from "../../domain/auth/entities.ts"
import { container } from "../../infrastructure/composition/container.ts"
import { AuthContext, type AuthContextValue } from "./auth-context.ts"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    let unsubscribe = () => {}
    void container.completeGoogleRedirect().then((redirected) => {
      if (!active) return
      if (redirected) setCustomer(redirected)
    }).finally(() => {
      if (!active) return
      unsubscribe = container.onAuthStateChanged((user) => {
        setCustomer(user)
        setLoading(false)
      })
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      customer,
      loading,
      login: async (email, password) => {
        const result = await container.loginCustomer({ email, password })
        if (result.ok) setCustomer(result.value)
        return result
      },
      loginWithGoogle: async () => {
        const result = await container.loginWithGoogle()
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
    [customer, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
