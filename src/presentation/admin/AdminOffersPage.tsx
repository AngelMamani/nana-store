import { useMemo, useState, type ReactNode } from "react"
import { Link, useNavigate } from "react-router-dom"
import { formatPen } from "../../domain/catalog/money.ts"
import {
  applyFixedOffer,
  applyPercentOffer,
  clearProductOffer,
  discountPercent,
  summarizePrice,
} from "../../domain/catalog/pricing.ts"
import { searchProducts } from "../../domain/catalog/search.ts"
import type { Product } from "../../domain/catalog/entities.ts"
import { container } from "../../infrastructure/composition/container.ts"
import { useCatalog } from "../catalog/catalog-context.ts"
import { confirmAdminAction, promptAdminNumber, showAdminError } from "./admin-alerts.ts"
import { AdminCategoryFilter } from "./AdminCategoryFilter.tsx"

const VIEW_KEY = "nana-admin-offers-view"
const PAGE_SIZE = 10
const PERCENTS = [10, 15, 20, 30, 50]

type OfferView = "list" | "cards"
type OfferFilter = "on" | "off" | "all"

function readView(): OfferView {
  try {
    const saved = localStorage.getItem(VIEW_KEY)
    if (saved === "list" || saved === "cards") return saved
  } catch {
    /* ignore */
  }
  return window.matchMedia("(max-width: 767px)").matches ? "cards" : "list"
}

