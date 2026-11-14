import type { ProductVariant, ProductVariation } from "./entities.ts"

const SIZE_NAME = /talla|tama[nñ]o|size|medida/i
const COLOR_NAME = /color|colour|tono/i

export function extractSizes(variations: ProductVariation[]): string[] {
  const size = variations.find((variation) => SIZE_NAME.test(variation.name))
  if (size) return size.options.map((option) => option.title).filter(Boolean)
  if (variations.length === 1) return variations[0].options.map((option) => option.title).filter(Boolean)
  return []
}

export function findVariantByOptions(
  variants: ProductVariant[],
  options: { name: string; title: string }[],
): ProductVariant | null {
  if (variants.length === 0) return null
  const key = variantOptionKey(options)
  const matched = variants.find((variant) => variantOptionKey(variant.options) === key)
  if (matched) return matched
  return variants.length === 1 ? variants[0] : null
}

export function variantOptionKey(options: { name: string; title: string }[]): string {
  return [...options]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((option) => `${option.name}:${option.title}`)
    .join("|")
}

export function extractColors(variations: ProductVariation[]): string[] {
  const color = variations.find((variation) => COLOR_NAME.test(variation.name))
  return color ? color.options.map((option) => option.title).filter(Boolean) : []
}

function previousMatch(
  previous: ProductVariant[],
  options: { name: string; title: string }[],
): ProductVariant | undefined {
  return previous.find((variant) =>
    options.every((option) =>
      variant.options.some((item) => item.name === option.name && item.title === option.title),
    ),
  )
}

export function rebuildVariations(
  productId: string,
  price: number,
  promotionalPrice: number | null,
  sizes: string[],
  colors: string[],
  previous: ProductVariant[] = [],
  defaultStock: number | null = null,
): { variations: ProductVariation[]; variants: ProductVariant[] } {
  const cleanSizes = [...new Set(sizes.map((item) => item.trim()).filter(Boolean))]
  const cleanColors = [...new Set(colors.map((item) => item.trim()).filter(Boolean))]
  const variations: ProductVariation[] = []

  if (cleanColors.length) {
    variations.push({
      id: `${productId}-color`,
      name: "Color",
      isPrimary: true,
      options: cleanColors.map((title) => ({ title, image: null })),
    })
  }
  if (cleanSizes.length) {
    variations.push({
      id: `${productId}-size`,
      name: "Tamaño",
      isPrimary: cleanColors.length === 0,
      options: cleanSizes.map((title) => ({ title, image: null })),
    })
  }

  const colorList = cleanColors.length ? cleanColors : [null]
  const sizeList = cleanSizes.length ? cleanSizes : [null]
  const variants: ProductVariant[] = []
  let index = 0
  for (const color of colorList) {
    for (const size of sizeList) {
      const options = [
        ...(color ? [{ name: "Color", title: color }] : []),
        ...(size ? [{ name: "Tamaño", title: size }] : []),
      ]
      if (!options.length) continue
      const matched = previousMatch(previous, options)
      variants.push({
        id: matched?.id ?? `${productId}-v-${index}`,
        price: matched?.price ?? price,
        promotionalPrice: matched?.promotionalPrice ?? promotionalPrice,
        image: matched?.image ?? null,
        stock: defaultStock !== null && Number.isFinite(defaultStock) ? defaultStock : (matched?.stock ?? null),
        options,
      })
      index += 1
    }
  }

  return { variations, variants }
}
