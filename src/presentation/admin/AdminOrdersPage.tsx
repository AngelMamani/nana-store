import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react"
import { formatPen } from "../../domain/catalog/money.ts"
import { productCost } from "../../domain/catalog/profit.ts"
import {
  applyLineCosts,
  channelLabel,
  discountLabel,
  isCustomOrderLine,
  lineDiscount,
  lineGross,
  lineNet,
  lineProfit,
  orderDiscountOf,
  orderProfitOf,
  orderSubtotal,
  orderAdvance,
  orderBalance,
  orderChannel,
  orderContactLine,
  orderPhone,
  orderStatusLabel,
  payMethodLabel,
  payMethodOf,
  paymentLabel,
  orderSoldAt,
  paymentMode,
  type OrderChannel,
  type OrderStatus,
  type StoreOrder,
} from "../../domain/ordering/entities.ts"
import {
  formatPeriodLabel,
  isInPeriod,
  msUntilNextLocalDay,
  periodHint,
  periodRange,
  shiftPeriod,
  startOfLocalDay,
  type OrderPeriodMode,
} from "../../domain/ordering/period.ts"
import { receiptFromOrder } from "../../domain/ordering/receipt.ts"
import { container } from "../../infrastructure/composition/container.ts"
import { useCatalog } from "../catalog/catalog-context.ts"
import { printReceipt } from "../../infrastructure/ordering/thermal-printer.ts"
import { confirmAdminAction, promptAdminNumber, showAdminError } from "./admin-alerts.ts"
import { AdminCategoryFilter } from "./AdminCategoryFilter.tsx"
import { AdminPrinterBar } from "./AdminPrinterBar.tsx"
import { AdminStoreSaleForm } from "./AdminStoreSaleForm.tsx"

const VIEW_KEY = "nana-admin-orders-view"
const PAGE_SIZE = 10
const STATUSES: OrderStatus[] = ["nuevo", "reservado", "atendido", "cancelado"]

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
  return orderStatusLabel(status, "admin")
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })
}

function itemCount(order: StoreOrder) {
  return order.lines.reduce((sum, line) => sum + line.quantity, 0)
}

function orderWithCosts(order: StoreOrder, products: { id: string; cost: number | null }[]) {
  const costs = new Map(products.map((product) => [product.id, productCost(product)]))
  return { ...order, lines: applyLineCosts(order.lines, (id) => costs.get(id) ?? null) }
}

function profitLabel(order: StoreOrder, products: { id: string; cost: number | null }[]) {
  const profit = orderProfitOf(orderWithCosts(order, products))
  if (profit.missing > 0 && profit.cost === 0) return "—"
  if (profit.missing > 0) return `${formatPen(profit.amount)}*`
  return formatPen(profit.amount)
}

