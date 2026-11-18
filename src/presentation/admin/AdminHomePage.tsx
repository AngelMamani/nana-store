import { useEffect, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { formatPen } from "../../domain/catalog/money.ts"
import { summarizePrice } from "../../domain/catalog/pricing.ts"
import { isLowStock, productStock } from "../../domain/catalog/stock.ts"
import { container } from "../../infrastructure/composition/container.ts"
import { useAuth } from "../auth/auth-context.ts"
import { useCatalog } from "../catalog/catalog-context.ts"

const SHORTCUTS = [
  { to: "/admin/productos", label: "Productos", hint: "Editar catálogo", icon: "shirt", tone: "pink" },
  { to: "/admin/inventario", label: "Inventario", hint: "Control de stock", icon: "box", tone: "violet" },
  { to: "/admin/ofertas", label: "Ofertas", hint: "Precios promo", icon: "tag", tone: "gold" },
  { to: "/admin/pedidos", label: "Pedidos", hint: "Seguimiento", icon: "clipboard", tone: "mint" },
  { to: "/admin/videos", label: "Videos", hint: "Portada y reels", icon: "video", tone: "rose" },
  { to: "/admin/tienda", label: "Tienda", hint: "Datos públicos", icon: "store", tone: "ink" },
] as const

function greetingForHour(hour: number) {
  if (hour < 12) return "Buenos días"
  if (hour < 19) return "Buenas tardes"
  return "Buenas noches"
}

export function AdminHomePage() {
  useCatalog()
  const { customer } = useAuth()
  const store = container.getStore()
  const products = container.listProducts()
  const categories = container.listCategories()
  const offers = products.filter((product) => summarizePrice(product).offer)
  const low = products.filter((product) => isLowStock(product))
  const [orderCount, setOrderCount] = useState(0)
  const now = new Date()
  const dateLabel = now.toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const next = await container.listOrders()
        if (active) setOrderCount(next.length)
      } catch {
        if (active) setOrderCount(0)
      }
    }

    void load()
    const stop = container.subscribeOrders(() => {
      void load()
    })
    return () => {
      stop()
    }
  }, [])

  const maxCategoryCount = Math.max(
    1,
    ...categories.map((category) => products.filter((product) => product.categoryId === category.id).length),
  )

  const firstName = customer?.name?.split(" ")[0] ?? "NaNa"
  const initials = (() => {
    const parts = (customer?.name ?? "NaNa").trim().split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return firstName.slice(0, 2).toUpperCase()
  })()

  return (
    <div className="admin-screen admin-home">
      <section className="admin-home-app" aria-label="Panel principal">
        <header className="admin-dash-top">
          <span className="admin-dash-avatar">{initials}</span>
          <Link to="/admin/tienda" className="admin-dash-menu" aria-label="Ajustes de tienda">
            <HomeGlyph name="menu" />
          </Link>
        </header>
        <div className="admin-dash-hello">
          <h1>Hola, {firstName}</h1>
          <p>Bienvenido al panel principal</p>
        </div>
        <div className="admin-dash-grid">
          <Link className="admin-dash-tile is-feature" to="/admin/pedidos">
            <span className="admin-dash-tile__icon">
              <HomeGlyph name="clipboard" />
            </span>
            <strong>Pedidos</strong>
            <ul>
              <li>
                <em>Ahora</em>
                <span>
                  {orderCount} {orderCount === 1 ? "pedido" : "pedidos"}
                </span>
              </li>
              <li>
                <em>Hoy</em>
                <span>
                  {low.length} con stock bajo
                </span>
              </li>
            </ul>
          </Link>
          <Link className="admin-dash-tile" to="/admin/productos">
            <span className="admin-dash-tile__icon">
              <HomeGlyph name="shirt" />
            </span>
            <strong>Productos</strong>
          </Link>
          <Link className="admin-dash-tile" to="/admin/inventario">
            <span className="admin-dash-tile__icon">
              <HomeGlyph name="box" />
            </span>
            <strong>Inventario</strong>
          </Link>
          <Link className="admin-dash-tile" to="/admin/ofertas">
            <span className="admin-dash-tile__icon">
              <HomeGlyph name="tag" />
            </span>
            <strong>Ofertas</strong>
          </Link>
          <Link className="admin-dash-tile" to="/admin/tienda">
            <span className="admin-dash-tile__icon">
              <HomeGlyph name="store" />
            </span>
            <strong>Tienda</strong>
          </Link>
          <Link className="admin-dash-tile" to="/admin/videos">
            <span className="admin-dash-tile__icon">
              <HomeGlyph name="video" />
            </span>
            <strong>Videos</strong>
          </Link>
          <Link className="admin-dash-tile" to="/admin/categorias">
            <span className="admin-dash-tile__icon">
              <HomeGlyph name="grid" />
            </span>
            <strong>Categorías</strong>
          </Link>
        </div>
      </section>

      <div className="admin-home-web">
      <section className="admin-home-hero">
        <div className="admin-home-hero__glow" aria-hidden="true" />
        <div className="admin-home-hero__copy">
          <p className="admin-home-hero__kicker">{dateLabel}</p>
          <h1>
            {greetingForHour(now.getHours())}
            {customer?.name ? `, ${customer.name.split(" ")[0]}` : ""}
          </h1>
          <p>
            {store.name} está listo para el día: revisa stock, ofertas y lo que se ve en la portada.
          </p>
          <div className="admin-home-hero__actions">
            <Link className="btn" to="/admin/productos/nuevo">
              Nuevo producto
            </Link>
            <Link className="admin-home-ghost" to="/admin/pedidos">
              Ver pedidos
            </Link>
          </div>
        </div>
        <div className="admin-home-hero__brand">
          <img src={store.logo} alt="" />
          <div className="admin-home-hero__brand-copy">
            <strong>{store.name}</strong>
            <span>Panel de administración</span>
          </div>
        </div>
      </section>

      <section className="admin-home-stats" aria-label="Resumen">
        <StatCard tone="pink" icon="shirt" label="Productos" value={products.length} hint="en el catálogo" />
        <StatCard tone="violet" icon="grid" label="Categorías" value={categories.length} hint="de ropa infantil" />
        <StatCard tone="gold" icon="tag" label="En oferta" value={offers.length} hint="con precio promo" />
        <StatCard tone="coral" icon="alert" label="Stock bajo" value={low.length} hint="3 unidades o menos" />
        <StatCard tone="mint" icon="clipboard" label="Pedidos" value={orderCount} hint="registrados" />
      </section>

      <section className="admin-home-shortcuts" aria-label="Accesos rápidos">
        {SHORTCUTS.map((item) => (
          <Link key={item.to} to={item.to} className={`admin-home-shortcut is-${item.tone}`}>
            <span className="admin-home-shortcut__icon">
              <HomeGlyph name={item.icon} />
            </span>
            <span>
              <strong>{item.label}</strong>
              <em>{item.hint}</em>
            </span>
          </Link>
        ))}
      </section>

      <div className="admin-home-split">
        <section className="admin-home-panel">
          <header>
            <div>
              <p className="admin-kicker">Catálogo</p>
              <h2>Por categoría</h2>
            </div>
            <Link to="/admin/categorias">Gestionar</Link>
          </header>
          <ul className="admin-home-cats">
            {categories.map((category) => {
              const items = products.filter((product) => product.categoryId === category.id)
              const offerCount = items.filter((product) => summarizePrice(product).offer).length
              const width = Math.max(8, Math.round((items.length / maxCategoryCount) * 100))
              return (
                <li key={category.id}>
                  <div className="admin-home-cats__row">
                    <strong>{category.name}</strong>
                    <span>
                      {items.length} prendas
                      {offerCount > 0 ? ` · ${offerCount} ofertas` : ""}
                    </span>
                  </div>
                  <div className="admin-home-cats__track" aria-hidden="true">
                    <b style={{ width: `${width}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="admin-home-panel">
          <header>
            <div>
              <p className="admin-kicker">Operación</p>
              <h2>Revisar inventario</h2>
            </div>
            <Link to="/admin/inventario">Ver todo</Link>
          </header>
          {low.length === 0 ? (
            <p className="admin-home-empty">El stock está en buen nivel. No hay prendas urgentes.</p>
          ) : (
            <ul className="admin-home-stock">
              {low.slice(0, 6).map((product) => {
                const stock = productStock(product) ?? 0
                return (
                  <li key={product.id}>
                    <Link to={`/admin/productos/${product.id}`}>
                      {product.image ? <img src={product.image} alt="" /> : <span className="admin-home-stock__ph" />}
                      <div>
                        <strong>{product.name}</strong>
                        <em>{formatPen(summarizePrice(product).amount)}</em>
                      </div>
                      <b className={stock <= 1 ? "is-critical" : ""}>{stock} u.</b>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
      </div>
    </div>
  )
}

function StatCard({
  tone,
  icon,
  label,
  value,
  hint,
}: {
  tone: string
  icon: string
  label: string
  value: number
  hint: string
}) {
  return (
    <article className={`admin-home-stat is-${tone}`}>
      <span className="admin-home-stat__icon">
        <HomeGlyph name={icon} />
      </span>
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{hint}</em>
    </article>
  )
}

function HomeGlyph({ name }: { name: string }) {
  const icons: Record<string, ReactNode> = {
    shirt: <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.5a2 2 0 0 0 1.98 1.67H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10.86h1.16a2 2 0 0 0 1.98-1.67l.58-3.5a2 2 0 0 0-1.34-2.23z" />,
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.2" />
        <rect x="14" y="3" width="7" height="7" rx="1.2" />
        <rect x="3" y="14" width="7" height="7" rx="1.2" />
        <rect x="14" y="14" width="7" height="7" rx="1.2" />
      </>
    ),
    tag: (
      <>
        <path d="M12 2H2v10l9.29 9.29a1 1 0 0 0 1.41 0l8.59-8.59a1 1 0 0 0 0-1.41Z" />
        <circle cx="6.5" cy="6.5" r="1.5" />
      </>
    ),
    alert: (
      <>
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </>
    ),
    clipboard: (
      <>
        <rect x="8" y="2" width="8" height="4" rx="1" />
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      </>
    ),
    box: (
      <>
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </>
    ),
    video: (
      <>
        <rect x="2" y="6" width="14" height="12" rx="2" />
        <path d="m16 10 6-3v10l-6-3z" />
      </>
    ),
    store: (
      <>
        <path d="M3 9 5.2 4h13.6L21 9" />
        <path d="M3 9v11h18V9" />
        <path d="M9 20v-6h6v6" />
      </>
    ),
    menu: (
      <>
        <path d="M4 6h16" />
        <path d="M4 12h16" />
        <path d="M4 18h16" />
      </>
    ),
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  )
}
