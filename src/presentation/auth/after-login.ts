import type { NavigateFunction } from "react-router-dom"
import type { Customer } from "../../domain/auth/entities.ts"
import { markResumeCheckout } from "../cart/resume-checkout.ts"

export function safeNextPath(value: string | null) {
  if (!value) return null
  if (!value.startsWith("/") || value.startsWith("//")) return null
  return value
}

export function redirectAfterLogin(navigate: NavigateFunction, customer: Customer, search: string) {
  const params = new URLSearchParams(search)
  const next = safeNextPath(params.get("siguiente"))
  if (params.get("pedido") === "1") markResumeCheckout()
  if (next) {
    navigate(next, { replace: true })
    return
  }
  if (customer.role === "desarrollador" || customer.role === "administrador") {
    navigate("/admin", { replace: true })
    return
  }
  navigate("/cuenta", { replace: true })
}
