import {
  currentCustomer,
  loginCustomer,
  logoutCustomer,
  registerCustomer,
} from "../../application/auth/authenticate.ts"
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
import type { ProductSort } from "../../domain/catalog/search.ts"
import type { NewCartLine } from "../../domain/cart/cart.ts"
import { LocalStorageAccountRepository } from "../auth/LocalStorageAccountRepository.ts"
import { LocalStorageSessionRepository } from "../auth/LocalStorageSessionRepository.ts"
import { Pbkdf2PasswordHasher } from "../auth/Pbkdf2PasswordHasher.ts"
import { RandomIdGenerator } from "../auth/RandomIdGenerator.ts"
import { LocalStorageCartRepository } from "../cart/LocalStorageCartRepository.ts"
import snapshot from "../catalog/catalog.snapshot.json"
import { JsonCatalogRepository, type CatalogSnapshot } from "../catalog/JsonCatalogRepository.ts"

import { FirebaseAuthService } from "../firebase/FirebaseAuthService.ts"
import { FirebaseStorageService } from "../firebase/FirebaseStorageService.ts"

const catalog = new JsonCatalogRepository(snapshot as CatalogSnapshot)
const carts = new LocalStorageCartRepository()
const accounts = new LocalStorageAccountRepository()
const sessions = new LocalStorageSessionRepository()
const auth = {
  accounts,
  sessions,
  passwords: new Pbkdf2PasswordHasher(),
  ids: new RandomIdGenerator(),
}
const firebaseAuthService = new FirebaseAuthService()
const firebaseStorageService = new FirebaseStorageService()

export const container = {
  getStore: () => getStore(catalog),
  listCategories: () => listCategories(catalog),
  getCategoryBySlug: (slug: string) => getCategoryBySlug(catalog, slug),
  getHomeSections: () => getHomeSections(catalog, catalog),
  listCategoryProducts: (categoryId: string, sort: ProductSort) =>
    listCategoryProducts(catalog, categoryId, sort),
  getProductById: (id: string) => getProductById(catalog, id),
  searchCatalog: (query: string, sort: ProductSort) => searchCatalog(catalog, query, sort),
  loadCart: () => loadCart(carts),
  addProductToCart: (line: NewCartLine) => addProductToCart(carts, line),
  changeCartQuantity: (lineId: string, quantity: number) =>
    changeCartQuantity(carts, lineId, quantity),
  removeCartLine: (lineId: string) => removeCartLine(carts, lineId),
  updateCartNote: (note: string) => updateCartNote(carts, note),
  clearCart: () => clearSavedCart(carts),
  // Autenticación con soporte Firebase y fallback local
  currentCustomer: () => currentCustomer(accounts, sessions),
  registerCustomer: (input: { name: string; email: string; password: string }) =>
    firebaseAuthService.registerWithEmail(input.name, input.email, input.password),
  loginCustomer: (input: { email: string; password: string }) =>
    firebaseAuthService.loginWithEmail(input.email, input.password),
  loginWithGoogle: () => firebaseAuthService.loginWithGoogle(),
  logoutCustomer: () => {
    firebaseAuthService.logout()
    logoutCustomer(sessions)
  },
  onAuthStateChanged: (cb: (c: import("../../domain/auth/entities.ts").Customer | null) => void) =>
    firebaseAuthService.onCustomerChanged(cb),
  storage: firebaseStorageService,
}

