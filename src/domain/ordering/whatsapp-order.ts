import { cartTotal, type Cart } from "../cart/cart.ts"
import { formatPen } from "../catalog/money.ts"

export function buildOrderMessage(storeName: string, cart: Cart, customerName?: string): string {
  const lines = cart.lines.map((line, index) => {
    const options = line.options.map((option) => `${option.name}: ${option.title}`).join("\n   ")
    const detail = options ? `\n   ${options}` : ""
    const subtotal = formatPen(line.unitPrice * line.quantity)
    return `${index + 1}. ${line.name}${detail}\n   ${line.quantity} x ${formatPen(line.unitPrice)} = ${subtotal}`
  })
  const customer = customerName?.trim() ? `\n\nCliente: ${customerName.trim()}` : ""
  const note = cart.note.trim() ? `\n\nObservación: ${cart.note.trim()}` : ""
  return `Hola, quiero hacer un pedido en ${storeName}:\n\n${lines.join("\n\n")}\n\nTotal: ${formatPen(cartTotal(cart))}${customer}${note}`
}

export function buildProductInterestMessage(productName: string, customerName?: string): string {
  const who = customerName?.trim() ? ` Soy ${customerName.trim()}.` : ""
  return `Hola, tengo interés en ${productName}.${who}`
}
