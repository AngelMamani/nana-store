import type { Product } from "./entities.ts"
import { summarizePrice } from "./pricing.ts"

export const TARGET_PROFIT_MARGIN = 0.5

function money(value: number) {
  return Math.round(value * 100) / 100
}

export function parseMoney(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) return null
  const amount = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(amount) || amount < 0) return null
  return money(amount)
}

export function productCost(product: Pick<Product, "cost">): number | null {
  return parseMoney(product.cost)
}

export function recommendedSalePrice(cost: number): number {
  if (!Number.isFinite(cost) || cost <= 0) return 0
  return money(cost / TARGET_PROFIT_MARGIN)
}

export function profitAmount(salePrice: number, cost: number | null): number | null {
  if (cost === null || !Number.isFinite(cost) || !Number.isFinite(salePrice)) return null
  return money(salePrice - cost)
}

export function profitMarginPercent(salePrice: number, cost: number | null): number | null {
  const profit = profitAmount(salePrice, cost)
  if (profit === null || salePrice <= 0) return null
  return Math.round((profit / salePrice) * 100)
}

export function productProfit(product: Product) {
  const sale = summarizePrice(product).amount
  const cost = productCost(product)
  return {
    sale,
    cost,
    profit: profitAmount(sale, cost),
    margin: profitMarginPercent(sale, cost),
    suggested: cost !== null ? recommendedSalePrice(cost) : 0,
  }
}

export function normalizeProduct<T extends { cost?: number | null; video?: string | null }>(
  product: T,
): T & { cost: number | null; video: string | null } {
  const video = typeof product.video === "string" && product.video.trim() ? product.video.trim() : null
  return { ...product, cost: parseMoney(product.cost), video }
}

export function normalizeProductCost<T extends { cost?: number | null; video?: string | null }>(product: T) {
  return normalizeProduct(product)
}
