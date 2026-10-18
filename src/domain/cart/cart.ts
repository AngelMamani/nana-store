export type CartLineOption = {
  name: string
  title: string
}

export type CartLine = {
  lineId: string
  productId: string
  variantId: string | null
  name: string
  image: string | null
  options: CartLineOption[]
  unitPrice: number
  quantity: number
}

export type Cart = {
  lines: CartLine[]
  note: string
}

export type NewCartLine = Omit<CartLine, "lineId" | "quantity"> & {
  quantity: number
}

export function emptyCart(): Cart {
  return { lines: [], note: "" }
}

export function lineIdFor(productId: string, variantId: string | null): string {
  return `${productId}::${variantId ?? "base"}`
}

export function cartQuantity(cart: Cart): number {
  return cart.lines.reduce((sum, line) => sum + line.quantity, 0)
}

export function cartTotal(cart: Cart): number {
  return cart.lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)
}

export function addLine(cart: Cart, line: NewCartLine): Cart {
  const lineId = lineIdFor(line.productId, line.variantId)
  const existing = cart.lines.find((item) => item.lineId === lineId)
  if (!existing) {
    return { ...cart, lines: [...cart.lines, { ...line, lineId }] }
  }
  return {
    ...cart,
    lines: cart.lines.map((item) =>
      item.lineId === lineId ? { ...item, quantity: item.quantity + line.quantity } : item,
    ),
  }
}

export function setLineQuantity(cart: Cart, lineId: string, quantity: number): Cart {
  if (quantity <= 0) return removeLine(cart, lineId)
  return {
    ...cart,
    lines: cart.lines.map((line) => (line.lineId === lineId ? { ...line, quantity } : line)),
  }
}

export function removeLine(cart: Cart, lineId: string): Cart {
  return { ...cart, lines: cart.lines.filter((line) => line.lineId !== lineId) }
}

export function setNote(cart: Cart, note: string): Cart {
  return { ...cart, note }
}
