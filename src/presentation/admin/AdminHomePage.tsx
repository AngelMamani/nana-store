import { useEffect, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { formatPen } from "../../domain/catalog/money.ts"
import { summarizePrice } from "../../domain/catalog/pricing.ts"
import { isLowStock, productStock } from "../../domain/catalog/stock.ts"
import type { StoreOrder } from "../../domain/ordering/entities.ts"
import { container } from "../../infrastructure/composition/container.ts"
import { useAuth } from "../auth/auth-context.ts"
import { useCatalog } from "../catalog/catalog-context.ts"

const TILES = [
  { to: "/admin/productos", label: "Productos", icon: "shirt" },
  { to: "/admin/inventario", label: "Inventario", icon: "box" },
  { to: "/admin/ofertas", label: "Ofertas", icon: "tag" },
  { to: "/admin/categorias", label: "Categorías", icon: "grid" },
  { to: "/admin/usuarios", label: "Usuarios", icon: "users" },
  { to: "/admin/videos", label: "Videos", icon: "video" },
  { to: "/admin/tienda", label: "Tienda", icon: "store" },
  { to: "/admin/productos/nuevo", label: "Nuevo", icon: "plus" },
] as const

function greetingName(fullName?: string) {
  const first = fullName?.trim().split(/\s+/)[0]
  return first ? first.toUpperCase() : ""
}

function isSameDay(value: string, now: Date) {
  const date = new Date(value)
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

function orderPulse(orders: StoreOrder[], now: Date) {
  const today = orders.filter((order) => isSameDay(order.createdAt, now))
  const open = orders.filter((order) => order.status === "nuevo" || order.status === "reservado")
  const nuevos = orders.filter((order) => order.status === "nuevo")
  return {
    today: today.length,
    open: open.length,
    nuevos: nuevos.length,
  }
}

export function AdminHomePage() {
  useCatalog()
  const { customer } = useAuth()
  const store = container.getStore()
  const products = container.listProducts()
  const categories = container.listCategories()
  const offers = products.filter((product) => summarizePrice(product).offer)
  const low = products.filter((product) => isLowStock(product))
  const [orders, setOrders] = useState<StoreOrder[]>([])
  const now = new Date()
  const pulse = orderPulse(orders, now)
  const hello = greetingName(customer?.name)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const next = await container.listOrders()
        if (active) setOrders(next)
      } catch {
        if (active) setOrders([])
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

  return (
    <div className="admin-screen admin-home">
      <header className="admin-home-hello">
        <h1>
          HOLA{hello ? `, ${hello}` : ""}
        </h1>
        <p>Bienvenido al panel principal</p>
      </header>

      <section className="admin-home-dash" aria-label="Menú principal">
        <Link to="/admin/pedidos" className="admin-home-feature">
          <p className="admin-home-feature__title">
            <HomeGlyph name="clipboard" />
            Pedidos
          </p>
          <ul>
            <li>
              <span>Ahora</span>
              <strong>
                {pulse.nuevos === 0 ? "Sin pedidos nuevos" : `${pulse.nuevos} ${pulse.nuevos === 1 ? "nuevo" : "nuevos"}`}
              </strong>
            </li>
            <li>
              <span>Hoy</span>
              <strong>
                {pulse.today === 0 ? "Aún no hay ventas" : `${pulse.today} ${pulse.today === 1 ? "pedido" : "pedidos"}`}
              </strong>
            </li>
            <li>
              <span>Pendientes</span>
              <strong>
                {pulse.open === 0 ? "Todo al día" : `${pulse.open} por atender`}
              </strong>
            </li>
          </ul>
        </Link>

        {TILES.map((item) => (
          <Link key={item.to} to={item.to} className="admin-home-tile">
            <span className="admin-home-tile__icon">
              <HomeGlyph name={item.icon} />
            </span>
            <strong>{item.label}</strong>
          </Link>
        ))}
      </section>

      <p className="admin-home-store">{store.name} · {products.length} productos · {offers.length} ofertas · {low.length} stock bajo</p>

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
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    plus: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v8M8 12h8" />
      </>
    ),
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  )
}
