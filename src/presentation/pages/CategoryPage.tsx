import { useState } from "react"
import { useParams } from "react-router-dom"
import type { ProductSort } from "../../domain/catalog/search.ts"
import { container } from "../../infrastructure/composition/container.ts"
import { ProductCard } from "../components/ProductCard.tsx"

const SORTS: { id: ProductSort; label: string }[] = [
  { id: "relevance", label: "Más relevante" },
  { id: "az", label: "A-Z" },
  { id: "za", label: "Z-A" },
  { id: "price-desc", label: "Precio más alto" },
  { id: "price-asc", label: "Precio más bajo" },
  { id: "newest", label: "Más recientes" },
]

export function CategoryPage() {
  const { slug = "" } = useParams()
  const category = container.getCategoryBySlug(slug)
  const [sort, setSort] = useState<ProductSort>("relevance")

  if (!category) {
    return (
      <div className="page empty-state">
        <h1>Categoría no encontrada</h1>
        <p>Revisa el menú y elige otra categoría.</p>
      </div>
    )
  }

  const products = container.listCategoryProducts(category.id, sort)

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>{category.name}</h1>
          <p>{products.length} productos</p>
        </div>
        <label>
          Ordenar
          <select value={sort} onChange={(event) => setSort(event.target.value as ProductSort)}>
            {SORTS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </header>
      <div className="product-grid">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}
