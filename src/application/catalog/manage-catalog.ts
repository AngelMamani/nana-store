import type { Category, Product, StoreProfile, StoreVideoKey, StoreVideoSlot } from "../../domain/catalog/entities.ts"
import type { CatalogWriter, ProductRepository } from "../../domain/catalog/ports.ts"

type ProductMediaStorage = {
  deleteProductMedia(productId: string, urls: string[]): Promise<void>
  deleteUrls(urls: string[]): Promise<void>
}

export function productMediaUrls(product: Product): string[] {
  return [
    ...new Set(
      [
        product.image,
        ...product.gallery,
        ...product.variants.map((variant) => variant.image),
        ...product.variations.flatMap((variation) => variation.options.map((option) => option.image)),
      ].filter((image): image is string => Boolean(image)),
    ),
  ]
}

export function saveStoreProfile(writer: CatalogWriter, store: StoreProfile): Promise<void> {
  return writer.saveStore(store)
}

export function saveStoreVideoSlot(
  writer: CatalogWriter,
  key: StoreVideoKey,
  slot: StoreVideoSlot,
): Promise<void> {
  return writer.saveStoreVideo(key, slot)
}

export function saveCatalogCategory(writer: CatalogWriter, category: Category): Promise<void> {
  return writer.saveCategory(category)
}

export function removeCatalogCategory(writer: CatalogWriter, id: string): Promise<void> {
  return writer.deleteCategory(id)
}

export async function saveCatalogProduct(
  writer: CatalogWriter,
  products: ProductRepository,
  storage: ProductMediaStorage,
  product: Product,
): Promise<void> {
  const previous = products.findProductById(product.id)
  await writer.saveProduct(product)
  if (!previous) return
  const kept = new Set(productMediaUrls(product))
  const leftover = productMediaUrls(previous).filter((url) => !kept.has(url))
  if (leftover.length) await storage.deleteUrls(leftover)
}

export async function removeCatalogProduct(
  writer: CatalogWriter,
  products: ProductRepository,
  storage: ProductMediaStorage,
  id: string,
): Promise<void> {
  const product = products.findProductById(id)
  await writer.deleteProduct(id)
  if (!product) return
  await storage.deleteProductMedia(product.id, productMediaUrls(product))
}
