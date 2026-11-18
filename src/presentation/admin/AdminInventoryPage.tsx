import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react"
import { Link, useNavigate } from "react-router-dom"
import { formatPen } from "../../domain/catalog/money.ts"
import { summarizePrice } from "../../domain/catalog/pricing.ts"
import { searchProducts } from "../../domain/catalog/search.ts"
import { inventoryAlert, productStock, type InventoryAlert } from "../../domain/catalog/stock.ts"
import { extractColors, extractSizes, variantOptionKey } from "../../domain/catalog/variants.ts"
import type { Product, ProductVariant } from "../../domain/catalog/entities.ts"
import { reservedUnitsForProduct, type StoreOrder } from "../../domain/ordering/entities.ts"
import { container } from "../../infrastructure/composition/container.ts"
import { useCatalog } from "../catalog/catalog-context.ts"
import { showAdminError } from "./admin-alerts.ts"
import { AdminCategoryFilter } from "./AdminCategoryFilter.tsx"

const VIEW_KEY = "nana-admin-inventory-view"
const PAGE_SIZE = 10
const ALERT_ORDER: Record<InventoryAlert, number> = { out: 0, low: 1, ok: 2, none: 3 }

type InventoryView = "list" | "cards"
type StockFilter = "all" | InventoryAlert

function readView(): InventoryView {
  try {
    const saved = localStorage.getItem(VIEW_KEY)
    if (saved === "list" || saved === "cards") return saved
  } catch {
    /* ignore */
  }
  return window.matchMedia("(max-width: 767px)").matches ? "cards" : "list"
}

function variantTitle(variant: ProductVariant) {
  const titles = variant.options.map((option) => option.title).filter(Boolean)
  return titles.join(" · ") || "Única"
}

