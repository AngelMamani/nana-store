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
import { LocalStorageCartRepository } from "../cart/LocalStorageCartRepository.ts"
import snapshot from "../catalog/catalog.snapshot.json"
import { JsonCatalogRepository, type CatalogSnapshot } from "../catalog/JsonCatalogRepository.ts"

const catalog = new JsonCatalogRepository(snapshot as CatalogSnapshot)
const carts = new LocalStorageCartRepository()

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
}
