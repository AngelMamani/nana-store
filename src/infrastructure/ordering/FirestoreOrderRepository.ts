import { collection, deleteDoc, doc, getDocs, onSnapshot, query, setDoc, where } from "firebase/firestore"
import type { StoreOrder } from "../../domain/ordering/entities.ts"
import type { OrderRepository } from "../../domain/ordering/ports.ts"
import { firebaseDb } from "../firebase/firebase.ts"

function sortOrders(orders: StoreOrder[]) {
  return [...orders].sort((left, right) => (right.createdAt ?? "").localeCompare(left.createdAt ?? ""))
}

export class FirestoreOrderRepository implements OrderRepository {
  #orders: StoreOrder[] = []
  #listeners = new Set<() => void>()
  #ready: Promise<void> | null = null

  subscribe(listener: () => void) {
    this.#listeners.add(listener)
    void this.hydrate().catch(() => undefined)
    return () => {
      this.#listeners.delete(listener)
    }
  }

  async hydrate() {
    if (this.#ready) return this.#ready
    this.#ready = new Promise((resolve, reject) => {
      onSnapshot(
        collection(firebaseDb, "catalog_orders"),
        (snap) => {
          this.#orders = sortOrders(snap.docs.map((item) => item.data() as StoreOrder))
          this.#notify()
          resolve()
        },
        (error) => {
          this.#ready = null
          reject(error)
        },
      )
    })
    return this.#ready
  }

  async listOrders(): Promise<StoreOrder[]> {
    await this.hydrate()
    return this.#orders
  }

  async listCustomerOrders(email: string): Promise<StoreOrder[]> {
    const needle = email.trim().toLowerCase()
    const snap = await getDocs(
      query(collection(firebaseDb, "catalog_orders"), where("customerEmail", "==", needle)),
    )
    return sortOrders(snap.docs.map((item) => item.data() as StoreOrder))
  }

  subscribeCustomerOrders(email: string, listener: (orders: StoreOrder[]) => void) {
    const needle = email.trim().toLowerCase()
    return onSnapshot(
      query(collection(firebaseDb, "catalog_orders"), where("customerEmail", "==", needle)),
      (snap) => {
        listener(sortOrders(snap.docs.map((item) => item.data() as StoreOrder)))
      },
    )
  }

  async saveOrder(order: StoreOrder): Promise<void> {
    await setDoc(doc(firebaseDb, "catalog_orders", order.id), JSON.parse(JSON.stringify(order)))
    this.#orders = sortOrders([...this.#orders.filter((item) => item.id !== order.id), order])
    this.#notify()
  }

  async deleteOrder(orderId: string): Promise<void> {
    await deleteDoc(doc(firebaseDb, "catalog_orders", orderId))
    this.#orders = this.#orders.filter((item) => item.id !== orderId)
    this.#notify()
  }

  #notify() {
    for (const listener of this.#listeners) listener()
  }
}
