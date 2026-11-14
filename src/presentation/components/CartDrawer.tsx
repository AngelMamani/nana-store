import { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { buildOrderMessage } from "../../domain/ordering/whatsapp-order.ts"
import { formatPen } from "../../domain/catalog/money.ts"
import { container } from "../../infrastructure/composition/container.ts"
import { useAuth } from "../auth/auth-context.ts"
import { useCart } from "../cart/cart-context.ts"
import { useCatalog } from "../catalog/catalog-context.ts"
import { markResumeCheckout } from "../cart/resume-checkout.ts"

export function CartDrawer() {
  useCatalog()
  const cartState = useCart()
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const store = container.getStore()
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState("")
  const message = buildOrderMessage(store.name, cartState.cart, auth.customer?.name)
  const whatsappHref = `https://wa.me/${store.whatsapp}?text=${encodeURIComponent(message)}`

  function goToLoginForOrder() {
    markResumeCheckout()
    cartState.closeCart()
    const next = `${location.pathname}${location.search}`
    navigate(`/entrar?siguiente=${encodeURIComponent(next)}&pedido=1`)
  }

  async function sendOrder() {
    const customer = auth.customer
    if (!customer || sending) return
    setSending(true)
    setSendError("")
    const popup = window.open("about:blank", "_blank")
    try {
      await container.recordOrder(cartState.cart, {
        name: customer.name,
        email: customer.email,
      })
      if (popup) popup.location.href = whatsappHref
      else window.location.href = whatsappHref
    } catch (error) {
      console.error("No se pudo registrar el pedido:", error)
      popup?.close()
      setSendError("No se pudo guardar el pedido en el panel. Inténtalo de nuevo.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={`drawer ${cartState.isOpen ? "is-open" : ""}`}>
      <button className="drawer__backdrop" type="button" aria-label="Cerrar carrito" onClick={cartState.closeCart} />
      <aside className="drawer__panel" aria-label="Carrito">
        <header className="drawer__header">
          <h2>Carrito</h2>
          <button type="button" onClick={cartState.closeCart} aria-label="Cerrar">
            ×
          </button>
        </header>

        {cartState.cart.lines.length === 0 ? (
          <div className="drawer__empty">
            <strong>Carrito vacío</strong>
            <p>Explora el catálogo y agrega artículos a tu carrito.</p>
            <button type="button" className="btn btn--ghost" onClick={cartState.closeCart}>
              Seguir navegando
            </button>
          </div>
        ) : (
          <>
            <ul className="cart-lines">
              {cartState.cart.lines.map((line) => (
                <li key={line.lineId}>
                  {line.image ? <img src={line.image} alt="" /> : <span className="cart-lines__fallback" />}
                  <div>
                    <strong>{line.name}</strong>
                    {line.options.length > 0 && (
                      <p>{line.options.map((option) => `${option.name}: ${option.title}`).join(" · ")}</p>
                    )}
                    <p className="cart-lines__price">{formatPen(line.unitPrice)}</p>
                    <div className="qty">
                      <button type="button" onClick={() => cartState.setQuantity(line.lineId, line.quantity - 1)} aria-label="Quitar uno">
                        −
                      </button>
                      <span>{line.quantity}</span>
                      <button type="button" onClick={() => cartState.setQuantity(line.lineId, line.quantity + 1)} aria-label="Agregar uno">
                        +
                      </button>
                    </div>
                  </div>
                  <button type="button" className="cart-lines__remove" onClick={() => cartState.removeLine(line.lineId)}>
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
            <label className="note">
              Observación
              <textarea
                value={cartState.cart.note}
                placeholder="Escribe aquí la observación de tu pedido"
                onChange={(event) => cartState.setNote(event.target.value)}
              />
            </label>
            <footer className="drawer__footer">
              <div>
                <span>Total</span>
                <strong>{formatPen(cartState.total)}</strong>
              </div>
              {auth.customer ? (
                <>
                  {sendError ? <p className="drawer__login-hint">{sendError}</p> : null}
                  <button className="btn btn--whatsapp" type="button" onClick={() => void sendOrder()} disabled={sending}>
                    {sending ? "Registrando pedido…" : "Enviar por WhatsApp"}
                  </button>
                </>
              ) : (
                <>
                  <p className="drawer__login-hint">
                    Entra a tu cuenta para enviar el pedido. Así queda registrado en el panel con tu nombre y correo.
                  </p>
                  <button className="btn btn--whatsapp" type="button" onClick={goToLoginForOrder}>
                    Entrar para pedir
                  </button>
                </>
              )}
              <button type="button" className="btn btn--ghost" onClick={cartState.clear}>
                Vaciar carrito
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  )
}
