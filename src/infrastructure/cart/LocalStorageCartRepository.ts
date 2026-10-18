import { emptyCart, type Cart } from "../../domain/cart/cart.ts"
import type { CartRepository } from "../../domain/cart/ports.ts"

const STORAGE_KEY = "nana-store.cart"

export class LocalStorageCartRepository implements CartRepository {
  load(): Cart {
    if (typeof localStorage === "undefined") return emptyCart()
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyCart()
    try {
      const parsed = JSON.parse(raw) as Cart
      if (!parsed || !Array.isArray(parsed.lines)) return emptyCart()
      return { lines: parsed.lines, note: parsed.note ?? "" }
    } catch {
      return emptyCart()
    }
  }

  save(cart: Cart): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
  }
}
