export type StoreProfile = {
  name: string
  logo: string
  banner: string
  address: string
  phone: string
  whatsapp: string
  email: string
  currency: "PEN"
}

export type Category = {
  id: string
  name: string
  slug: string
  order: number
}

export type ProductOption = {
  title: string
  image: string | null
}

export type ProductVariation = {
  id: string
  name: string
  isPrimary: boolean
  options: ProductOption[]
}

export type VariantOption = {
  name: string
  title: string
}

export type ProductVariant = {
  id: string
  price: number
  promotionalPrice: number | null
  image: string | null
  stock: number | null
  options: VariantOption[]
}

export type Product = {
  id: string
  name: string
  description: string | null
  code: string | null
  categoryId: string | null
  image: string | null
  gallery: string[]
  price: number
  promotionalPrice: number | null
  pin: boolean
  rank: number
  createdAt: string | null
  variations: ProductVariation[]
  variants: ProductVariant[]
}

export type PriceSummary = {
  amount: number
  compareAt: number | null
  from: boolean
  offer: boolean
}