function matchesQuery(order: StoreOrder, needle: string) {
  if (!needle) return true
  const haystack = [
    order.id,
    order.customerName ?? "",
    order.customerEmail ?? "",
    order.customerPhone ?? "",
    orderPhone(order) ?? "",
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
  useCatalog()
  const store = container.getStore()
  const products = container.listProducts()
  const categories = container.listCategories()
  const [orders, setOrders] = useState<StoreOrder[]>([])
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [categoryId, setCategoryId] = useState("all")
  const [filter, setFilter] = useState<OrderFilter>("nuevo")
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all")
  const [view, setView] = useState<OrderView>(readView)
  const [page, setPage] = useState(1)
  const [openId, setOpenId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [saleOpen, setSaleOpen] = useState(false)
  const [saleOrder, setSaleOrder] = useState<StoreOrder | null>(null)
  const [periodMode, setPeriodMode] = useState<OrderPeriodMode>("day")
  const [anchorMs, setAnchorMs] = useState(() => startOfLocalDay(new Date()).getTime())
  const [liveToday, setLiveToday] = useState(true)

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

  useEffect(() => {
    if (!liveToday) return
    const today = startOfLocalDay(new Date()).getTime()
    if (today !== startOfLocalDay(new Date(anchorMs)).getTime()) {
      setAnchorMs(today)
    }
    const timer = window.setTimeout(() => {
      setAnchorMs(startOfLocalDay(new Date()).getTime())
    }, msUntilNextLocalDay())
    return () => window.clearTimeout(timer)
  }, [liveToday, anchorMs])

  const anchor = useMemo(() => new Date(anchorMs), [anchorMs])
  const range = useMemo(() => periodRange(periodMode, anchor), [periodMode, anchor])
  const periodLabel = useMemo(() => formatPeriodLabel(periodMode, anchor), [periodMode, anchor])
  const whenHint = periodHint(periodMode)

  const stats = useMemo(() => {
    let nuevo = 0
    let reservado = 0
    let atendido = 0
    let cancelado = 0
    let sales = 0
    let profit = 0
    for (const order of orders) {
      if (order.status === "reservado") reservado += 1
      const soldAt = orderSoldAt(order)
      const inPeriod =
        order.status === "atendido" ? isInPeriod(soldAt ?? undefined, range.start, range.end) : isInPeriod(order.createdAt, range.start, range.end)
      if (order.status === "nuevo" && inPeriod) nuevo += 1
      if (order.status === "atendido" && inPeriod) {
        atendido += 1
        sales += order.total
        profit += orderProfitOf(orderWithCosts(order, products)).amount
      }
      if (order.status === "cancelado" && inPeriod) cancelado += 1
    }
    return { nuevo, reservado, atendido, cancelado, sales, profit, total: orders.length }
  }, [orders, range, products])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return orders.filter((order) => {
      if (filter !== "all" && order.status !== filter) return false
      if (channelFilter !== "all" && orderChannel(order) !== channelFilter) return false
      if (categoryId !== "all") {
        const inCategory = order.lines.some((line) => {
          const product = products.find((item) => item.id === line.productId)
          return product?.categoryId === categoryId
        })
        if (!inCategory) return false
      }
      if (!matchesQuery(order, needle)) return false
      if (filter === "reservado") return true
      if (filter === "all" && order.status === "reservado") return true
      const stamp = order.status === "atendido" ? (orderSoldAt(order) ?? order.createdAt) : order.createdAt
      return isInPeriod(stamp, range.start, range.end)
    })
  }, [orders, products, query, categoryId, filter, channelFilter, range])

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

  function applyPeriod(mode: OrderPeriodMode) {
    setPeriodMode(mode)
    setPage(1)
  }

  function goToday() {
    setLiveToday(true)
    setAnchorMs(startOfLocalDay(new Date()).getTime())
    setPage(1)
  }

  function movePeriod(direction: -1 | 1) {
    setLiveToday(false)
    setAnchorMs(startOfLocalDay(shiftPeriod(periodMode, anchor, direction)).getTime())
    setPage(1)
  }

  async function setStatus(order: StoreOrder, status: OrderStatus) {
    if (order.status === status) return
    let advance: number | undefined
    if (status === "reservado") {
      const typed = await promptAdminNumber({
        title: "Reservar contra entrega",
        text: `Total ${formatPen(order.total)}. ¿Cuánto adelantó el cliente? El stock de las prendas del catálogo se aparta.`,
        value: String(orderAdvance(order) || ""),
        confirmText: "Reservar",
        placeholder: "Adelanto",
      })
      if (typed === null) return
      advance = typed
    } else {
      const ok = await confirmAdminAction({
        title: `${statusLabel(status)} pedido`,
        text:
          status === "cancelado"
            ? `¿Cancelar el pedido de ${order.customerName ?? "invitado"} por ${formatPen(order.total)}? Si estaba reservado, el stock vuelve.`
            : status === "atendido"
              ? `¿Marcar como pagado/entregado el pedido de ${order.customerName ?? "invitado"}? El saldo queda en cero.`
              : `¿Marcar el pedido de ${order.customerName ?? "invitado"} como ${statusLabel(status).toLowerCase()}?`,
        confirmText: status === "cancelado" ? "Cancelar pedido" : "Actualizar",
        danger: status === "cancelado",
        icon: status === "cancelado" ? "warning" : "question",
      })
      if (!ok) return
    }
    setBusyId(order.id)
    try {
      await container.updateOrderStatus(order, status, advance)
    } catch {
      await showAdminError("No se pudo actualizar", "Revisa la conexión e inténtalo de nuevo.")
    } finally {
      setBusyId(null)
    }
  }

  async function setAdvance(order: StoreOrder) {
    const typed = await promptAdminNumber({
      title: "Adelanto",
      text: `Total ${formatPen(order.total)}. El saldo se cobra al entregar.`,
      value: String(orderAdvance(order) || ""),
      confirmText: "Guardar adelanto",
      placeholder: "Monto adelantado",
    })
    if (typed === null) return
    setBusyId(order.id)
    try {
      await container.updateOrderAdvance(order, typed)
    } catch {
      await showAdminError("No se pudo guardar el adelanto", "Revisa la conexión e inténtalo de nuevo.")
    } finally {
      setBusyId(null)
    }
  }

  async function printOrder(order: StoreOrder) {
    try {
      await printReceipt(receiptFromOrder(store, order))
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo imprimir la boleta."
      if (message.toLowerCase().includes("cancel") || message.toLowerCase().includes("not found")) return
      await showAdminError("No se imprimió", message)
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
      await container.deleteOrder(order)
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
            {periodLabel}: {stats.atendido} ventas cobradas ({formatPen(stats.sales)}, ganancia {formatPen(stats.profit)}). {stats.reservado} reservados
            siguen pendientes aunque cambie el día.
          </p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            setSaleOrder(null)
            setSaleOpen(true)
          }}
        >
          Venta en tienda
        </button>
      </section>

      <AdminPrinterBar />

      {error && <p className="notice">{error}</p>}

      <section className="admin-orders-kpis" aria-label="Resumen de pedidos">
        <KpiCard
          tone="gold"
          icon="new"
          label="Nuevos"
          value={stats.nuevo}
          hint={whenHint}
          active={filter === "nuevo"}
          onClick={() => applyFilter("nuevo")}
        />
        <KpiCard
          tone="violet"
          icon="pin"
          label="Reservados"
          value={stats.reservado}
          hint="no caducan"
          active={filter === "reservado"}
          onClick={() => applyFilter("reservado")}
        />
        <KpiCard
          tone="mint"
          icon="ok"
          label="Atendidos"
          value={stats.atendido}
          hint={`cobrados ${whenHint}`}
          active={filter === "atendido"}
          onClick={() => applyFilter("atendido")}
        />
        <KpiCard
          tone="coral"
          icon="off"
          label="Cancelados"
          value={stats.cancelado}
          hint={whenHint}
          active={filter === "cancelado"}
          onClick={() => applyFilter("cancelado")}
        />
        <KpiCard
          tone="violet"
          icon="clipboard"
          label="Ventas"
          value={formatPen(stats.sales)}
          hint={`cobrado ${whenHint}`}
          active={filter === "all"}
          onClick={() => applyFilter("all")}
        />
        <KpiCard
          tone="mint"
          icon="gain"
          label="Ganancia"
          value={formatPen(stats.profit)}
          hint={`en ventas ${whenHint}`}
          active={filter === "atendido"}
          onClick={() => applyFilter("atendido")}
        />
      </section>

      <div className="admin-orders-period">
        <div className="admin-orders-channels" role="group" aria-label="Periodo">
          <button type="button" className={periodMode === "day" ? "is-active" : ""} onClick={() => applyPeriod("day")}>
            Día
          </button>
          <button type="button" className={periodMode === "week" ? "is-active" : ""} onClick={() => applyPeriod("week")}>
            Semana
          </button>
          <button type="button" className={periodMode === "month" ? "is-active" : ""} onClick={() => applyPeriod("month")}>
            Mes
          </button>
        </div>
        <div className="admin-orders-period__nav">
          <button type="button" aria-label="Periodo anterior" onClick={() => movePeriod(-1)}>
            <Glyph name="prev" />
          </button>
          <strong>{periodLabel}</strong>
          <button type="button" aria-label="Periodo siguiente" onClick={() => movePeriod(1)}>
            <Glyph name="next" />
          </button>
          <button type="button" className={liveToday ? "is-active" : ""} onClick={goToday}>
            Hoy
          </button>
        </div>
      </div>

      {filter === "reservado" ? (
        <p className="admin-orders-hold">
          Los reservados no se reinician cada día: quedan aquí hasta que los marques como atendidos o cancelados.
        </p>
      ) : null}

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
          <Glyph name="clipboard" />
          <strong>
            {orders.length === 0
              ? "Aún no hay pedidos"
              : filter === "reservado"
                ? "No hay reservas pendientes"
                : `No hay pedidos en ${periodLabel}`}
          </strong>
          <p>
            {orders.length === 0
              ? "Se registran cuando un cliente envía el carrito por WhatsApp o cobras en tienda."
              : filter === "reservado"
                ? "Cuando vendas contra entrega, el pedido se queda aquí aunque pase el día."
                : stats.reservado > 0
                  ? `Este periodo está vacío. Tienes ${stats.reservado} reservados pendientes: ábrelos en Reservados.`
                  : "Cambia de día, semana o mes, o pulsa otra tarjeta de resumen."}
          </p>
        </section>
      ) : view === "cards" ? (
        <section className="admin-orders-grid">
          {visible.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              priced={orderWithCosts(order, products)}
              profit={profitLabel(order, products)}
              storeWhatsapp={store.whatsapp}
              open={openId === order.id}
              busy={busyId === order.id}
              onToggle={() => setOpenId(openId === order.id ? null : order.id)}
              onStatus={(status) => void setStatus(order, status)}
              onAdvance={() => void setAdvance(order)}
              onEdit={() => {
                setSaleOrder(order)
                setSaleOpen(true)
              }}
              onPrint={() => void printOrder(order)}
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
                  <th>Ganancia</th>
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
                          <OrderClient order={order} />
                        </td>
                        <td>{formatDate(order.createdAt)}</td>
                        <td>{itemCount(order)}</td>
                        <td>{formatPen(order.total)}</td>
                        <td>{profitLabel(order, products)}</td>
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
                            {order.status !== "cancelado" ? (
                              <button
                                type="button"
                                title="Imprimir boleta"
                                disabled={busyId === order.id}
                                onClick={() => void printOrder(order)}
                              >
                                <Glyph name="print" />
                              </button>
                            ) : null}
                            {order.status === "reservado" ? (
                              <button
                                type="button"
                                className="admin-order-edit"
                                title="Editar"
                                onClick={() => {
                                  setSaleOrder(order)
                                  setSaleOpen(true)
                                }}
                              >
                                <Glyph name="edit" />
                                <span>Editar</span>
                              </button>
                            ) : (
                              <WhatsappButton phone={store.whatsapp} order={order} />
                            )}
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
                          <td colSpan={7}>
                            <OrderDetail
                              order={orderWithCosts(order, products)}
                              busy={busyId === order.id}
                              onAdvance={() => void setAdvance(order)}
                            />
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
      {saleOpen ? (
        <AdminStoreSaleForm
          order={saleOrder}
          onClose={() => {
            setSaleOpen(false)
            setSaleOrder(null)
          }}
        />
      ) : null}
    </div>
  )
}