export function AdminInventoryPage() {
  useCatalog()
  const navigate = useNavigate()
  const products = container.listProducts()
  const categories = container.listCategories()
  const [query, setQuery] = useState("")
  const [categoryId, setCategoryId] = useState("all")
  const [filter, setFilter] = useState<StockFilter>("all")
  const [view, setView] = useState<InventoryView>(readView)
  const [page, setPage] = useState(1)
  const [openId, setOpenId] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [orders, setOrders] = useState<StoreOrder[]>([])

  useEffect(() => {
    let active = true
    void container.listOrders().then((next) => {
      if (active) setOrders(next)
    })
    const stop = container.subscribeOrders(() => {
      void container.listOrders().then((next) => {
        if (active) setOrders(next)
      })
    })
    return () => {
      active = false
      stop()
    }
  }, [])

  const stats = useMemo(() => {
    let units = 0
    let ok = 0
    let low = 0
    let out = 0
    let none = 0
    for (const product of products) {
      const alert = inventoryAlert(product)
      const stock = productStock(product)
      if (stock !== null) units += stock
      if (alert === "ok") ok += 1
      if (alert === "low") low += 1
      if (alert === "out") out += 1
      if (alert === "none") none += 1
    }
    return { units, ok, low, out, none }
  }, [products])

  const filtered = useMemo(() => {
    const found = searchProducts(products, query).filter((product) => {
      if (categoryId !== "all" && product.categoryId !== categoryId) return false
      if (filter !== "all" && inventoryAlert(product) !== filter) return false
      return true
    })
    return found.sort((left, right) => {
      const alertDiff = ALERT_ORDER[inventoryAlert(left)] - ALERT_ORDER[inventoryAlert(right)]
      if (alertDiff !== 0) return alertDiff
      const leftStock = productStock(left) ?? 9999
      const rightStock = productStock(right) ?? 9999
      return leftStock - rightStock || left.name.localeCompare(right.name, "es")
    })
  }, [products, query, categoryId, filter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const from = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const to = Math.min(currentPage * PAGE_SIZE, filtered.length)

  function changeView(next: InventoryView) {
    setView(next)
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      /* ignore */
    }
  }

  function applyFilter(next: StockFilter) {
    setFilter(next)
    setPage(1)
  }

  async function changeStock(product: Product, variantId: string, nextStock: number) {
    const stock = Math.max(0, Math.round(nextStock))
    const key = `${product.id}:${variantId}`
    setBusyKey(key)
    try {
      await container.saveProduct({
        ...product,
        variants: product.variants.map((variant) =>
          variant.id === variantId ? { ...variant, stock } : variant,
        ),
      })
    } catch {
      await showAdminError("No se pudo guardar el stock", "Revisa la conexión e inténtalo de nuevo.")
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div className="admin-screen admin-inventory">
      <section className="admin-products-hero">
        <div>
          <p className="admin-kicker">Operación</p>
          <h1>Inventario</h1>
          <p>
            {stats.units} unidades en {products.length} prendas · aviso con 3 o menos ·{" "}
            {stats.out + stats.low} requieren atención
          </p>
        </div>
        <Link className="btn btn--outline" to="/admin/productos">
          <Glyph name="shirt" />
          Ir a productos
        </Link>
      </section>

      <section className="admin-inventory-kpis" aria-label="Resumen de stock">
        <KpiCard
          tone="violet"
          icon="box"
          label="Unidades"
          value={stats.units}
          hint="en todas las variantes"
          active={filter === "all"}
          onClick={() => applyFilter("all")}
        />
        <KpiCard
          tone="mint"
          icon="ok"
          label="En nivel"
          value={stats.ok}
          hint="más de 3 unidades"
          active={filter === "ok"}
          onClick={() => applyFilter("ok")}
        />
        <KpiCard
          tone="gold"
          icon="alert"
          label="Stock bajo"
          value={stats.low}
          hint="1 a 3 unidades"
          active={filter === "low"}
          onClick={() => applyFilter("low")}
        />
        <KpiCard
          tone="coral"
          icon="out"
          label="Agotados"
          value={stats.out}
          hint="0 unidades"
          active={filter === "out"}
          onClick={() => applyFilter("out")}
        />
        <KpiCard
          tone="ink"
          icon="dash"
          label="Sin control"
          value={stats.none}
          hint="sin stock definido"
          active={filter === "none"}
          onClick={() => applyFilter("none")}
        />
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
            placeholder="Buscar prenda, color o talla"
          />
        </label>
        <AdminCategoryFilter
          categories={categories}
          value={categoryId}
          onChange={(next) => {
            setCategoryId(next)
            setPage(1)
          }}
        />
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
          <Glyph name="box" />
          <strong>No hay prendas con ese filtro</strong>
          <p>Cambia la búsqueda o pulsa otra tarjeta de resumen.</p>
        </section>
      ) : view === "cards" ? (
        <section className="admin-inventory-grid">
          {visible.map((product) => (
            <InventoryCard
              key={product.id}
              product={product}
              categoryName={categories.find((item) => item.id === product.categoryId)?.name}
              reserved={reservedUnitsForProduct(orders, product.id)}
              open={openId === product.id}
              busyKey={busyKey}
              onToggle={() => setOpenId(openId === product.id ? null : product.id)}
              onEdit={() => navigate(`/admin/productos/${product.id}`)}
              onChangeStock={changeStock}
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
                  <th>Estado</th>
                  <th>Unidades</th>
                  <th>Variantes</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((product) => {
                  const stock = productStock(product)
                  const reserved = reservedUnitsForProduct(orders, product.id)
                  const alert = inventoryAlert(product)
                  const open = openId === product.id
                  return (
                    <Fragment key={product.id}>
                      <tr className={alert === "out" || alert === "low" ? "is-warn" : ""}>
                        <td>
                          <div className="admin-product-cell">
                            {product.image ? <img src={product.image} alt="" /> : <span />}
                            <div>
                              <strong>{product.name}</strong>
                              <em>
                                {categories.find((item) => item.id === product.categoryId)?.name ?? "Sin categoría"}
                                {" · "}
                                {formatPen(summarizePrice(product).amount)}
                              </em>
                            </div>
                          </div>
                        </td>
                        <td>
                          <AlertBadge alert={alert} />
                        </td>
                        <td>
                          {stock === null ? "—" : `${stock} u.`}
                          {reserved > 0 ? <em className="admin-stock-reserved"> · {reserved} reserv.</em> : null}
                        </td>
                        <td>{product.variants.length || "—"}</td>
                        <td>
                          <div className="admin-products-actions">
                            <button
                              type="button"
                              title={open ? "Ocultar variantes" : "Ver variantes"}
                              aria-expanded={open}
                              onClick={() => setOpenId(open ? null : product.id)}
                            >
                              <Glyph name={open ? "up" : "down"} />
                            </button>
                            <button type="button" title="Editar producto" onClick={() => navigate(`/admin/productos/${product.id}`)}>
                              <Glyph name="edit" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {open && (
                        <tr className="admin-inventory-detail-row">
                          <td colSpan={5}>
                            <VariantPanel product={product} busyKey={busyKey} onChangeStock={changeStock} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {filtered.length > 0 && (
        <nav className="admin-products-pager" aria-label="Paginación de inventario">
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
    </div>
  )
}

function InventoryCard({
  product,
  categoryName,
  open,
  busyKey,
  onToggle,
  onEdit,
  reserved,
  onChangeStock,
}: {
  product: Product
  categoryName?: string
  reserved: number
  open: boolean
  busyKey: string | null
  onToggle: () => void
  onEdit: () => void
  onChangeStock: (product: Product, variantId: string, nextStock: number) => void
}) {
  const stock = productStock(product)
  const alert = inventoryAlert(product)
  return (
    <article className={`admin-inventory-card is-${alert}`}>
      <div className="admin-inventory-card__top">
        {product.image ? <img src={product.image} alt="" /> : <span className="admin-inventory-card__ph"><Glyph name="shirt" /></span>}
        <div>
          <p>{categoryName ?? "Sin categoría"}</p>
          <h2>{product.name}</h2>
          <AlertBadge alert={alert} />
        </div>
      </div>
      <div className="admin-inventory-card__meta">
        <strong>{stock === null ? "Sin control" : `${stock} u.`}</strong>
        <span>
          {product.variants.length} variantes
          {reserved > 0 ? ` · ${reserved} reservadas` : ""}
        </span>
      </div>
      {open && <VariantPanel product={product} busyKey={busyKey} onChangeStock={onChangeStock} />}
      <div className="admin-products-actions">
        <button type="button" title={open ? "Ocultar variantes" : "Ajustar stock"} onClick={onToggle}>
          <Glyph name={open ? "up" : "down"} />
        </button>
        <button type="button" title="Editar producto" onClick={onEdit}>
          <Glyph name="edit" />
        </button>
      </div>
    </article>
  )
}

function VariantPanel({
  product,
  busyKey,
  onChangeStock,
}: {
  product: Product
  busyKey: string | null
  onChangeStock: (product: Product, variantId: string, nextStock: number) => void
}) {
  const colors = extractColors(product.variations)
  const sizes = extractSizes(product.variations)

  if (!product.variants.length) {
    return (
      <div className="admin-inventory-panel">
        <p>Esta prenda no tiene variantes. Ábrela en Productos para armar color, talla y stock.</p>
      </div>
    )
  }

  if (colors.length && sizes.length) {
    return (
      <div className="admin-inventory-panel">
        <div className="admin-table-wrapper">
          <table className="admin-table admin-inventory-matrix">
            <thead>
              <tr>
                <th>Color / talla</th>
                {sizes.map((size) => (
                  <th key={size}>{size}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {colors.map((color) => (
                <tr key={color}>
                  <th>{color}</th>
                  {sizes.map((size) => {
                    const key = variantOptionKey([
                      { name: "Color", title: color },
                      { name: "Tamaño", title: size },
                    ])
                    const variant = product.variants.find((item) => variantOptionKey(item.options) === key)
                    return (
                      <td key={size}>
                        {variant ? (
                          <StockStepper
                            value={variant.stock}
                            disabled={busyKey === `${product.id}:${variant.id}`}
                            onChange={(next) => onChangeStock(product, variant.id, next)}
                          />
                        ) : (
                          "—"
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-inventory-panel">
      <ul className="admin-inventory-variants">
        {product.variants.map((variant) => (
          <li key={variant.id}>
            <span>{variantTitle(variant)}</span>
            <StockStepper
              value={variant.stock}
              disabled={busyKey === `${product.id}:${variant.id}`}
              onChange={(next) => onChangeStock(product, variant.id, next)}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

function StockStepper({
  value,
  disabled,
  onChange,
}: {
  value: number | null
  disabled: boolean
  onChange: (next: number) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const current = value ?? 0
  const shown = draft ?? String(current)

  function commit(raw: string) {
    const next = Number(raw)
    setDraft(null)
    if (!Number.isFinite(next) || next === current) return
    onChange(next)
  }

  return (
    <div className="admin-stock-stepper">
      <button type="button" disabled={disabled || current <= 0} aria-label="Quitar una unidad" onClick={() => onChange(current - 1)}>
        −
      </button>
      <input
        type="number"
        min="0"
        inputMode="numeric"
        disabled={disabled}
        value={shown}
        onFocus={() => setDraft(String(current))}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => commit(shown)}
        aria-label="Unidades"
      />
      <button type="button" disabled={disabled} aria-label="Agregar una unidad" onClick={() => onChange(current + 1)}>
        +
      </button>
    </div>
  )
}

function AlertBadge({ alert }: { alert: InventoryAlert }) {
  const labels: Record<InventoryAlert, string> = {
    ok: "En nivel",
    low: "Stock bajo",
    out: "Agotado",
    none: "Sin control",
  }
  const tone = alert === "ok" ? "is-ok" : alert === "low" ? "is-low" : alert === "out" ? "is-critical" : ""
  return <b className={`admin-stock-badge ${tone}`}>{labels[alert]}</b>
}

function KpiCard({
  tone,
  icon,
  label,
  value,
  hint,
  active,
  onClick,
}: {
  tone: string
  icon: string
  label: string
  value: number
  hint: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button type="button" className={`admin-inventory-kpi is-${tone} ${active ? "is-active" : ""}`} onClick={onClick}>
      <span className="admin-home-stat__icon">
        <Glyph name={icon} />
      </span>
      <em>{label}</em>
      <strong>{value}</strong>
      <span>{hint}</span>
    </button>
  )
}

function Glyph({ name }: { name: string }) {
  const icons: Record<string, ReactNode> = {
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
    shirt: <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.5a2 2 0 0 0 1.98 1.67H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10.86h1.16a2 2 0 0 0 1.98-1.67l.58-3.5a2 2 0 0 0-1.34-2.23z" />,
    prev: <path d="m15 18-6-6 6-6" />,
    next: <path d="m9 18 6-6-6-6" />,
    down: <path d="m6 9 6 6 6-6" />,
    up: <path d="m18 15-6-6-6 6" />,
    box: (
      <>
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </>
    ),
    ok: <path d="M20 6 9 17l-5-5" />,
    alert: (
      <>
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      </>
    ),
    out: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m9 9 6 6" />
        <path d="m15 9-6 6" />
      </>
    ),
    dash: <path d="M5 12h14" />,
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  )
}
