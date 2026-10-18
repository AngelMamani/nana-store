import type { Category, Product, StoreProfile } from "../../domain/catalog/entities.ts"
import type {
  CategoryRepository,
  ProductRepository,
  StoreRepository,
} from "../../domain/catalog/ports.ts"

export type CatalogSnapshot = {
  store: StoreProfile
  categories: Category[]
  products: Product[]
}

export class JsonCatalogRepository
  implements StoreRepository, CategoryRepository, ProductRepository
{
  readonly #store: StoreProfile
  readonly #categories: Category[]
  readonly #products: Product[]
  readonly #productsById: Map<string, Product>
  readonly #categoriesBySlug: Map<string, Category>

  constructor(snapshot: CatalogSnapshot) {
    this.#store = snapshot.store
    this.#categories = [...snapshot.categories].sort((left, right) => left.order - right.order)
    this.#products = snapshot.products
    this.#productsById = new Map(snapshot.products.map((product) => [product.id, product]))
    this.#categoriesBySlug = new Map(this.#categories.map((category) => [category.slug, category]))
  }

  getStore(): StoreProfile {
    return this.#store
  }

  listCategories(): Category[] {
    return this.#categories
  }

  findCategoryBySlug(slug: string): Category | null {
    return this.#categoriesBySlug.get(slug) ?? null
  }

  listProducts(): Product[] {
    return this.#products
  }

  findProductById(id: string): Product | null {
    return this.#productsById.get(id) ?? null
  }
}
