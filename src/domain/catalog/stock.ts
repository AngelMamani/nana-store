import type { Product } from "./entities.ts"

export type InventoryAlert = "ok" | "low" | "out" | "none"

export function productStock(product: Product): number | null {
  if (!product.variants.length) return null
  if (product.variants.every((variant) => variant.stock === null)) return null
  return product.variants.reduce((sum, variant) => sum + (variant.stock ?? 0), 0)
}

export function inventoryAlert(product: Product, threshold = 3): InventoryAlert {
  const stock = productStock(product)
  if (stock === null) return "none"
  if (stock <= 0) return "out"
  if (stock <= threshold) return "low"
  return "ok"
}

export function isLowStock(product: Product, threshold = 3): boolean {
  const alert = inventoryAlert(product, threshold)
  return alert === "low" || alert === "out"
}
