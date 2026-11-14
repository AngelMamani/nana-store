export type OrderStatus = "nuevo" | "atendido" | "cancelado"
export type OrderChannel = "whatsapp" | "tienda"

export type OrderLine = {
  productId: string
  name: string
  quantity: number
  unitPrice: number
  options: { name: string; title: string }[]
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
}

export function orderChannel(order: StoreOrder): OrderChannel {
  return order.channel === "tienda" ? "tienda" : "whatsapp"
}

export function channelLabel(channel: OrderChannel) {
  return channel === "tienda" ? "Tienda física" : "WhatsApp"
}
