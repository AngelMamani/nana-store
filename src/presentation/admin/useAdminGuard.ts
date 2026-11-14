import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../auth/auth-context.ts"

export function useAdminGuard() {
  const { customer, loading } = useAuth()
  const navigate = useNavigate()
  const isDev = customer?.role === "desarrollador"
  const isAdmin = customer?.role === "administrador" || isDev

  useEffect(() => {
    if (loading) return
    if (!customer) {
      navigate("/entrar", { replace: true })
      return
    }
    if (!isAdmin) navigate("/cuenta", { replace: true })
  }, [customer, isAdmin, loading, navigate])

  return { customer, loading, isAdmin, isDev }
}
