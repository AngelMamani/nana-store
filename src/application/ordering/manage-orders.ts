import { cartTotal, type Cart } from "../../domain/cart/cart.ts"
import type { CatalogWriter, ProductRepository } from "../../domain/catalog/ports.ts"
import { findVariantByOptions } from "../../domain/catalog/variants.ts"
import {
  isCustomOrderLine,
  orderHoldsStock,
  orderPayableTotal,
  type DiscountKind,
  type OrderLine,
  type PayMethod,
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
  if (wasHolding && willHold) {
    await applyOrderStock(catalog, previous?.lines ?? [], "restore")
    await applyOrderStock(catalog, next.lines, "consume")
    return
  }
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
  customerPhone: string
  note: string
  lines: OrderLine[]
  paymentMode: PaymentMode
  payMethod: PayMethod
  advance: number
  discountKind?: DiscountKind | null
  discountValue?: number
}

function normalizePhone(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.replace(/[^\d+\s-]/g, "").replace(/\s+/g, " ").trim() || null
}

export async function recordStoreSale(
  orders: OrderRepository,
  catalog: CatalogStock,
  input: StoreSaleInput,
): Promise<void> {
  if (!input.lines.length) return
  const total = orderPayableTotal(input)
  const phone = normalizePhone(input.customerPhone)
  const contraEntrega = input.paymentMode === "contraEntrega"
  const now = new Date().toISOString()
  const order: StoreOrder = {
    id: crypto.randomUUID(),
    createdAt: now,
    closedAt: contraEntrega ? undefined : now,
    customerName: input.customerName.trim() || "Cliente de tienda",
    customerEmail: null,
    customerPhone: phone,
    total,
    status: contraEntrega ? "reservado" : "atendido",
    note: input.note.trim(),
    channel: "tienda",
    paymentMode: input.paymentMode,
    payMethod: input.payMethod,
    discountKind: input.discountKind ?? null,
    discountValue: input.discountKind ? Number(input.discountValue) || 0 : 0,
    advance: contraEntrega ? Math.min(Math.max(0, input.advance), total) : total,
    lines: input.lines,
  }
  await orders.saveOrder(order)
  await syncStock(catalog, null, order)
}

export async function updateStoreSale(
  orders: OrderRepository,
  catalog: CatalogStock,
  order: StoreOrder,
  input: StoreSaleInput,
): Promise<void> {
  if (!input.lines.length) return
  const total = orderPayableTotal(input)
  const phone = normalizePhone(input.customerPhone)
  const contraEntrega = input.paymentMode === "contraEntrega"
  const now = new Date().toISOString()
  const email = order.customerEmail?.includes("@") ? order.customerEmail : null
  const next: StoreOrder = {
    ...order,
    customerName: input.customerName.trim() || order.customerName || "Cliente de tienda",
    customerEmail: email,
    customerPhone: phone,
    total,
    status: contraEntrega ? "reservado" : "atendido",
    closedAt: contraEntrega ? undefined : (order.closedAt ?? now),
    note: input.note.trim(),
    paymentMode: input.paymentMode,
    payMethod: input.payMethod,
    discountKind: input.discountKind ?? null,
    discountValue: input.discountKind ? Number(input.discountValue) || 0 : 0,
    advance: contraEntrega ? Math.min(Math.max(0, input.advance), total) : total,
    lines: input.lines,
  }
  await orders.saveOrder(next)
  await syncStock(catalog, order, next)
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
    closedAt: status === "atendido" ? (order.closedAt ?? new Date().toISOString()) : undefined,
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
