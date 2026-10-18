import type { NewCartLine } from "../../domain/cart/cart.ts"
import { addLine, emptyCart, removeLine, setLineQuantity, setNote } from "../../domain/cart/cart.ts"
import type { CartRepository } from "../../domain/cart/ports.ts"
import type { Cart } from "../../domain/cart/cart.ts"

export function loadCart(carts: CartRepository): Cart {
  return carts.load()
}

export function addProductToCart(carts: CartRepository, line: NewCartLine): Cart {
  const next = addLine(carts.load(), line)
  carts.save(next)
  return next
}

export function changeCartQuantity(carts: CartRepository, lineId: string, quantity: number): Cart {
  const next = setLineQuantity(carts.load(), lineId, quantity)
  carts.save(next)
  return next
}

export function removeCartLine(carts: CartRepository, lineId: string): Cart {
  const next = removeLine(carts.load(), lineId)
  carts.save(next)
  return next
}

export function updateCartNote(carts: CartRepository, note: string): Cart {
  const next = setNote(carts.load(), note)
  carts.save(next)
  return next
}

export function clearSavedCart(carts: CartRepository): Cart {
  const next = emptyCart()
  carts.save(next)
  return next
}
