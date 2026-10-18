import type { Category, Product, StoreProfile } from "./entities.ts"

export interface StoreRepository {
  getStore(): StoreProfile
}

export interface CategoryRepository {
  listCategories(): Category[]
  findCategoryBySlug(slug: string): Category | null
}

export interface ProductRepository {
  listProducts(): Product[]
  findProductById(id: string): Product | null
}
