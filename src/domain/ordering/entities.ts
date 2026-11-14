import { variantOptionKey } from "../catalog/variants.ts"

export type OrderStatus = "nuevo" | "reservado" | "atendido" | "cancelado"
export type OrderChannel = "whatsapp" | "tienda"
export type PaymentMode = "contado" | "contraEntrega"
export type PayMethod = "efectivo" | "yape"

export type OrderLine = {
  productId: string
  name: string
  quantity: number
  unitPrice: number
  options: { name: string; title: string }[]
  custom?: boolean
}

export type StoreOrder = {
  id: string
  createdAt: string
  customerName: string | null
  customerEmail: string | null
  total: number
  status: OrderStatus
  note: string
  lines: OrderLine[]
  channel?: OrderChannel
  paymentMode?: PaymentMode
  payMethod?: PayMethod
  advance?: number
}

export function orderChannel(order: StoreOrder): OrderChannel {
  return order.channel === "tienda" ? "tienda" : "whatsapp"
}

export function channelLabel(channel: OrderChannel) {
  return channel === "tienda" ? "Tienda física" : "WhatsApp"
}

export function paymentMode(order: StoreOrder): PaymentMode {
  if (order.paymentMode === "contraEntrega" || order.status === "reservado") return "contraEntrega"
  return "contado"
}

export function paymentLabel(mode: PaymentMode) {
  return mode === "contraEntrega" ? "Contra entrega" : "Contado"
}

export function payMethodOf(order: StoreOrder): PayMethod | null {
  if (order.payMethod === "yape" || order.payMethod === "efectivo") return order.payMethod
  return null
}

export function payMethodLabel(method: PayMethod) {
  return method === "yape" ? "Yape" : "Efectivo"
}

export function orderAdvance(order: StoreOrder) {
  const amount = Number(order.advance ?? 0)
  if (!Number.isFinite(amount) || amount < 0) return 0
  return Math.min(amount, order.total)
}

export function orderBalance(order: StoreOrder) {
  if (order.status === "atendido" || order.status === "cancelado") return 0
  return Math.max(0, Math.round((order.total - orderAdvance(order)) * 100) / 100)
}

export function orderHoldsStock(status: OrderStatus) {
  return status === "reservado" || status === "atendido"
}

export function isCustomOrderLine(line: OrderLine) {
  return line.custom === true || line.productId.startsWith("custom:")
}

export function orderStatusLabel(status: OrderStatus, audience: "admin" | "customer" = "admin") {
  if (status === "nuevo") return audience === "customer" ? "En revisión" : "Nuevo"
  if (status === "reservado") return audience === "customer" ? "Reservado · contra entrega" : "Reservado"
  if (status === "atendido") return audience === "customer" ? "Entregado" : "Atendido"
  return "Cancelado"
}

export function reservedUnitsForProduct(orders: StoreOrder[], productId: string) {
  return orders.reduce((sum, order) => {
    if (order.status !== "reservado") return sum
    return (
      sum +
      order.lines.reduce((lineSum, line) => {
        if (isCustomOrderLine(line) || line.productId !== productId) return lineSum
        return lineSum + line.quantity
      }, 0)
    )
  }, 0)
}

export function reservedUnitsForVariant(
  orders: StoreOrder[],
  productId: string,
  options: { name: string; title: string }[],
) {
  const key = variantOptionKey(options)
  return orders.reduce((sum, order) => {
    if (order.status !== "reservado") return sum
    return (
      sum +
      order.lines.reduce((lineSum, line) => {
        if (isCustomOrderLine(line) || line.productId !== productId) return lineSum
        if (variantOptionKey(line.options) !== key) return lineSum
        return lineSum + line.quantity
      }, 0)
    )
  }, 0)
}
