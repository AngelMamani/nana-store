import { useState } from "react"
import { useSearchParams } from "react-router-dom"
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

export function SearchPage() {
  const [params] = useSearchParams()
  const query = params.get("q") ?? ""
  const [sort, setSort] = useState<ProductSort>("relevance")
  const products = query.trim() ? container.searchCatalog(query, sort) : []

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Búsqueda</h1>
          <p>
            {query.trim()
              ? products.length === 0
                ? `No encontramos ningún producto con “${query}”.`
                : `${products.length} resultados para “${query}”`
              : "Escribe un nombre o una descripción."}
          </p>
        </div>
        {products.length > 0 && (
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
        )}
      </header>
      <div className="product-grid">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}
