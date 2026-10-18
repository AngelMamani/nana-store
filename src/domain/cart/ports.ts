import type { Cart } from "./cart.ts"

export interface CartRepository {
  load(): Cart
  save(cart: Cart): void
}
