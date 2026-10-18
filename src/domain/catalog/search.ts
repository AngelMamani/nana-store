import type { Product } from "./entities.ts"
import { summarizePrice } from "./pricing.ts"

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
  const byName = (left: Product, right: Product) => left.name.localeCompare(right.name, "es")
  const byPrice = (left: Product, right: Product) =>
    summarizePrice(left).amount - summarizePrice(right).amount
  const byDate = (left: Product, right: Product) =>
    (right.createdAt ?? "").localeCompare(left.createdAt ?? "")

  switch (sort) {
    case "az":
      return copy.sort(byName)
    case "za":
      return copy.sort((left, right) => byName(right, left))
    case "price-asc":
      return copy.sort(byPrice)
    case "price-desc":
      return copy.sort((left, right) => byPrice(right, left))
    case "newest":
      return copy.sort(byDate)
    case "relevance":
      return copy.sort((left, right) => left.rank - right.rank || byDate(left, right))
  }
}
