import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { formatPen } from "../../domain/catalog/money.ts"
import { summarizePrice } from "../../domain/catalog/pricing.ts"
import { searchProducts } from "../../domain/catalog/search.ts"
import { productStock } from "../../domain/catalog/stock.ts"
import type { Product } from "../../domain/catalog/entities.ts"
import { container } from "../../infrastructure/composition/container.ts"
import { useCatalog } from "../catalog/catalog-context.ts"
import { confirmAdminAction, showAdminError, showAdminSuccess } from "./admin-alerts.ts"

const VIEW_KEY = "nana-admin-products-view"
const PAGE_SIZE = 10

type ProductView = "list" | "cards"

function readView(): ProductView {
  try {
    const saved = localStorage.getItem(VIEW_KEY)
    if (saved === "list" || saved === "cards") return saved
  } catch {
    /* ignore */
  }
  return window.matchMedia("(max-width: 767px)").matches ? "cards" : "list"
}

export function AdminProductsPage() {
  useCatalog()
  const navigate = useNavigate()
  const products = container.listProducts()
  const categories = container.listCategories()
  const [query, setQuery] = useState("")
  const [categoryId, setCategoryId] = useState("all")
  const [view, setView] = useState<ProductView>(readView)
  const [page, setPage] = useState(1)
  const [narrow, setNarrow] = useState(() => window.matchMedia("(max-width: 767px)").matches)

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)")
    const sync = () => setNarrow(media.matches)
    media.addEventListener("change", sync)
    return () => media.removeEventListener("change", sync)
  }, [])

  const filtered = useMemo(() => {
    const found = searchProducts(products, query)
    const scoped = categoryId === "all" ? found : found.filter((product) => product.categoryId === categoryId)
    return [...scoped].sort(
      (left, right) => Number(Boolean(right.pin)) - Number(Boolean(left.pin)) || left.name.localeCompare(right.name, "es"),
    )
  }, [products, query, categoryId])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const from = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const to = Math.min(currentPage * PAGE_SIZE, filtered.length)

  function changeView(next: ProductView) {
    setView(next)
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      /* ignore */
    }
  }

  function createProduct() {
    navigate("/admin/productos/nuevo")
  }

  function editProduct(product: Product) {
    navigate(`/admin/productos/${product.id}`)
  }

  async function remove(product: Product) {
    const ok = await confirmAdminAction({
      title: "Eliminar producto",
      text: `“${product.name}” se quitará del catálogo. Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      danger: true,
    })
    if (!ok) return
    try {
      await container.deleteProduct(product.id)
      await showAdminSuccess("Producto eliminado", "Se quitó del catálogo y se borraron sus fotos de Firebase.")
    } catch {
      await showAdminError("No se pudo eliminar", "Revisa las reglas de Firestore e inténtalo de nuevo.")
    }
  }

  return (
    <div className="admin-screen admin-products">
      <section className="admin-products-hero">
        <div>
          <p className="admin-kicker">Catálogo</p>
          <h1>Productos</h1>
          <p>
            {filtered.length} de {products.length} prendas
            {categoryId !== "all" ? " en esta categoría" : ""} · {PAGE_SIZE} por página
          </p>
        </div>
        <button type="button" className="btn" onClick={createProduct}>
          <Glyph name="plus" />
          Nuevo producto
        </button>
      </section>

      <div className="admin-products-toolbar">
        <label className="admin-products-search">
          <Glyph name="search" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
            placeholder="Buscar por nombre, código o talla"
          />
        </label>
        <label className="admin-products-filter">
          <Glyph name="grid" />
          <select
            value={categoryId}
            onChange={(event) => {
              setCategoryId(event.target.value)
              setPage(1)
            }}
          >
            <option value="all">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <div className="admin-products-chips" role="tablist" aria-label="Categorías">
          <button
            type="button"
            className={categoryId === "all" ? "is-on" : ""}
            onClick={() => {
              setCategoryId("all")
              setPage(1)
            }}
          >
            Todas
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={categoryId === category.id ? "is-on" : ""}
              onClick={() => {
                setCategoryId(category.id)
                setPage(1)
              }}
            >
              {category.name}
            </button>
          ))}
        </div>
        <div className="admin-products-views" role="group" aria-label="Modo de vista">
          <button
            type="button"
            className={view === "list" ? "is-active" : ""}
            aria-pressed={view === "list"}
            title="Vista lista"
            onClick={() => changeView("list")}
          >
            <Glyph name="list" />
            <span>Lista</span>
          </button>
          <button
            type="button"
            className={view === "cards" ? "is-active" : ""}
            aria-pressed={view === "cards"}
            title="Vista tarjetas"
            onClick={() => changeView("cards")}
          >
            <Glyph name="cards" />
            <span>Tarjetas</span>
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <section className="admin-products-empty">
          <Glyph name="shirt" />
          <strong>No hay prendas con ese filtro</strong>
          <p>Prueba otra búsqueda o crea un producto nuevo.</p>
        </section>
      ) : narrow || view === "cards" ? (
        <section className={`admin-products-grid${narrow ? " is-mobile" : ""}`}>
          {visible.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              categoryName={categories.find((item) => item.id === product.categoryId)?.name}
              onEdit={() => editProduct(product)}
              onRemove={() => void remove(product)}
            />
          ))}
        </section>
      ) : (
        <section className="admin-products-table admin-card">
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((product) => {
                  const price = summarizePrice(product)
                  const category = categories.find((item) => item.id === product.categoryId)
                  const stock = productStock(product)
                  return (
                    <tr key={product.id}>
                      <td>
                        <div className="admin-product-cell">
                          {product.image ? <img src={product.image} alt="" /> : <span />}
                          <div>
                            <strong>{product.name}</strong>
                            {price.offer && <em>Oferta</em>}
                          </div>
                        </div>
                      </td>
                      <td>{category?.name ?? "Sin categoría"}</td>
                      <td>
                        {price.from ? "Desde " : ""}
                        {formatPen(price.amount)}
                      </td>
                      <td>
                        <StockBadge stock={stock} />
                      </td>
                      <td>
                        <div className="admin-products-actions">
                          <button type="button" title="Editar" onClick={() => editProduct(product)}>
                            <Glyph name="edit" />
                          </button>
                          <button type="button" className="is-danger" title="Eliminar" onClick={() => void remove(product)}>
                            <Glyph name="trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {filtered.length > 0 && (
        <nav className="admin-products-pager" aria-label="Paginación de productos">
          <p>
            Mostrando {from}-{to} de {filtered.length}
          </p>
          <div>
            <button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
              <Glyph name="prev" />
              Anterior
            </button>
            <span>
              Página {currentPage} de {pageCount}
            </span>
            <button type="button" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>
              Siguiente
              <Glyph name="next" />
            </button>
          </div>
        </nav>
      )}

      <button type="button" className="admin-products-fab" onClick={createProduct}>
        <Glyph name="plus" />
        Nuevo
      </button>
    </div>
  )
}

function ProductCard({
  product,
  categoryName,
  onEdit,
  onRemove,
}: {
  product: Product
  categoryName?: string
  onEdit: () => void
  onRemove: () => void
}) {
  const price = summarizePrice(product)
  const stock = productStock(product)
  return (
    <article
      className="admin-product-card"
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onEdit()
        }
      }}
    >
      <div className="admin-product-card__media">
        {product.image ? <img src={product.image} alt="" /> : <span className="admin-product-card__ph"><Glyph name="shirt" /></span>}
        {product.pin ? <em className="is-pin">Destacado</em> : null}
        {price.offer ? <em>Oferta</em> : null}
      </div>
      <div className="admin-product-card__body">
        <div className="admin-product-card__tags">
          <p>{categoryName ?? "Sin categoría"}</p>
          {product.pin ? <i>Destacado</i> : null}
          {price.offer ? <i className="is-offer">Oferta</i> : null}
        </div>
        <h2>{product.name}</h2>
        {product.code ? <span className="admin-product-card__sku">{product.code}</span> : null}
        <div className="admin-product-card__price">
          <strong>
            {price.from ? "Desde " : ""}
            {formatPen(price.amount)}
          </strong>
          {price.compareAt ? <s>{formatPen(price.compareAt)}</s> : null}
        </div>
        <div className="admin-product-card__meta">
          <StockBadge stock={stock} />
          <div
            className="admin-products-actions"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <button type="button" title="Editar" onClick={onEdit}>
              <Glyph name="edit" />
            </button>
            <button type="button" className="is-danger" title="Eliminar" onClick={onRemove}>
              <Glyph name="trash" />
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

function StockBadge({ stock }: { stock: number | null }) {
  if (stock === null) return <b className="admin-stock-badge">—</b>
  const tone = stock <= 1 ? "is-critical" : stock <= 3 ? "is-low" : "is-ok"
  return <b className={`admin-stock-badge ${tone}`}>{stock} u.</b>
}

function Glyph({ name }: { name: string }) {
  const icons: Record<string, ReactNode> = {
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3-3" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.2" />
        <rect x="14" y="3" width="7" height="7" rx="1.2" />
        <rect x="3" y="14" width="7" height="7" rx="1.2" />
        <rect x="14" y="14" width="7" height="7" rx="1.2" />
      </>
    ),
    list: (
      <>
        <path d="M8 6h13" />
        <path d="M8 12h13" />
        <path d="M8 18h13" />
        <path d="M3 6h.01" />
        <path d="M3 12h.01" />
        <path d="M3 18h.01" />
      </>
    ),
    cards: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.2" />
        <rect x="14" y="3" width="7" height="7" rx="1.2" />
        <rect x="3" y="14" width="7" height="7" rx="1.2" />
        <rect x="14" y="14" width="7" height="7" rx="1.2" />
      </>
    ),
    edit: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6l-1 14H6L5 6" />
      </>
    ),
    shirt: <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.5a2 2 0 0 0 1.98 1.67H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10.86h1.16a2 2 0 0 0 1.98-1.67l.58-3.5a2 2 0 0 0-1.34-2.23z" />,
    prev: <path d="m15 18-6-6 6-6" />,
    next: <path d="m9 18 6-6-6-6" />,
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  )
}
