import { buildOrderMessage } from "../../domain/ordering/whatsapp-order.ts"
import { formatPen } from "../../domain/catalog/money.ts"
import { container } from "../../infrastructure/composition/container.ts"
import { useCart } from "../cart/cart-context.ts"

export function CartDrawer() {
  const cartState = useCart()
  const store = container.getStore()
  const message = buildOrderMessage(store.name, cartState.cart)
  const whatsappHref = `https://wa.me/${store.whatsapp}?text=${encodeURIComponent(message)}`

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
              <a className="btn btn--whatsapp" href={whatsappHref} target="_blank" rel="noreferrer">
                Enviar por WhatsApp
              </a>
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
