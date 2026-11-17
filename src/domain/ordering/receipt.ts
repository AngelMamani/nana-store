import { formatPen } from "../catalog/money.ts"
import type { StoreProfile } from "../catalog/entities.ts"
import {
  orderAdvance,
  orderBalance,
  orderPhone,
  payMethodLabel,
  payMethodOf,
  paymentLabel,
  paymentMode,
  type OrderLine,
  type PayMethod,
  type PaymentMode,
  type StoreOrder,
} from "./entities.ts"

export type ReceiptTicket = {
  storeName: string
  storeLogo: string
  storeAddress: string
  storePhone: string
  createdAt: string
  printedAt: string
  customerName: string
  customerPhone: string
  lines: { name: string; detail: string; quantity: number; unitPrice: number }[]
  total: number
  advance: number
  balance: number
  payLabel: string
  note: string
  reserved: boolean
}

const WIDTH = 32

function fit(text: string, size: number) {
  const value = text.replace(/\s+/g, " ").trim()
  if (value.length <= size) return value
  return `${value.slice(0, size - 1)}.`
}

function money(amount: number) {
  return formatPen(amount)
}

function padRow(left: string, right: string, size: number) {
  const gap = size - left.length - right.length
  if (gap >= 1) return `${left}${" ".repeat(gap)}${right}`
  return `${fit(left, size - right.length - 1)} ${right}`
}

function wrap(text: string, size: number) {
  const words = text.split(" ").filter(Boolean)
  const lines: string[] = []
  let current = ""
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length <= size) {
      current = next
      continue
    }
    if (current) lines.push(current)
    current = word.length <= size ? word : fit(word, size)
  }
  if (current) lines.push(current)
  return lines
}

function formatWhen(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })
}

export function buildReceiptTicket(store: StoreProfile, input: {
  createdAt: string
  customerName: string
  customerPhone: string
  lines: OrderLine[]
  total: number
  advance: number
  balance: number
  paymentMode: PaymentMode
  payMethod: PayMethod | null
  note: string
  reserved: boolean
}): ReceiptTicket {
  return {
    storeName: store.name.trim() || "NaNa",
    storeLogo: store.logo.trim(),
    storeAddress: store.address.trim(),
    storePhone: store.whatsapp.trim() || store.phone.trim(),
    createdAt: input.createdAt,
    printedAt: new Date().toISOString(),
    customerName: input.customerName.trim() || "Cliente",
    customerPhone: input.customerPhone.trim(),
    lines: input.lines.map((line) => ({
      name: line.name,
      detail: line.options.map((option) => option.title).filter(Boolean).join(" · "),
      quantity: line.quantity,
      unitPrice: line.unitPrice,
    })),
    total: input.total,
    advance: input.advance,
    balance: input.balance,
    payLabel: `${paymentLabel(input.paymentMode)}${input.payMethod ? ` · ${payMethodLabel(input.payMethod)}` : ""}`,
    note: input.note.trim(),
    reserved: input.reserved,
  }
}

export function receiptFromOrder(store: StoreProfile, order: StoreOrder): ReceiptTicket {
  const mode = paymentMode(order)
  return buildReceiptTicket(store, {
    createdAt: order.closedAt ?? order.createdAt,
    customerName: order.customerName ?? "Cliente",
    customerPhone: orderPhone(order) ?? "",
    lines: order.lines,
    total: order.total,
    advance: orderAdvance(order),
    balance: orderBalance(order),
    paymentMode: mode,
    payMethod: payMethodOf(order),
    note: order.note,
    reserved: order.status === "reservado" || mode === "contraEntrega",
  })
}

export function receiptBodyLines(ticket: ReceiptTicket, columns = WIDTH) {
  const rule = "-".repeat(columns)
  const lines = [
    rule,
    `Venta: ${formatWhen(ticket.createdAt)}`,
    `Impreso: ${formatWhen(ticket.printedAt)}`,
  ]
  if (ticket.storeAddress) lines.push(...wrap(ticket.storeAddress, columns))
  if (ticket.storePhone) lines.push(`Tel: ${ticket.storePhone}`)
  lines.push(rule)
  lines.push(fit(`Cliente: ${ticket.customerName}`, columns))
  if (ticket.customerPhone) lines.push(`Cel: ${ticket.customerPhone}`)
  if (ticket.reserved) lines.push("Estado: RESERVADO")
  lines.push(rule)
  for (const line of ticket.lines) {
    const qty = `${line.quantity}x `
    const amount = money(line.unitPrice * line.quantity)
    const name = fit(line.name, columns - qty.length - amount.length - 1)
    lines.push(padRow(`${qty}${name}`, amount, columns))
    if (line.detail) lines.push(`  ${fit(line.detail.replace(/·/g, "-"), columns - 2)}`)
  }
  lines.push(rule)
  lines.push(padRow("TOTAL", money(ticket.total), columns))
  if (ticket.reserved) {
    lines.push(padRow("Adelanto", money(ticket.advance), columns))
    lines.push(padRow("Saldo", money(ticket.balance), columns))
  }
  lines.push(...wrap(ticket.payLabel, columns))
  if (ticket.note) {
    lines.push(rule)
    lines.push(...wrap(`Nota: ${ticket.note}`, columns))
  }
  lines.push(rule)
  lines.push("Gracias por su compra")
  lines.push("Vuelva pronto")
  return lines
}
