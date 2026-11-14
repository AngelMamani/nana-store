import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react"
import { formatPen } from "../../domain/catalog/money.ts"
import { channelLabel, orderChannel, type OrderChannel, type OrderStatus, type StoreOrder } from "../../domain/ordering/entities.ts"
import { container } from "../../infrastructure/composition/container.ts"
import { confirmAdminAction, showAdminError } from "./admin-alerts.ts"
import { AdminStoreSaleForm } from "./AdminStoreSaleForm.tsx"

const VIEW_KEY = "nana-admin-orders-view"
const PAGE_SIZE = 10
const STATUSES: OrderStatus[] = ["nuevo", "atendido", "cancelado"]

type OrderView = "list" | "cards"
type OrderFilter = "all" | OrderStatus
type ChannelFilter = "all" | OrderChannel

function readView(): OrderView {
  try {
    const saved = localStorage.getItem(VIEW_KEY)
    if (saved === "list" || saved === "cards") return saved
  } catch {
    /* ignore */
  }
  return window.matchMedia("(max-width: 767px)").matches ? "cards" : "list"
}

function statusLabel(status: OrderStatus) {
  if (status === "nuevo") return "Nuevo"
  if (status === "atendido") return "Atendido"
  return "Cancelado"
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })
}

function itemCount(order: StoreOrder) {
  return order.lines.reduce((sum, line) => sum + line.quantity, 0)
}

function matchesQuery(order: StoreOrder, needle: string) {
  if (!needle) return true
  const haystack = [
    order.id,
    order.customerName ?? "",
    order.customerEmail ?? "",
    order.note,
    order.status,
    orderChannel(order),
    ...order.lines.flatMap((line) => [line.name, ...line.options.map((option) => option.title)]),
  ]
    .join(" ")
    .toLowerCase()
  return haystack.includes(needle)
}