function OrderCard({
  order,
  priced,
  profit,
  storeWhatsapp,
  open,
  busy,
  onToggle,
  onStatus,
  onAdvance,
  onEdit,
  onPrint,
  onRemove,
}: {
  order: StoreOrder
  priced: StoreOrder
  profit: string
  storeWhatsapp: string
  open: boolean
  busy: boolean
  onToggle: () => void
  onStatus: (status: OrderStatus) => void
  onAdvance: () => void
  onEdit: () => void
  onPrint: () => void
  onRemove: () => void
}) {
  return (
    <article className={`admin-order-card is-${order.status}`}>
      <div className="admin-order-card__head">
        <div>
          <p>{formatDate(order.createdAt)}</p>
          <OrderClient order={order} />
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div className="admin-order-card__meta">
        <strong>{formatPen(order.total)}</strong>
        <span>Ganancia {profit}</span>
        <span>{itemCount(order)} prendas</span>
      </div>
      <StatusControls status={order.status} busy={busy} onStatus={onStatus} />
      {open && <OrderDetail order={priced} busy={busy} onAdvance={onAdvance} />}
      <div className="admin-products-actions">
        <button type="button" title={open ? "Ocultar detalle" : "Ver detalle"} onClick={onToggle}>
          <Glyph name={open ? "up" : "down"} />
        </button>
        {order.status !== "cancelado" ? (
          <button type="button" title="Imprimir boleta" disabled={busy} onClick={onPrint}>
            <Glyph name="print" />
          </button>
        ) : null}
        {order.status === "reservado" ? (
          <button type="button" className="admin-order-edit" title="Editar" onClick={onEdit}>
            <Glyph name="edit" />
            <span>Editar</span>
          </button>
        ) : (
          <WhatsappButton phone={storeWhatsapp} order={order} />
        )}
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

function OrderDetail({
  order,
  busy,
  onAdvance,
}: {
  order: StoreOrder
  busy: boolean
  onAdvance: () => void
}) {
  const mode = paymentMode(order)
  const method = payMethodOf(order)
  const advance = orderAdvance(order)
  const balance = orderBalance(order)
  const profit = orderProfitOf(order)
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
                {isCustomOrderLine(line) ? <em>No registrada</em> : null}
                {options ? <em>{options}</em> : null}
              </div>
              <span>
                {lineDiscount(line) > 0 ? <s>{formatPen(lineGross(line))}</s> : null}
                {formatPen(lineNet(line))}
                {lineProfit(line) !== null ? <em>Ganancia {formatPen(lineProfit(line)!)}</em> : null}
                {lineDiscount(line) > 0 ? <em>Dcto {discountLabel(line.discountKind, line.discountValue)}</em> : null}
              </span>
            </li>
          )
        })}
      </ul>
      {profit.missing === 0 || profit.cost > 0 ? (
        <p className="admin-order-pay">
          <strong>Ganancia {formatPen(profit.amount)}</strong>
          {profit.missing > 0 ? <span>Falta costo en {profit.missing} ítems</span> : null}
        </p>
      ) : null}
      {orderDiscountOf(order) > 0 ? (
        <p className="admin-order-pay">
          <strong>Descuento {discountLabel(order.discountKind, order.discountValue)}</strong>
          <span>Subtotal {formatPen(orderSubtotal(order.lines))}</span>
          <span>−{formatPen(orderDiscountOf(order))}</span>
          <span>Total {formatPen(order.total)}</span>
        </p>
      ) : null}
      <p className="admin-order-pay">
        <strong>
          {paymentLabel(mode)}
          {method ? ` · ${payMethodLabel(method)}` : ""}
        </strong>
        <span>Adelanto {formatPen(advance)}</span>
        <span>Saldo {formatPen(balance)}</span>
        {order.status !== "cancelado" ? (
          <button type="button" className="btn btn--outline" disabled={busy} onClick={onAdvance}>
            Editar adelanto
          </button>
        ) : null}
      </p>
      {order.note?.trim() ? (
        <p className="admin-order-note">
          <strong>Nota:</strong> {order.note}
        </p>
      ) : null}
      {orderPhone(order) ? (
        <a className="admin-order-mail" href={`tel:${orderPhone(order)?.replace(/\s/g, "")}`}>
          Llamar {orderPhone(order)}
        </a>
      ) : order.customerEmail?.includes("@") ? (
        <a className="admin-order-mail" href={`mailto:${order.customerEmail}`}>
          Escribir al correo
        </a>
      ) : null}
    </div>
  )
}

function OrderClient({ order }: { order: StoreOrder }) {
  const channel = orderChannel(order)
  return (
    <div className="admin-order-client">
      <strong>{order.customerName ?? "Invitado"}</strong>
      <em>{orderContactLine(order)}</em>
      <b className={`admin-order-channel is-${channel}`}>{channelLabel(channel)}</b>
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
    pin: (
      <>
        <path d="M12 17v5" />
        <path d="M9 10.5a3 3 0 1 1 6 0c0 2.2-3 5.5-3 5.5s-3-3.3-3-5.5Z" />
      </>
    ),
    gain: (
      <>
        <path d="M12 3v18" />
        <path d="M16 8H9.5a2.5 2.5 0 0 0 0 5H14a2.5 2.5 0 0 1 0 5H8" />
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
    edit: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </>
    ),
    print: (
      <>
        <path d="M6 9V3h12v6" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" rx="1" />
      </>
    ),
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  )
}
