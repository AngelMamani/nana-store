import { cartTotal, type Cart } from "../../domain/cart/cart.ts"
import type { OrderLine, StoreOrder } from "../../domain/ordering/entities.ts"
import type { OrderRepository } from "../../domain/ordering/ports.ts"

export async function listStoreOrders(orders: OrderRepository): Promise<StoreOrder[]> {
  return orders.listOrders()
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export async function listCustomerOrders(orders: OrderRepository, email: string): Promise<StoreOrder[]> {
  return orders.listCustomerOrders(normalizeEmail(email))
}

export async function recordWhatsappOrder(
  orders: OrderRepository,
  cart: Cart,
  customer: { name: string; email: string } | null,
): Promise<void> {
  if (!cart.lines.length) return
  await orders.saveOrder({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    customerName: customer?.name ?? null,
    customerEmail: customer?.email ? normalizeEmail(customer.email) : null,
    total: cartTotal(cart),
    status: "nuevo",
    note: cart.note,
    channel: "whatsapp",
    lines: cart.lines.map((line) => ({
      productId: line.productId,
      name: line.name,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      options: line.options,
    })),
  })
}

export type StoreSaleInput = {
  customerName: string
  customerEmail: string
  note: string
  lines: OrderLine[]
}

export async function recordStoreSale(orders: OrderRepository, input: StoreSaleInput): Promise<void> {
  if (!input.lines.length) return
  const total = input.lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)
  const email = input.customerEmail.trim()
  await orders.saveOrder({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    customerName: input.customerName.trim() || "Cliente de tienda",
    customerEmail: email ? normalizeEmail(email) : null,
    total,
    status: "atendido",
    note: input.note.trim(),
    channel: "tienda",
    lines: input.lines,
  })
}

export async function updateOrderStatus(
  orders: OrderRepository,
  order: StoreOrder,
  status: StoreOrder["status"],
): Promise<void> {
  await orders.saveOrder({ ...order, status })
}

export async function removeStoreOrder(orders: OrderRepository, orderId: string): Promise<void> {
  await orders.deleteOrder(orderId)
}
