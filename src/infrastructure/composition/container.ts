import {
  currentCustomer,
  logoutCustomer,
} from "../../application/auth/authenticate.ts"
import { changeStoreUserRole, listStoreUsers } from "../../application/auth/manage-users.ts"
import {
  addProductToCart,
  changeCartQuantity,
  clearSavedCart,
  loadCart,
  removeCartLine,
  updateCartNote,
} from "../../application/cart/manage-cart.ts"
import {
  getCategoryBySlug,
  getHomeSections,
  getProductById,
  getStore,
  listCategories,
  listCategoryProducts,
  searchCatalog,
} from "../../application/catalog/browse-catalog.ts"
import {
  removeCatalogCategory,
  removeCatalogProduct,
  saveCatalogCategory,
  saveCatalogProduct,
  saveStoreProfile,
  saveStoreVideoSlot,
} from "../../application/catalog/manage-catalog.ts"
import {
  listCustomerOrders,
  listStoreOrders,
  recordStoreSale,
  recordWhatsappOrder,
  removeStoreOrder,
  updateOrderAdvance,
  updateOrderStatus,
  type StoreSaleInput,
} from "../../application/ordering/manage-orders.ts"
import type { ProductSort } from "../../domain/catalog/search.ts"
import type { NewCartLine } from "../../domain/cart/cart.ts"
import type { Cart } from "../../domain/cart/cart.ts"
import type { Category, Product, StoreProfile, StoreVideoKey, StoreVideoSlot } from "../../domain/catalog/entities.ts"
import type { StoreUser, UserRole } from "../../domain/auth/entities.ts"
import type { StoreOrder } from "../../domain/ordering/entities.ts"
import { FirestoreUserDirectory } from "../auth/FirestoreUserDirectory.ts"
import { LocalStorageAccountRepository } from "../auth/LocalStorageAccountRepository.ts"
import { LocalStorageSessionRepository } from "../auth/LocalStorageSessionRepository.ts"
import { LocalStorageCartRepository } from "../cart/LocalStorageCartRepository.ts"
import snapshot from "../catalog/catalog.snapshot.json"
import { FirestoreCatalogRepository } from "../catalog/FirestoreCatalogRepository.ts"
import type { CatalogSnapshot } from "../catalog/JsonCatalogRepository.ts"
import { FirebaseAuthService } from "../firebase/FirebaseAuthService.ts"
import { FirebaseStorageService } from "../firebase/FirebaseStorageService.ts"
import { FirestoreOrderRepository } from "../ordering/FirestoreOrderRepository.ts"

const firebaseStorageService = new FirebaseStorageService()
const catalog = new FirestoreCatalogRepository(snapshot as CatalogSnapshot, firebaseStorageService)
const carts = new LocalStorageCartRepository()
const accounts = new LocalStorageAccountRepository()
const sessions = new LocalStorageSessionRepository()
const orders = new FirestoreOrderRepository()
const users = new FirestoreUserDirectory()
const firebaseAuthService = new FirebaseAuthService()

export const container = {
  hydrateCatalog: () => catalog.hydrate(),
  subscribeCatalog: (listener: () => void) => catalog.subscribe(listener),
  getStore: () => getStore(catalog),
  listCategories: () => listCategories(catalog),
  getCategoryBySlug: (slug: string) => getCategoryBySlug(catalog, slug),
  getHomeSections: () => getHomeSections(catalog, catalog),
  listCategoryProducts: (categoryId: string, sort: ProductSort) =>
    listCategoryProducts(catalog, categoryId, sort),
  getProductById: (id: string) => getProductById(catalog, id),
  listProducts: () => catalog.listProducts(),
  searchCatalog: (query: string, sort: ProductSort) => searchCatalog(catalog, query, sort),
  saveStore: (store: StoreProfile) => saveStoreProfile(catalog, store),
  saveStoreVideo: (key: StoreVideoKey, slot: StoreVideoSlot) => saveStoreVideoSlot(catalog, key, slot),
  saveCategory: (category: Category) => saveCatalogCategory(catalog, category),
  deleteCategory: (id: string) => removeCatalogCategory(catalog, id),
  saveProduct: (product: Product) => saveCatalogProduct(catalog, catalog, firebaseStorageService, product),
  deleteProduct: (id: string) => removeCatalogProduct(catalog, catalog, firebaseStorageService, id),
  loadCart: () => loadCart(carts),
  addProductToCart: (line: NewCartLine) => addProductToCart(carts, line),
  changeCartQuantity: (lineId: string, quantity: number) =>
    changeCartQuantity(carts, lineId, quantity),
  removeCartLine: (lineId: string) => removeCartLine(carts, lineId),
  updateCartNote: (note: string) => updateCartNote(carts, note),
  clearCart: () => clearSavedCart(carts),
  currentCustomer: () => currentCustomer(accounts, sessions),
  registerCustomer: (input: { name: string; email: string; password: string }) =>
    firebaseAuthService.registerWithEmail(input.name, input.email, input.password),
  loginCustomer: (input: { email: string; password: string }) =>
    firebaseAuthService.loginWithEmail(input.email, input.password),
  loginWithGoogle: () => firebaseAuthService.loginWithGoogle(),
  completeGoogleRedirect: () => firebaseAuthService.completeGoogleRedirect(),
  logoutCustomer: () => {
    firebaseAuthService.logout()
    logoutCustomer(sessions)
  },
  onAuthStateChanged: (cb: (c: import("../../domain/auth/entities.ts").Customer | null) => void) =>
    firebaseAuthService.onCustomerChanged(cb),
  storage: firebaseStorageService,
  listOrders: () => listStoreOrders(orders),
  listCustomerOrders: (email: string) => listCustomerOrders(orders, email),
  subscribeOrders: (listener: () => void) => orders.subscribe(listener),
  subscribeCustomerOrders: (email: string, listener: (orders: StoreOrder[]) => void) =>
    orders.subscribeCustomerOrders(email, listener),
  recordOrder: (cart: Cart, customer: { name: string; email: string } | null) =>
    recordWhatsappOrder(orders, cart, customer),
  recordStoreSale: (input: StoreSaleInput) => recordStoreSale(orders, catalog, input),
  updateOrderStatus: (order: StoreOrder, status: StoreOrder["status"], advance?: number) =>
    updateOrderStatus(orders, catalog, order, status, advance),
  updateOrderAdvance: (order: StoreOrder, advance: number) => updateOrderAdvance(orders, catalog, order, advance),
  deleteOrder: (order: StoreOrder) => removeStoreOrder(orders, catalog, order),
  listUsers: () => listStoreUsers(users),
  subscribeUsers: (listener: () => void) => users.subscribe(listener),
  updateUserRole: (user: StoreUser, role: UserRole) => changeStoreUserRole(users, user, role),
}
