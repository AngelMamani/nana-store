import type { StoreOrder } from "./entities.ts"

export interface OrderRepository {
  listOrders(): Promise<StoreOrder[]>
  listCustomerOrders(email: string): Promise<StoreOrder[]>
  saveOrder(order: StoreOrder): Promise<void>
  deleteOrder(orderId: string): Promise<void>
}
