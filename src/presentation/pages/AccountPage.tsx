import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { roleLabel } from "../../domain/auth/entities.ts"
import { formatPen } from "../../domain/catalog/money.ts"
import {
  channelLabel,
  orderAdvance,
  orderBalance,
  orderChannel,
  orderStatusLabel,
  paymentLabel,
  paymentMode,
  type OrderStatus,
  type StoreOrder,
} from "../../domain/ordering/entities.ts"
import { container } from "../../infrastructure/composition/container.ts"
import { useAuth } from "../auth/auth-context.ts"
import { useCart } from "../cart/cart-context.ts"
import { BagIcon, CartIcon, ShirtIcon, UserIcon, WhatsAppIcon } from "../components/Icons.tsx"

function accountInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters = `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`
  return letters.toUpperCase() || "N"
}

function statusLabel(status: OrderStatus) {
  return orderStatusLabel(status, "customer")
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })
}

export function AccountPage() {
  const auth = useAuth()
  const cart = useCart()
  const navigate = useNavigate()
  const store = container.getStore()
  const customer = auth.customer
  const [orders, setOrders] = useState<StoreOrder[]>([])
  const [ordersError, setOrdersError] = useState("")

  useEffect(() => {
    if (!customer) {
      setOrders([])
      return
    }
    let active = true
    void container
      .listCustomerOrders(customer.email)
      .then((next) => {
        if (!active) return
        setOrders(next)
        setOrdersError("")
      })
      .catch(() => {
        if (active) setOrdersError("No se pudieron cargar tus pedidos.")
      })
    const stop = container.subscribeCustomerOrders(customer.email, (next) => {
      setOrders(next)
      setOrdersError("")
    })
    return () => {
      active = false
      stop()
    }
  }, [customer])

  if (!customer) {
    return (
      <div className="page account-page">
        <section className="account-guest">
          <div className="account-guest__icon" aria-hidden="true">
            <UserIcon />
          </div>
          <p className="account-kicker">Mi cuenta</p>
          <h1>Entra para continuar</h1>
          <p>Con tu cuenta, los pedidos por WhatsApp quedan registrados y los puedes ver aquí.</p>
          <div className="account-guest__actions">
            <Link className="btn btn--primary" to="/entrar">
              Entrar
            </Link>
            <Link className="btn btn--outline" to="/registro">
              Crear cuenta
            </Link>
          </div>
        </section>
      </div>
    )
  }

  const firstName = customer.name.trim().split(/\s+/)[0] || customer.name
  const role = customer.role ?? "cliente"
  const isStaff = role === "administrador" || role === "desarrollador"
  const whatsappHref = `https://wa.me/${store.whatsapp}?text=${encodeURIComponent(
    `Hola ${store.name}, soy ${customer.name} y quiero hacer una consulta.`,
  )}`
  const openOrders = orders.filter((order) => order.status === "nuevo" || order.status === "reservado").length

  return (
    <div className="page account-page">
      <section className="account-hero">
        <div className="account-hero__avatar" aria-hidden="true">
          {accountInitials(customer.name)}
        </div>
        <div className="account-hero__copy">
          <p className="account-kicker">Mi cuenta</p>
          <h1>Hola, {firstName}</h1>
          <p>Tus datos, pedidos y accesos de la tienda.</p>
          <span className={`role-tag role-tag--${role}`}>{roleLabel(role)}</span>
        </div>
      </section>

      <section className="account-facts" aria-label="Datos de la cuenta">
        <article>
          <span>Nombre</span>
          <strong>{customer.name}</strong>
        </article>
        <article>
          <span>Correo</span>
          <strong>{customer.email}</strong>
        </article>
        <article>
          <span>Pedidos</span>
          <strong>
            {orders.length === 0
              ? "Ninguno aún"
              : `${orders.length} · ${openOrders} abiertos`}
          </strong>
        </article>
      </section>

      <section className="account-orders" aria-label="Tus pedidos">
        <header>
          <p className="account-kicker">Historial</p>
          <h2>Tus pedidos</h2>
        </header>
        {ordersError ? <p className="account-orders__empty">{ordersError}</p> : null}
        {!ordersError && orders.length === 0 ? (
          <p className="account-orders__empty">
            Cuando envíes el carrito por WhatsApp, el pedido aparecerá aquí con su estado.
          </p>
        ) : null}
        <ul className="account-orders__list">
          {orders.map((order) => (
            <li key={order.id} className={`account-order is-${order.status}`}>
              <div className="account-order__top">
                <span className={`account-order__badge is-${order.status}`}>{statusLabel(order.status)}</span>
                <span className="account-order__channel">{channelLabel(orderChannel(order))}</span>
                <time>{formatDate(order.createdAt)}</time>
              </div>
              <strong>{formatPen(order.total)}</strong>
              <ul>
                {order.lines.map((line) => (
                  <li key={`${order.id}-${line.productId}-${line.name}`}>
                    {line.quantity} × {line.name}
                    {line.options.length > 0
                      ? ` (${line.options.map((option) => option.title).join(", ")})`
                      : ""}
                  </li>
                ))}
              </ul>
              {paymentMode(order) === "contraEntrega" ? (
                <p className="account-order__note">
                  {paymentLabel("contraEntrega")} · Adelanto {formatPen(orderAdvance(order))} · Saldo{" "}
                  {formatPen(orderBalance(order))}
                </p>
              ) : null}
              {order.note ? <p className="account-order__note">Nota: {order.note}</p> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="account-shortcuts" aria-label="Accesos">
        <Link className="account-shortcut" to="/">
          <span className="account-shortcut__icon">
            <ShirtIcon />
          </span>
          <span>
            <strong>Ver catálogo</strong>
            <em>Seguir comprando</em>
          </span>
        </Link>
        <button className="account-shortcut" type="button" onClick={cart.openCart}>
          <span className="account-shortcut__icon">
            <CartIcon />
          </span>
          <span>
            <strong>Carrito</strong>
            <em>{cart.quantity > 0 ? `${cart.quantity} artículo${cart.quantity === 1 ? "" : "s"}` : "Vacío por ahora"}</em>
          </span>
        </button>
        <a className="account-shortcut" href={whatsappHref} target="_blank" rel="noreferrer">
          <span className="account-shortcut__icon is-whatsapp">
            <WhatsAppIcon />
          </span>
          <span>
            <strong>Escribir a {store.name}</strong>
            <em>Asesoría y tallas</em>
          </span>
        </a>
        {isStaff ? (
          <Link className="account-shortcut" to="/admin">
            <span className="account-shortcut__icon">
              <BagIcon />
            </span>
            <span>
              <strong>Panel de administración</strong>
              <em>Gestionar la tienda</em>
            </span>
          </Link>
        ) : null}
      </section>

      <button
        className="account-logout"
        type="button"
        onClick={() => {
          auth.logout()
          navigate("/")
        }}
      >
        Cerrar sesión
      </button>
    </div>
  )
}
