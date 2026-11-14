import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore"
import type { Category, Product, StoreProfile, StoreVideoKey, StoreVideoSlot } from "../../domain/catalog/entities.ts"
import { normalizeStoreProfile } from "../../domain/catalog/store-media.ts"
import type {
  CatalogWriter,
  CategoryRepository,
  ProductRepository,
  StoreRepository,
} from "../../domain/catalog/ports.ts"
import { firebaseDb } from "../firebase/firebase.ts"
import type { CatalogSnapshot } from "./JsonCatalogRepository.ts"

function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export class FirestoreCatalogRepository
  implements StoreRepository, CategoryRepository, ProductRepository, CatalogWriter
{
  #store!: StoreProfile
  #categories: Category[] = []
  #products: Product[] = []
  #productsById = new Map<string, Product>()
  #categoriesBySlug = new Map<string, Category>()
  #listeners = new Set<() => void>()
  #unsubs: Unsubscribe[] = []
  #hydrated = false
  #seed: CatalogSnapshot

  constructor(seed: CatalogSnapshot) {
    this.#seed = seed
    this.#apply(seed)
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  async hydrate(): Promise<void> {
    if (this.#hydrated) return
    this.#hydrated = true
    try {
      const productsSnap = await getDocs(collection(firebaseDb, "catalog_products"))
      if (productsSnap.empty) await this.#seedRemote()
      this.#listen()
    } catch (error) {
      this.#hydrated = false
      console.error("No se pudo leer el catálogo de Firebase:", error)
    }
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

  async saveStore(store: StoreProfile): Promise<void> {
    const next = normalizeStoreProfile(store)
    await setDoc(doc(firebaseDb, "catalog_store", "profile"), clean(next))
    this.#store = next
    this.#notify()
  }

  async saveStoreVideo(key: StoreVideoKey, slot: StoreVideoSlot): Promise<void> {
    const current = normalizeStoreProfile(this.#store)
    const nextSlot = { ...current.videos[key], ...slot }
    const next = { ...current, videos: { ...current.videos, [key]: nextSlot } }
    const ref = doc(firebaseDb, "catalog_store", "profile")
    try {
      await updateDoc(ref, { [`videos.${key}`]: clean(nextSlot) })
    } catch {
      await setDoc(ref, clean(next))
    }
    this.#store = next
    this.#notify()
  }

  async saveCategory(category: Category): Promise<void> {
    await setDoc(doc(firebaseDb, "catalog_categories", category.id), clean(category))
    this.#apply({
      store: this.#store,
      categories: [...this.#categories.filter((item) => item.id !== category.id), category],
      products: this.#products,
    })
  }

  async deleteCategory(id: string): Promise<void> {
    await deleteDoc(doc(firebaseDb, "catalog_categories", id))
    this.#apply({
      store: this.#store,
      categories: this.#categories.filter((item) => item.id !== id),
      products: this.#products,
    })
  }

  async saveProduct(product: Product): Promise<void> {
    await setDoc(doc(firebaseDb, "catalog_products", product.id), clean(product))
    this.#apply({
      store: this.#store,
      categories: this.#categories,
      products: [...this.#products.filter((item) => item.id !== product.id), product],
    })
  }

  async deleteProduct(id: string): Promise<void> {
    await deleteDoc(doc(firebaseDb, "catalog_products", id))
    this.#products = this.#products.filter((product) => product.id !== id)
    this.#productsById.delete(id)
    this.#notify()
  }

  async #seedRemote(): Promise<void> {
    const seed = this.#seed
    await setDoc(doc(firebaseDb, "catalog_store", "profile"), clean(seed.store))
    for (const chunk of chunks(seed.categories, 400)) {
      const batch = writeBatch(firebaseDb)
      for (const category of chunk) {
        batch.set(doc(firebaseDb, "catalog_categories", category.id), clean(category))
      }
      await batch.commit()
    }
    for (const chunk of chunks(seed.products, 400)) {
      const batch = writeBatch(firebaseDb)
      for (const product of chunk) {
        batch.set(doc(firebaseDb, "catalog_products", product.id), clean(product))
      }
      await batch.commit()
    }
  }

  #listen(): void {
    this.#unsubs.forEach((stop) => stop())
    this.#unsubs = [
      onSnapshot(doc(firebaseDb, "catalog_store", "profile"), (snapshot) => {
        if (!snapshot.exists()) return
        this.#store = normalizeStoreProfile(snapshot.data() as StoreProfile)
        this.#notify()
      }),
      onSnapshot(collection(firebaseDb, "catalog_categories"), (snapshot) => {
        const categories = snapshot.docs.map((item) => item.data() as Category)
        this.#apply({ store: this.#store, categories, products: this.#products })
      }),
      onSnapshot(collection(firebaseDb, "catalog_products"), (snapshot) => {
        const products = snapshot.docs.map((item) => item.data() as Product)
        this.#apply({ store: this.#store, categories: this.#categories, products })
      }),
    ]
  }

  #apply(snapshot: CatalogSnapshot): void {
    this.#store = normalizeStoreProfile(snapshot.store)
    this.#categories = [...snapshot.categories].sort((left, right) => left.order - right.order)
    this.#products = [...snapshot.products].sort((left, right) => left.rank - right.rank)
    this.#productsById = new Map(this.#products.map((product) => [product.id, product]))
    this.#categoriesBySlug = new Map(this.#categories.map((category) => [category.slug, category]))
    this.#notify()
  }

  #notify(): void {
    this.#listeners.forEach((listener) => listener())
  }
}

function chunks<T>(items: T[], size: number): T[][] {
  const groups: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size))
  }
  return groups
}
