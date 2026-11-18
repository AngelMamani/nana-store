import { variantOptionKey } from "../catalog/variants.ts"

export type OrderStatus = "nuevo" | "reservado" | "atendido" | "cancelado"
export type OrderChannel = "whatsapp" | "tienda"
export type PaymentMode = "contado" | "contraEntrega"
export type PayMethod = "efectivo" | "yape"
export type DiscountKind = "percent" | "amount"

export type OrderLine = {
  productId: string
  name: string
  quantity: number
  unitPrice: number
  unitCost?: number | null
  options: { name: string; title: string }[]
  custom?: boolean
  discountKind?: DiscountKind | null
  discountValue?: number
}

export type StoreOrder = {
  id: string
  createdAt: string
  closedAt?: string
  customerName: string | null
  customerEmail: string | null
  customerPhone?: string | null
  total: number
  status: OrderStatus
  note: string
  lines: OrderLine[]
  channel?: OrderChannel
  paymentMode?: PaymentMode
  payMethod?: PayMethod
  advance?: number
  discountKind?: DiscountKind | null
  discountValue?: number
}

export function orderChannel(order: StoreOrder): OrderChannel {
  return order.channel === "tienda" ? "tienda" : "whatsapp"
}

export function channelLabel(channel: OrderChannel) {
  return channel === "tienda" ? "Tienda física" : "WhatsApp"
}

function looksLikePhone(value: string) {
  const digits = value.replace(/\D/g, "")
  return digits.length >= 7 && digits.length <= 15 && !value.includes("@")
}

export function orderPhone(order: StoreOrder) {
  const phone = order.customerPhone?.trim()
  if (phone) return phone
  const email = order.customerEmail?.trim()
  if (email && looksLikePhone(email)) return email
  return null
}

export function orderContactLine(order: StoreOrder) {
  const phone = orderPhone(order)
  if (phone) return phone
  const email = order.customerEmail?.trim()
  if (email && !looksLikePhone(email)) return email
  return "Sin número"
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

function money2(amount: number) {
  return Math.round(amount * 100) / 100
}

export function discountAmount(base: number, kind?: DiscountKind | null, value?: number) {
  const amount = Number(value)
  if (!kind || !Number.isFinite(amount) || amount <= 0 || base <= 0) return 0
  if (kind === "percent") return money2(Math.min(base, (base * Math.min(amount, 100)) / 100))
  return money2(Math.min(base, amount))
}

export function discountLabel(kind?: DiscountKind | null, value?: number) {
  const amount = Number(value)
  if (!kind || !Number.isFinite(amount) || amount <= 0) return ""
  if (kind === "percent") return `${amount % 1 === 0 ? amount.toFixed(0) : amount}%`
  return `S/${amount.toFixed(2)}`
}

export function lineGross(line: Pick<OrderLine, "unitPrice" | "quantity">) {
  return money2(line.unitPrice * line.quantity)
}

export function lineDiscount(line: OrderLine) {
  return discountAmount(lineGross(line), line.discountKind, line.discountValue)
}

export function lineNet(line: OrderLine) {
  return money2(lineGross(line) - lineDiscount(line))
}

export function lineUnitCostOf(line: OrderLine) {
  if (line.unitCost === null || line.unitCost === undefined) return null
  const amount = Number(line.unitCost)
  if (!Number.isFinite(amount) || amount < 0) return null
  return money2(amount)
}

export function lineCostTotal(line: OrderLine) {
  const unit = lineUnitCostOf(line)
  if (unit === null) return null
  return money2(unit * line.quantity)
}

export function lineProfit(line: OrderLine) {
  const cost = lineCostTotal(line)
  if (cost === null) return null
  return money2(lineNet(line) - cost)
}

export function orderCostTotal(lines: OrderLine[]) {
  let amount = 0
  let missing = 0
  for (const line of lines) {
    const cost = lineCostTotal(line)
    if (cost === null) missing += 1
    else amount += cost
  }
  return { amount: money2(amount), missing }
}

export function orderProfitOf(order: {
  lines: OrderLine[]
  discountKind?: DiscountKind | null
  discountValue?: number
  total?: number
}) {
  const costs = orderCostTotal(order.lines)
  const revenue = Number.isFinite(order.total) ? Number(order.total) : orderPayableTotal(order)
  return {
    amount: money2(revenue - costs.amount),
    missing: costs.missing,
    cost: costs.amount,
  }
}

export function orderSubtotal(lines: OrderLine[]) {
  return money2(lines.reduce((sum, line) => sum + lineNet(line), 0))
}

export function orderDiscountOf(order: {
  lines: OrderLine[]
  discountKind?: DiscountKind | null
  discountValue?: number
}) {
  return discountAmount(orderSubtotal(order.lines), order.discountKind, order.discountValue)
}

export function orderPayableTotal(order: {
  lines: OrderLine[]
  discountKind?: DiscountKind | null
  discountValue?: number
}) {
  return money2(orderSubtotal(order.lines) - orderDiscountOf(order))
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

export function orderSoldAt(order: StoreOrder) {
  if (order.status !== "atendido") return null
  return order.closedAt ?? order.createdAt
}

export function isCustomOrderLine(line: OrderLine) {
  return line.custom === true || line.productId.startsWith("custom:")
}

export function applyLineCosts(lines: OrderLine[], costOf: (productId: string) => number | null): OrderLine[] {
  return lines.map((line) => {
    if (lineUnitCostOf(line) !== null) return line
    if (isCustomOrderLine(line)) return line
    const cost = costOf(line.productId)
    if (cost === null) return line
    return { ...line, unitCost: cost }
  })
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
