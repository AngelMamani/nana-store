import type { PriceSummary, Product, ProductVariant } from "./entities.ts"

export function unitPrice(price: number, promotionalPrice: number | null): number {
  if (promotionalPrice !== null && promotionalPrice < price) return promotionalPrice
  return price
}

function isOnOffer(price: number, promotionalPrice: number | null): boolean {
  return promotionalPrice !== null && promotionalPrice < price
}

export function summarizePrice(product: Product): PriceSummary {
  const sources = product.variants.length
    ? product.variants.map((variant) => ({
        price: variant.price,
        promotionalPrice: variant.promotionalPrice,
      }))
    : [{ price: product.price, promotionalPrice: product.promotionalPrice }]

  const priced = sources.map((source) => ({
    current: unitPrice(source.price, source.promotionalPrice),
    compare: isOnOffer(source.price, source.promotionalPrice) ? source.price : null,
    offer: isOnOffer(source.price, source.promotionalPrice),
  }))

  const cheapest = priced.reduce((best, item) => (item.current < best.current ? item : best))
  const distinct = new Set(priced.map((item) => item.current))

  return {
    amount: cheapest.current,
    compareAt: cheapest.compare,
    from: distinct.size > 1,
    offer: priced.some((item) => item.offer),
  }
}

export function findVariant(
  product: Product,
  selection: Record<string, string>,
): ProductVariant | null {
  if (!product.variants.length) return null
  return (
    product.variants.find((variant) =>
      variant.options.every((option) => selection[option.name] === option.title),
    ) ?? null
  )
}

export function isOptionAvailable(
  product: Product,
  selection: Record<string, string>,
  variationName: string,
  title: string,
): boolean {
  if (!product.variants.length) return true
  return product.variants.some((variant) => {
    const matches = variant.options.every((option) => {
      if (option.name === variationName) return option.title === title
      const selected = selection[option.name]
      return !selected || selected === option.title
    })
    return matches && (variant.stock === null || variant.stock > 0)
  })
}

export function selectedImage(product: Product, selection: Record<string, string>): string | null {
  const variant = findVariant(product, selection)
  if (variant?.image) return variant.image

  for (const variation of product.variations) {
    const title = selection[variation.name]
    const option = variation.options.find((item) => item.title === title && item.image)
    if (option?.image) return option.image
  }

  return product.image
}

export function isPurchasable(product: Product, selection: Record<string, string>): boolean {
  if (product.variations.length > 0 && !findVariant(product, selection)) return false
  const variant = findVariant(product, selection)
  if (!variant) return true
  return variant.stock === null || variant.stock > 0
}

export function selectedUnitPrice(product: Product, selection: Record<string, string>): number {
  const variant = findVariant(product, selection)
  if (!variant) return summarizePrice(product).amount
  return unitPrice(variant.price, variant.promotionalPrice)
}

export function selectedCompareAt(
  product: Product,
  selection: Record<string, string>,
): number | null {
  const variant = findVariant(product, selection)
  if (!variant) return summarizePrice(product).compareAt
  return isOnOffer(variant.price, variant.promotionalPrice) ? variant.price : null
}