export function AdminOffersPage() {
  useCatalog()
  const navigate = useNavigate()
  const products = container.listProducts()
  const categories = container.listCategories()
  const [query, setQuery] = useState("")
  const [categoryId, setCategoryId] = useState("all")
  const [filter, setFilter] = useState<OfferFilter>("on")
  const [view, setView] = useState<OfferView>(readView)
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState<string | null>(null)

  const offers = useMemo(
    () => products.filter((product) => summarizePrice(product).offer),
    [products],
  )

  const stats = useMemo(() => {
    const percents = offers
      .map((product) => {
        const price = summarizePrice(product)
        return discountPercent(price.amount, price.compareAt)
      })
      .filter((value): value is number => value !== null)
    const average = percents.length
      ? Math.round(percents.reduce((sum, value) => sum + value, 0) / percents.length)
      : 0
    return {
      active: offers.length,
      average,
      idle: products.length - offers.length,
      catalog: products.length,
    }
  }, [offers, products.length])

  const filtered = useMemo(() => {
    return searchProducts(products, query)
      .filter((product) => {
        if (categoryId !== "all" && product.categoryId !== categoryId) return false
        const onOffer = summarizePrice(product).offer
        if (filter === "on") return onOffer
        if (filter === "off") return !onOffer
        return true
      })
      .sort((left, right) => {
        const leftOffer = summarizePrice(left).offer ? 0 : 1
        const rightOffer = summarizePrice(right).offer ? 0 : 1
        return leftOffer - rightOffer || left.name.localeCompare(right.name, "es")
      })
  }, [products, query, categoryId, filter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const from = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const to = Math.min(currentPage * PAGE_SIZE, filtered.length)

  function changeView(next: OfferView) {
    setView(next)
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      /* ignore */
    }
  }

  function applyFilter(next: OfferFilter) {
    setFilter(next)
    setPage(1)
  }

  async function saveOffer(product: Product, next: Product) {
    setBusyId(product.id)
    try {
      await container.saveProduct(next)
    } catch {
      await showAdminError("No se pudo guardar la oferta", "Revisa la conexión e inténtalo de nuevo.")
    } finally {
      setBusyId(null)
    }
  }

  async function setPercent(product: Product, percent: number) {
    const ok = await confirmAdminAction({
      title: `${percent}% de descuento`,
      text: `¿Aplicar ${percent}% a “${product.name}”? El precio nuevo se verá en la tienda al instante.`,
      confirmText: "Aplicar",
      icon: "question",
    })
    if (!ok) return
    await saveOffer(product, applyPercentOffer(product, percent))
  }

  async function setCustomPrice(product: Product) {
    const price = summarizePrice(product)
    const value = await promptAdminNumber({
      title: "Precio de oferta",
      text: `Precio actual de “${product.name}”: ${formatPen(price.compareAt ?? price.amount)}. Debe ser menor.`,
      value: price.offer ? String(price.amount) : "",
      confirmText: "Guardar",
      placeholder: "Ej. 39.90",
    })
    if (value === null) return
    const ceiling = price.compareAt ?? price.amount
    if (value <= 0 || value >= ceiling) {
      await showAdminError("Precio inválido", `Escribe un monto mayor a 0 y menor a ${formatPen(ceiling)}.`)
      return
    }
    await saveOffer(product, applyFixedOffer(product, value))
  }

  async function removeOffer(product: Product) {
    const ok = await confirmAdminAction({
      title: "Quitar oferta",
      text: `“${product.name}” volverá al precio regular en la tienda.`,
      confirmText: "Quitar",
      danger: true,
    })
    if (!ok) return
    await saveOffer(product, clearProductOffer(product))
  }

  return (
    <div className="admin-screen admin-offers">
      <section className="admin-products-hero">
        <div>
          <p className="admin-kicker">Ventas</p>
          <h1>Ofertas</h1>
          <p>
            {stats.active} promociones activas
            {stats.average > 0 ? ` · ${stats.average}% de descuento medio` : ""} · se actualizan en la tienda al guardar
          </p>
        </div>
        <Link className="btn btn--outline" to="/admin/productos">
          <Glyph name="shirt" />
          Ir a productos
        </Link>
      </section>

      <section className="admin-offers-kpis" aria-label="Resumen de ofertas">
        <KpiCard
          tone="gold"
          icon="tag"
          label="Activas"
          value={stats.active}
          hint="con precio promo"
          active={filter === "on"}
          onClick={() => applyFilter("on")}
        />
        <KpiCard
          tone="pink"
          icon="percent"
          label="Descuento medio"
          value={stats.average}
          hint={stats.average > 0 ? "% en ofertas actuales" : "aún no hay descuentos"}
          suffix="%"
          active={filter === "on"}
          onClick={() => applyFilter("on")}
        />
        <KpiCard
          tone="ink"
          icon="dash"
          label="Sin oferta"
          value={stats.idle}
          hint="listas para promocionar"
          active={filter === "off"}
          onClick={() => applyFilter("off")}
        />
        <KpiCard
          tone="violet"
          icon="grid"
          label="Catálogo"
          value={stats.catalog}
          hint="todas las prendas"
          active={filter === "all"}
          onClick={() => applyFilter("all")}
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
            placeholder="Buscar prenda para ofertar"
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
          <Glyph name="tag" />
          <strong>{filter === "on" ? "No hay ofertas activas" : "No hay prendas con ese filtro"}</strong>
          <p>
            {filter === "on"
              ? "Pulsa “Sin oferta” y aplica un porcentaje o un precio nuevo."
              : "Prueba otra búsqueda o categoría."}
          </p>
        </section>
      ) : view === "cards" ? (
        <section className="admin-offers-grid">
          {visible.map((product) => (
            <OfferCard
              key={product.id}
              product={product}
              categoryName={categories.find((item) => item.id === product.categoryId)?.name}
              busy={busyId === product.id}
              onPercent={(percent) => void setPercent(product, percent)}
              onCustom={() => void setCustomPrice(product)}
              onRemove={() => void removeOffer(product)}
              onEdit={() => navigate(`/admin/productos/${product.id}`)}
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
                  <th>Regular</th>
                  <th>Oferta</th>
                  <th>Descuento</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((product) => {
                  const price = summarizePrice(product)
                  const discount = discountPercent(price.amount, price.compareAt)
                  return (
                    <tr key={product.id} className={price.offer ? "is-offer" : ""}>
                      <td>
                        <div className="admin-product-cell">
                          {product.image ? <img src={product.image} alt="" /> : <span />}
                          <div>
                            <strong>{product.name}</strong>
                            <em>
                              {categories.find((item) => item.id === product.categoryId)?.name ?? "Sin categoría"}
                            </em>
                          </div>
                        </div>
                      </td>
                      <td>{price.offer ? <s>{formatPen(price.compareAt ?? price.amount)}</s> : formatPen(price.amount)}</td>
                      <td className="admin-offers-now">
                        {price.offer ? formatPen(price.amount) : "—"}
                      </td>
                      <td>{discount !== null ? <b className="admin-offer-badge">-{discount}%</b> : "—"}</td>
                      <td>
                        <OfferActions
                          product={product}
                          busy={busyId === product.id}
                          onPercent={(percent) => void setPercent(product, percent)}
                          onCustom={() => void setCustomPrice(product)}
                          onRemove={() => void removeOffer(product)}
                          onEdit={() => navigate(`/admin/productos/${product.id}`)}
                        />
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
        <nav className="admin-products-pager" aria-label="Paginación de ofertas">
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

function OfferCard({
  product,
  categoryName,
  busy,
  onPercent,
  onCustom,
  onRemove,
  onEdit,
}: {
  product: Product
  categoryName?: string
  busy: boolean
  onPercent: (percent: number) => void
  onCustom: () => void
  onRemove: () => void
  onEdit: () => void
}) {
  const price = summarizePrice(product)
  const discount = discountPercent(price.amount, price.compareAt)
  return (
    <article className={`admin-offer-card ${price.offer ? "is-on" : ""}`}>
      <div className="admin-offer-card__media">
        {product.image ? <img src={product.image} alt="" /> : <span className="admin-offer-card__ph"><Glyph name="shirt" /></span>}
        {discount !== null && <em>-{discount}%</em>}
      </div>
      <div className="admin-offer-card__body">
        <p>{categoryName ?? "Sin categoría"}</p>
        <h2>{product.name}</h2>
        <div className="admin-offer-price">
          {price.offer ? (
            <>
              <s>{formatPen(price.compareAt ?? price.amount)}</s>
              <strong>{formatPen(price.amount)}</strong>
            </>
          ) : (
            <strong>{formatPen(price.amount)}</strong>
          )}
        </div>
        <OfferActions
          product={product}
          busy={busy}
          onPercent={onPercent}
          onCustom={onCustom}
          onRemove={onRemove}
          onEdit={onEdit}
        />
      </div>
    </article>
  )
}

function OfferActions({
  product,
  busy,
  onPercent,
  onCustom,
  onRemove,
  onEdit,
}: {
  product: Product
  busy: boolean
  onPercent: (percent: number) => void
  onCustom: () => void
  onRemove: () => void
  onEdit: () => void
}) {
  const onOffer = summarizePrice(product).offer
  return (
    <div className="admin-offer-actions">
      <div className="admin-offer-percents" role="group" aria-label="Descuentos rápidos">
        {PERCENTS.map((percent) => (
          <button
            key={percent}
            type="button"
            disabled={busy}
            title={`Aplicar ${percent}%`}
            onClick={() => onPercent(percent)}
          >
            -{percent}%
          </button>
        ))}
      </div>
      <div className="admin-products-actions">
        <button type="button" disabled={busy} title="Precio personalizado" onClick={onCustom}>
          <Glyph name="price" />
        </button>
        {onOffer && (
          <button type="button" className="is-danger" disabled={busy} title="Quitar oferta" onClick={onRemove}>
            <Glyph name="off" />
          </button>
        )}
        <button type="button" title="Editar producto" onClick={onEdit}>
          <Glyph name="edit" />
        </button>
      </div>
    </div>
  )
}

function KpiCard({
  tone,
  icon,
  label,
  value,
  hint,
  suffix,
  active,
  onClick,
}: {
  tone: string
  icon: string
  label: string
  value: number
  hint: string
  suffix?: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button type="button" className={`admin-inventory-kpi is-${tone} ${active ? "is-active" : ""}`} onClick={onClick}>
      <span className="admin-home-stat__icon">
        <Glyph name={icon} />
      </span>
      <em>{label}</em>
      <strong>
        {value}
        {suffix ?? ""}
      </strong>
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
    tag: (
      <>
        <path d="M12 2H2v10l9.3 9.3a2 2 0 0 0 2.8 0L21 14.8a2 2 0 0 0 0-2.8Z" />
        <circle cx="7" cy="7" r="1.2" />
      </>
    ),
    percent: (
      <>
        <path d="m19 5-14 14" />
        <circle cx="6.5" cy="6.5" r="2.5" />
        <circle cx="17.5" cy="17.5" r="2.5" />
      </>
    ),
    dash: <path d="M5 12h14" />,
    price: (
      <>
        <path d="M12 1v22" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </>
    ),
    off: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m9 9 6 6" />
        <path d="m15 9-6 6" />
      </>
    ),
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  )
}
