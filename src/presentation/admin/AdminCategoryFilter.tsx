import type { Category } from "../../domain/catalog/entities.ts"

export function AdminCategoryFilter({
  categories,
  value,
  onChange,
}: {
  categories: Category[]
  value: string
  onChange: (categoryId: string) => void
}) {
  return (
    <>
      <label className="admin-products-filter">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" rx="1.2" />
          <rect x="14" y="3" width="7" height="7" rx="1.2" />
          <rect x="3" y="14" width="7" height="7" rx="1.2" />
          <rect x="14" y="14" width="7" height="7" rx="1.2" />
        </svg>
        <select value={value} onChange={(event) => onChange(event.target.value)} aria-label="Filtrar por categoría">
          <option value="all">Todas las categorías</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <div className="admin-products-chips" role="tablist" aria-label="Categorías">
        <button type="button" className={value === "all" ? "is-on" : ""} onClick={() => onChange("all")}>
          Todas
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={value === category.id ? "is-on" : ""}
            onClick={() => onChange(category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>
    </>
  )
}
