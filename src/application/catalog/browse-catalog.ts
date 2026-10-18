import type {
  CategoryRepository,
  ProductRepository,
  StoreRepository,
} from "../../domain/catalog/ports.ts"
import { searchProducts, sortProducts, type ProductSort } from "../../domain/catalog/search.ts"
import type { Category, Product, StoreProfile } from "../../domain/catalog/entities.ts"

export type HomeSection = {
  category: Category
  total: number
  products: Product[]
}

export function getStore(stores: StoreRepository): StoreProfile {
  return stores.getStore()
}

export function listCategories(categories: CategoryRepository): Category[] {
  return categories.listCategories()
}

export function getCategoryBySlug(categories: CategoryRepository, slug: string): Category | null {
  return categories.findCategoryBySlug(slug)
}

export function getProductById(products: ProductRepository, id: string): Product | null {
  return products.findProductById(id)
}

export function listCategoryProducts(
  products: ProductRepository,
  categoryId: string,
  sort: ProductSort,
): Product[] {
  return sortProducts(
    products.listProducts().filter((product) => product.categoryId === categoryId),
    sort,
  )
}

export function getHomeSections(
  categories: CategoryRepository,
  products: ProductRepository,
  limit = 10,
): HomeSection[] {
  const ranked = sortProducts(products.listProducts(), "relevance")
  return categories
    .listCategories()
    .map((category) => {
      const matches = ranked.filter((product) => product.categoryId === category.id)
      return { category, total: matches.length, products: matches.slice(0, limit) }
    })
    .filter((section) => section.total > 0)
}

export function searchCatalog(
  products: ProductRepository,
  query: string,
  sort: ProductSort,
): Product[] {
  return sortProducts(searchProducts(products.listProducts(), query), sort)
}
