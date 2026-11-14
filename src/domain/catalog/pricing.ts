import type { PriceSummary, Product, ProductVariant } from "./entities.ts"

export function unitPrice(price: number, promotionalPrice: number | null): number {
  if (promotionalPrice !== null && promotionalPrice < price) return promotionalPrice
  return price
}

function isOnOffer(price: number, promotionalPrice: number | null): boolean {
  return promotionalPrice !== null && promotionalPrice < price
}

export function discountPercent(amount: number, compareAt: number | null): number | null {
  if (compareAt === null || compareAt <= 0 || amount >= compareAt) return null
  return Math.round((1 - amount / compareAt) * 100)
}

function money(value: number) {
  return Math.round(value * 100) / 100
}

export function applyPercentOffer(product: Product, percent: number): Product {
  const factor = 1 - percent / 100
  return {
    ...product,
    promotionalPrice: money(product.price * factor),
    variants: product.variants.map((variant) => ({
      ...variant,
      promotionalPrice: money(variant.price * factor),
    })),
  }
}

export function applyFixedOffer(product: Product, promotionalPrice: number): Product {
  const promo = money(promotionalPrice)
  return {
    ...product,
    promotionalPrice: promo,
    variants: product.variants.map((variant) => ({
      ...variant,
      promotionalPrice: promo < variant.price ? promo : null,
    })),
  }
}

export function clearProductOffer(product: Product): Product {
  return {
    ...product,
    promotionalPrice: null,
    variants: product.variants.map((variant) => ({ ...variant, promotionalPrice: null })),
  }
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

export function defaultSelection(product: Product): Record<string, string> {
  const selection: Record<string, string> = {}
  for (const variation of product.variations) {
    const only = variation.options[0]
    if (variation.options.length === 1 && only) selection[variation.name] = only.title
  }
  return selection
}

export function selectionComplete(product: Product, selection: Record<string, string>): boolean {
  return product.variations.every((variation) => Boolean(selection[variation.name]))
}

export function isPurchasable(product: Product, selection: Record<string, string>): boolean {
  if (!selectionComplete(product, selection)) return false
  if (!product.variants.length) return true
  const variant = findVariant(product, selection)
  if (!variant) return false
  return variant.stock === null || variant.stock > 0
}

export function canQuickAdd(product: Product): boolean {
  return isPurchasable(product, defaultSelection(product))
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
