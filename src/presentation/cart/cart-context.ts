import { createContext, useContext } from "react"
import type { Cart, NewCartLine } from "../../domain/cart/cart.ts"

export type CartContextValue = {
  cart: Cart
  quantity: number
  total: number
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
  addLine: (line: NewCartLine) => void
  setQuantity: (lineId: string, quantity: number) => void
  removeLine: (lineId: string) => void
  setNote: (note: string) => void
  clear: () => void
}

export const CartContext = createContext<CartContextValue | null>(null)

export function useCart(): CartContextValue {
  const value = useContext(CartContext)
  if (!value) throw new Error("useCart debe usarse dentro de CartProvider")
  return value
}
