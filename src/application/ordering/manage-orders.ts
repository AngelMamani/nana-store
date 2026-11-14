import { cartTotal, type Cart } from "../../domain/cart/cart.ts"
import type { CatalogWriter, ProductRepository } from "../../domain/catalog/ports.ts"
import { findVariantByOptions } from "../../domain/catalog/variants.ts"
import {
  isCustomOrderLine,
  orderHoldsStock,
  type OrderLine,
  type PaymentMode,
  type StoreOrder,
} from "../../domain/ordering/entities.ts"
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

type CatalogStock = ProductRepository & CatalogWriter

async function applyOrderStock(catalog: CatalogStock, lines: OrderLine[], direction: "consume" | "restore") {
  const sign = direction === "consume" ? -1 : 1
  for (const line of lines) {
    if (isCustomOrderLine(line) || !line.productId) continue
    const product = catalog.findProductById(line.productId)
    if (!product) continue
    const variant = findVariantByOptions(product.variants, line.options)
    if (!variant || variant.stock === null) continue
    const nextStock = Math.max(0, variant.stock + sign * line.quantity)
    if (nextStock === variant.stock) continue
    await catalog.saveProduct({
      ...product,
      variants: product.variants.map((item) => (item.id === variant.id ? { ...item, stock: nextStock } : item)),
    })
  }
}

async function syncStock(catalog: CatalogStock, previous: StoreOrder | null, next: StoreOrder) {
  const wasHolding = previous ? orderHoldsStock(previous.status) : false
  const willHold = orderHoldsStock(next.status)
  if (!wasHolding && willHold) await applyOrderStock(catalog, next.lines, "consume")
  if (wasHolding && !willHold) await applyOrderStock(catalog, previous?.lines ?? next.lines, "restore")
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
    paymentMode: "contado",
    advance: 0,
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
  paymentMode: PaymentMode
  advance: number
}

export async function recordStoreSale(
  orders: OrderRepository,
  catalog: CatalogStock,
  input: StoreSaleInput,
): Promise<void> {
  if (!input.lines.length) return
  const total = input.lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)
  const email = input.customerEmail.trim()
  const contraEntrega = input.paymentMode === "contraEntrega"
  const order: StoreOrder = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    customerName: input.customerName.trim() || "Cliente de tienda",
    customerEmail: email ? normalizeEmail(email) : null,
    total,
    status: contraEntrega ? "reservado" : "atendido",
    note: input.note.trim(),
    channel: "tienda",
    paymentMode: input.paymentMode,
    advance: contraEntrega ? Math.min(Math.max(0, input.advance), total) : total,
    lines: input.lines,
  }
  await orders.saveOrder(order)
  await syncStock(catalog, null, order)
}

export async function updateOrderStatus(
  orders: OrderRepository,
  catalog: CatalogStock,
  order: StoreOrder,
  status: StoreOrder["status"],
  advance?: number,
): Promise<void> {
  const next: StoreOrder = {
    ...order,
    status,
    paymentMode: status === "reservado" ? "contraEntrega" : order.paymentMode,
    advance:
      advance === undefined
        ? status === "atendido"
          ? order.total
          : (order.advance ?? 0)
        : Math.min(Math.max(0, advance), order.total),
  }
  await orders.saveOrder(next)
  await syncStock(catalog, order, next)
}

export async function updateOrderAdvance(
  orders: OrderRepository,
  catalog: CatalogStock,
  order: StoreOrder,
  advance: number,
): Promise<void> {
  const next: StoreOrder = {
    ...order,
    paymentMode: "contraEntrega",
    advance: Math.min(Math.max(0, advance), order.total),
    status: order.status === "nuevo" ? "reservado" : order.status,
  }
  await orders.saveOrder(next)
  await syncStock(catalog, order, next)
}

export async function removeStoreOrder(
  orders: OrderRepository,
  catalog: CatalogStock,
  order: StoreOrder,
): Promise<void> {
  if (orderHoldsStock(order.status)) {
    await applyOrderStock(catalog, order.lines, "restore")
  }
  await orders.deleteOrder(order.id)
}