export function AdminOrdersPage() {
  const store = container.getStore()
  const [orders, setOrders] = useState<StoreOrder[]>([])
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<OrderFilter>("nuevo")
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all")
  const [view, setView] = useState<OrderView>(readView)
  const [page, setPage] = useState(1)
  const [openId, setOpenId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [saleOpen, setSaleOpen] = useState(false)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const next = await container.listOrders()
        if (active) {
          setOrders(next)
          setError("")
        }
      } catch {
        if (active) setError("No se pudieron cargar los pedidos.")
      }
    }

    void load()
    const stop = container.subscribeOrders(() => {
      void load()
    })
    return () => {
      active = false
      stop()
    }
  }, [])

  const stats = useMemo(() => {
    let nuevo = 0
    let atendido = 0
    let cancelado = 0
    let sales = 0
    let tienda = 0
    let whatsapp = 0
    for (const order of orders) {
      if (order.status === "nuevo") nuevo += 1
      if (order.status === "atendido") atendido += 1
      if (order.status === "cancelado") cancelado += 1
      if (order.status !== "cancelado") sales += order.total
      if (orderChannel(order) === "tienda") tienda += 1
      else whatsapp += 1
    }
    return { nuevo, atendido, cancelado, sales, total: orders.length, tienda, whatsapp }
  }, [orders])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return orders.filter((order) => {
      if (filter !== "all" && order.status !== filter) return false
      if (channelFilter !== "all" && orderChannel(order) !== channelFilter) return false
      return matchesQuery(order, needle)
    })
  }, [orders, query, filter, channelFilter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const from = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const to = Math.min(currentPage * PAGE_SIZE, filtered.length)

  function changeView(next: OrderView) {
    setView(next)
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      /* ignore */
    }
  }

  function applyFilter(next: OrderFilter) {
    setFilter(next)
    setPage(1)
  }

  async function setStatus(order: StoreOrder, status: OrderStatus) {
    if (order.status === status) return
    const ok = await confirmAdminAction({
      title: `${statusLabel(status)} pedido`,
      text:
        status === "cancelado"
          ? `¿Cancelar el pedido de ${order.customerName ?? "invitado"} por ${formatPen(order.total)}?`
          : `¿Marcar el pedido de ${order.customerName ?? "invitado"} como ${statusLabel(status).toLowerCase()}?`,
      confirmText: status === "cancelado" ? "Cancelar pedido" : "Actualizar",
      danger: status === "cancelado",
      icon: status === "cancelado" ? "warning" : "question",
    })
    if (!ok) return
    setBusyId(order.id)
    try {
      await container.updateOrderStatus(order, status)
    } catch {
      await showAdminError("No se pudo actualizar", "Revisa la conexión e inténtalo de nuevo.")
    } finally {
      setBusyId(null)
    }
  }

  async function removeOrder(order: StoreOrder) {
    const ok = await confirmAdminAction({
      title: "Eliminar pedido",
      text: `¿Borrar el pedido de ${order.customerName ?? "invitado"} por ${formatPen(order.total)}? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      danger: true,
      icon: "warning",
    })
    if (!ok) return
    setBusyId(order.id)
    try {
      await container.deleteOrder(order.id)
      if (openId === order.id) setOpenId(null)
    } catch {
      await showAdminError("No se pudo eliminar", "Revisa la conexión e inténtalo de nuevo.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="admin-screen admin-orders">
      <section className="admin-products-hero">
        <div>
          <p className="admin-kicker">Ventas</p>
          <h1>Pedidos</h1>
          <p>
            {stats.total} registrados · {stats.whatsapp} por WhatsApp · {stats.tienda} en tienda. Cambia el estado o
            registra una venta de mostrador.
          </p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setSaleOpen(true)}>
          Venta en tienda
        </button>
      </section>

      {error && <p className="notice">{error}</p>}

      <section className="admin-orders-kpis" aria-label="Resumen de pedidos">
        <KpiCard
          tone="gold"
          icon="new"
          label="Nuevos"
          value={stats.nuevo}
          hint="por atender"
          active={filter === "nuevo"}
          onClick={() => applyFilter("nuevo")}
        />
        <KpiCard
          tone="mint"
          icon="ok"
          label="Atendidos"
          value={stats.atendido}
          hint="ya gestionados"
          active={filter === "atendido"}
          onClick={() => applyFilter("atendido")}
        />
        <KpiCard
          tone="coral"
          icon="off"
          label="Cancelados"
          value={stats.cancelado}
          hint="no se despachan"
          active={filter === "cancelado"}
          onClick={() => applyFilter("cancelado")}
        />
        <KpiCard
          tone="violet"
          icon="clipboard"
          label="Vigentes"
          value={formatPen(stats.sales)}
          hint="total sin cancelados"
          active={filter === "all"}
          onClick={() => applyFilter("all")}
        />
      </section>

      <div className="admin-orders-channels" role="group" aria-label="Origen">
        <button type="button" className={channelFilter === "all" ? "is-active" : ""} onClick={() => { setChannelFilter("all"); setPage(1) }}>
          Todos
        </button>
        <button type="button" className={channelFilter === "whatsapp" ? "is-active" : ""} onClick={() => { setChannelFilter("whatsapp"); setPage(1) }}>
          WhatsApp
        </button>
        <button type="button" className={channelFilter === "tienda" ? "is-active" : ""} onClick={() => { setChannelFilter("tienda"); setPage(1) }}>
          Tienda física
        </button>
      </div>

      <div className="admin-products-toolbar">
        <label className="admin-products-search">
          <Glyph name="search" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
            placeholder="Buscar cliente, prenda o nota"
          />
        </label>
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
          <Glyph name="clipboard" />
          <strong>{orders.length === 0 ? "Aún no hay pedidos" : "No hay pedidos con ese filtro"}</strong>
          <p>
            {orders.length === 0
              ? "Se registran cuando un cliente envía el carrito por WhatsApp."
              : "Prueba otra búsqueda o pulsa otra tarjeta de resumen."}
          </p>
        </section>
      ) : view === "cards" ? (
        <section className="admin-orders-grid">
          {visible.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              storeWhatsapp={store.whatsapp}
              open={openId === order.id}
              busy={busyId === order.id}
              onToggle={() => setOpenId(openId === order.id ? null : order.id)}
              onStatus={(status) => void setStatus(order, status)}
              onRemove={() => void removeOrder(order)}
            />
          ))}
        </section>
      ) : (
        <section className="admin-products-table admin-card">
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Prendas</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((order) => {
                  const open = openId === order.id
                  return (
                    <Fragment key={order.id}>
                      <tr className={`is-${order.status}`}>
                        <td>
                          <div className="admin-order-client">
                            <strong>{order.customerName ?? "Invitado"}</strong>
                            <em>{order.customerEmail ?? "Sin correo"}</em>
                            <b className={`admin-order-channel is-${orderChannel(order)}`}>{channelLabel(orderChannel(order))}</b>
                          </div>
                        </td>
                        <td>{formatDate(order.createdAt)}</td>
                        <td>{itemCount(order)}</td>
                        <td>{formatPen(order.total)}</td>
                        <td>
                          <StatusControls
                            status={order.status}
                            busy={busyId === order.id}
                            onStatus={(status) => void setStatus(order, status)}
                          />
                        </td>
                        <td>
                          <div className="admin-products-actions">
                            <button
                              type="button"
                              title={open ? "Ocultar detalle" : "Ver detalle"}
                              aria-expanded={open}
                              onClick={() => setOpenId(open ? null : order.id)}
                            >
                              <Glyph name={open ? "up" : "down"} />
                            </button>
                            <WhatsappButton phone={store.whatsapp} order={order} />
                            <button
                              type="button"
                              className="is-danger"
                              title="Eliminar"
                              disabled={busyId === order.id}
                              onClick={() => void removeOrder(order)}
                            >
                              <Glyph name="trash" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {open && (
                        <tr className="admin-inventory-detail-row">
                          <td colSpan={6}>
                            <OrderDetail order={order} />
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
        <nav className="admin-products-pager" aria-label="Paginación de pedidos">
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
      {saleOpen ? <AdminStoreSaleForm onClose={() => setSaleOpen(false)} /> : null}
    </div>
  )
}

function OrderCard({
  order,
  storeWhatsapp,
  open,
  busy,
  onToggle,
  onStatus,
  onRemove,
}: {
  order: StoreOrder
  storeWhatsapp: string
  open: boolean
  busy: boolean
  onToggle: () => void
  onStatus: (status: OrderStatus) => void
  onRemove: () => void
}) {
  return (
    <article className={`admin-order-card is-${order.status}`}>
      <div className="admin-order-card__head">
        <div>
          <p>{formatDate(order.createdAt)}</p>
          <h2>{order.customerName ?? "Invitado"}</h2>
          <em>{order.customerEmail ?? "Sin correo"}</em>
          <b className={`admin-order-channel is-${orderChannel(order)}`}>{channelLabel(orderChannel(order))}</b>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div className="admin-order-card__meta">
        <strong>{formatPen(order.total)}</strong>
        <span>{itemCount(order)} prendas</span>
      </div>
      <StatusControls status={order.status} busy={busy} onStatus={onStatus} />
      {open && <OrderDetail order={order} />}
      <div className="admin-products-actions">
        <button type="button" title={open ? "Ocultar detalle" : "Ver detalle"} onClick={onToggle}>
          <Glyph name={open ? "up" : "down"} />
        </button>
        <WhatsappButton phone={storeWhatsapp} order={order} />
        <button type="button" className="is-danger" title="Eliminar" disabled={busy} onClick={onRemove}>
          <Glyph name="trash" />
        </button>
      </div>
    </article>
  )
}

function StatusControls({
  status,
  busy,
  onStatus,
}: {
  status: OrderStatus
  busy: boolean
  onStatus: (next: OrderStatus) => void
}) {
  return (
    <div className="admin-order-status" role="group" aria-label="Estado del pedido">
      {STATUSES.map((item) => (
        <button
          key={item}
          type="button"
          className={`is-${item} ${status === item ? "is-active" : ""}`}
          disabled={busy || status === item}
          onClick={() => onStatus(item)}
        >
          {statusLabel(item)}
        </button>
      ))}
    </div>
  )
}

function OrderDetail({ order }: { order: StoreOrder }) {
  return (
    <div className="admin-order-detail">
      <ul className="admin-order-lines">
        {order.lines.map((line, index) => {
          const options = line.options.map((option) => option.title).filter(Boolean).join(" · ")
          return (
            <li key={`${line.productId}-${index}`}>
              <div>
                <strong>
                  {line.quantity}× {line.name}
                </strong>
                {options ? <em>{options}</em> : null}
              </div>
              <span>{formatPen(line.unitPrice * line.quantity)}</span>
            </li>
          )
        })}
      </ul>
      {order.note.trim() ? (
        <p className="admin-order-note">
          <strong>Nota:</strong> {order.note}
        </p>
      ) : null}
      {order.customerEmail ? (
        <a className="admin-order-mail" href={`mailto:${order.customerEmail}`}>
          Escribir al correo
        </a>
      ) : null}
    </div>
  )
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return <b className={`admin-order-badge is-${status}`}>{statusLabel(status)}</b>
}

function WhatsappButton({ phone, order }: { phone: string; order: StoreOrder }) {
  if (!phone) return null
  const lines = order.lines.map((line) => `${line.quantity}× ${line.name}`).join("\n")
  const text = `Hola${order.customerName ? `, ${order.customerName}` : ""}, sobre tu pedido de ${formatPen(order.total)}:\n${lines}`
  const href = `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`
  return (
    <a className="admin-order-wa" href={href} target="_blank" rel="noreferrer" title="Escribir por WhatsApp">
      <Glyph name="wa" />
    </a>
  )
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
  value: number | string
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
    prev: <path d="m15 18-6-6 6-6" />,
    next: <path d="m9 18 6-6-6-6" />,
    down: <path d="m6 9 6 6 6-6" />,
    up: <path d="m18 15-6-6-6 6" />,
    clipboard: (
      <>
        <rect x="8" y="2" width="8" height="4" rx="1" />
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      </>
    ),
    new: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v8" />
        <path d="M8 12h8" />
      </>
    ),
    ok: <path d="M20 6 9 17l-5-5" />,
    off: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m9 9 6 6" />
        <path d="m15 9-6 6" />
      </>
    ),
    wa: (
      <>
        <path d="M20 11.5A8.5 8.5 0 0 1 7.6 18.8L4 20l1.3-3.5A8.5 8.5 0 1 1 20 11.5Z" />
        <path d="M9.5 9.5c.4 1.8 1.8 3.3 3.6 3.7" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6l-1 14H6L5 6" />
      </>
    ),
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  )
}
