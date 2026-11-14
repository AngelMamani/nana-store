import type { Category, Product, StoreProfile, StoreVideoKey, StoreVideoSlot } from "./entities.ts"

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

export interface CatalogWriter {
  saveStore(store: StoreProfile): Promise<void>
  saveStoreVideo(key: StoreVideoKey, slot: StoreVideoSlot): Promise<void>
  saveCategory(category: Category): Promise<void>
  deleteCategory(id: string): Promise<void>
  saveProduct(product: Product): Promise<void>
  deleteProduct(id: string): Promise<void>
}
