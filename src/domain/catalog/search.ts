import type { Product } from "./entities.ts"
import { summarizePrice } from "./pricing.ts"
import { productStock } from "./stock.ts"

export type ProductSort = "relevance" | "az" | "za" | "price-asc" | "price-desc" | "newest"

export function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
}

export function searchProducts(products: Product[], query: string): Product[] {
  const term = fold(query.trim())
  if (!term) return products
  return products.filter((product) => {
    const haystack = [
      product.name,
      product.description ?? "",
      product.code ?? "",
      ...product.variations.flatMap((variation) => [
        variation.name,
        ...variation.options.map((option) => option.title),
      ]),
    ]
    return fold(haystack.join(" ")).includes(term)
  })
}

export function sortProducts(products: Product[], sort: ProductSort): Product[] {
  const copy = [...products]
  const byPin = (left: Product, right: Product) => Number(Boolean(right.pin)) - Number(Boolean(left.pin))
  const byName = (left: Product, right: Product) => left.name.localeCompare(right.name, "es")
  const byPrice = (left: Product, right: Product) =>
    summarizePrice(left).amount - summarizePrice(right).amount
  const createdTime = (product: Product) => {
    const stamp = Date.parse(product.createdAt ?? "")
    return Number.isFinite(stamp) ? stamp : 0
  }
  const byDate = (left: Product, right: Product) => createdTime(right) - createdTime(left)

  switch (sort) {
    case "az":
      return copy.sort((left, right) => byPin(left, right) || byName(left, right))
    case "za":
      return copy.sort((left, right) => byPin(left, right) || byName(right, left))
    case "price-asc":
      return copy.sort((left, right) => byPin(left, right) || byPrice(left, right))
    case "price-desc":
      return copy.sort((left, right) => byPin(left, right) || byPrice(right, left))
    case "newest":
      return copy.sort((left, right) => byPin(left, right) || byDate(left, right))
    case "relevance":
      return copy.sort(
        (left, right) => byPin(left, right) || byDate(left, right) || left.rank - right.rank,
      )
  }
}

export function suggestRelatedProducts(products: Product[], current: Product, limit = 8): Product[] {
  const currentPrice = summarizePrice(current).amount
  const tokens = fold(current.name)
    .split(/\s+/)
    .filter((token) => token.length > 2)

  return products
    .filter((product) => product.id !== current.id)
    .filter((product) => {
      const stock = productStock(product)
      return stock === null || stock > 0
    })
    .map((product) => {
      let score = 0
      if (current.categoryId && product.categoryId === current.categoryId) score += 80
      if (product.pin) score += 16
      const price = summarizePrice(product).amount
      if (currentPrice > 0 && price > 0) {
        const ratio = Math.abs(price - currentPrice) / currentPrice
        if (ratio <= 0.35) score += 18
        else if (ratio <= 0.7) score += 8
      }
      const name = fold(product.name)
      if (tokens.some((token) => name.includes(token))) score += 12
      return { product, score }
    })
    .sort((left, right) => right.score - left.score || left.product.rank - right.product.rank)
    .slice(0, limit)
    .map((item) => item.product)
}
