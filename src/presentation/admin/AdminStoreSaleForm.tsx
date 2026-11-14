import { useMemo, useState } from "react"
import { formatPen } from "../../domain/catalog/money.ts"
import {
  defaultSelection,
  isPurchasable,
  selectedUnitPrice,
  selectionComplete,
} from "../../domain/catalog/pricing.ts"
import type { Product } from "../../domain/catalog/entities.ts"
import type { OrderLine, PayMethod, PaymentMode } from "../../domain/ordering/entities.ts"
import { container } from "../../infrastructure/composition/container.ts"
import { useCatalog } from "../catalog/catalog-context.ts"
import { showAdminError, showAdminSuccess } from "./admin-alerts.ts"

type DraftLine = OrderLine & { key: string }

function lineKey(productId: string, options: OrderLine["options"]) {
  return `${productId}::${options.map((option) => `${option.name}:${option.title}`).join("|")}`
}

export function AdminStoreSaleForm({ onClose }: { onClose: () => void }) {
  useCatalog()
  const products = container.listProducts()
  const [search, setSearch] = useState("")
  const [picking, setPicking] = useState<Product | null>(null)
  const [selection, setSelection] = useState<Record<string, string>>({})
  const [lines, setLines] = useState<DraftLine[]>([])
  const [customerName, setCustomerName] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [note, setNote] = useState("")
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("contado")
  const [payMethod, setPayMethod] = useState<PayMethod>("efectivo")
  const [advance, setAdvance] = useState("")
  const [customName, setCustomName] = useState("")
  const [customPrice, setCustomPrice] = useState("")
  const [customQty, setCustomQty] = useState("1")
  const [busy, setBusy] = useState(false)

  const matches = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (needle.length < 2) return []
    return products
      .filter((product) => {
        const haystack = `${product.name} ${product.code ?? ""}`.toLowerCase()
        return haystack.includes(needle)
      })
      .slice(0, 8)
  }, [products, search])

  const total = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)
  const advanceAmount = Math.min(Math.max(0, Number(advance) || 0), total)
  const balance = Math.max(0, total - advanceAmount)

  function addProduct(product: Product, chosen: Record<string, string>) {
    if (!isPurchasable(product, chosen)) return
    const options = Object.entries(chosen).map(([name, title]) => ({ name, title }))
    const key = lineKey(product.id, options)
    const unitPrice = selectedUnitPrice(product, chosen)
    setLines((current) => {
      const existing = current.find((line) => line.key === key)
      if (existing) {
        return current.map((line) => (line.key === key ? { ...line, quantity: line.quantity + 1 } : line))
      }
      return [
        ...current,
        {
          key,
          productId: product.id,
          name: product.name,
          quantity: 1,
          unitPrice,
          options,
        },
      ]
    })
    setSearch("")
    setPicking(null)
    setSelection({})
  }

  function startAdd(product: Product) {
    const initial = defaultSelection(product)
    if (isPurchasable(product, initial)) {
      addProduct(product, initial)
      return
    }
    setPicking(product)
    setSelection(initial)
  }

  function addCustom() {
    const name = customName.trim()
    const unitPrice = Number(customPrice)
    const quantity = Math.max(1, Math.round(Number(customQty) || 1))
    if (!name || !Number.isFinite(unitPrice) || unitPrice < 0) return
    const productId = `custom:${crypto.randomUUID()}`
    setLines((current) => [
      ...current,
      {
        key: productId,
        productId,
        name,
        quantity,
        unitPrice,
        options: [],
        custom: true,
      },
    ])
    setCustomName("")
    setCustomPrice("")
    setCustomQty("1")
  }

  async function save() {
    if (!lines.length || busy) return
    setBusy(true)
    try {
      await container.recordStoreSale({
        customerName,
        customerEmail,
        note,
        paymentMode,
        payMethod,
        advance: paymentMode === "contraEntrega" ? advanceAmount : total,
        lines: lines.map(({ key: _key, ...line }) => line),
      })
      await showAdminSuccess(
        paymentMode === "contraEntrega" ? "Pedido reservado" : "Venta registrada",
        paymentMode === "contraEntrega"
          ? `Quedó contra entrega (${payMethod === "yape" ? "Yape" : "efectivo"}): el stock de las prendas del catálogo se apartó.`
          : `Quedó como atendida. Pagó con ${payMethod === "yape" ? "Yape" : "efectivo"}.`,
      )
      onClose()
    } catch {
      await showAdminError("No se pudo guardar", "Revisa la conexión e inténtalo de nuevo.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-sale">
      <button className="admin-sale__backdrop" type="button" aria-label="Cerrar" onClick={onClose} />
      <section className="admin-sale__panel" role="dialog" aria-labelledby="admin-sale-title">
        <header>
          <div>
            <p className="admin-kicker">Tienda física</p>
            <h2 id="admin-sale-title">Registrar venta</h2>
          </div>
          <button type="button" className="admin-sale__close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <p className="admin-kicker">Cuándo cobra</p>
        <div className="admin-sale__pay" role="group" aria-label="Cuándo cobra">
          <button
            type="button"
            className={paymentMode === "contado" ? "is-active" : ""}
            onClick={() => setPaymentMode("contado")}
          >
            Contado
          </button>
          <button
            type="button"
            className={paymentMode === "contraEntrega" ? "is-active" : ""}
            onClick={() => setPaymentMode("contraEntrega")}
          >
            Contra entrega
          </button>
        </div>
        <p className="admin-kicker">Cómo paga</p>
        <div className="admin-sale__pay" role="group" aria-label="Método de pago">
          <button
            type="button"
            className={payMethod === "efectivo" ? "is-active" : ""}
            onClick={() => setPayMethod("efectivo")}
          >
            Efectivo
          </button>
          <button
            type="button"
            className={payMethod === "yape" ? "is-active" : ""}
            onClick={() => setPayMethod("yape")}
          >
            Yape
          </button>
        </div>

        <label className="admin-products-search">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar prenda del catálogo"
          />
        </label>

        {matches.length > 0 && (
          <ul className="admin-sale__results">
            {matches.map((product) => (
              <li key={product.id}>
                <button type="button" onClick={() => startAdd(product)}>
                  <strong>{product.name}</strong>
                  <span>{product.code ? `${product.code} · ` : ""}{formatPen(selectedUnitPrice(product, defaultSelection(product)))}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {picking ? (
          <div className="admin-sale__pick">
            <p>
              Elige opciones de <strong>{picking.name}</strong>
            </p>
            {picking.variations.map((variation) => (
              <fieldset key={variation.id}>
                <legend>{variation.name}</legend>
                <div className="options">
                  {variation.options.map((option) => (
                    <button
                      key={option.title}
                      type="button"
                      className={`option ${selection[variation.name] === option.title ? "is-selected" : ""}`}
                      onClick={() => setSelection((current) => ({ ...current, [variation.name]: option.title }))}
                    >
                      {option.title}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
            <button
              type="button"
              className="btn btn--primary"
              disabled={!isPurchasable(picking, selection) || !selectionComplete(picking, selection)}
              onClick={() => addProduct(picking, selection)}
            >
              Agregar prenda
            </button>
          </div>
        ) : null}

        <div className="admin-sale__custom">
          <p>Prenda suelta (no está en el catálogo)</p>
          <div>
            <input
              value={customName}
              onChange={(event) => setCustomName(event.target.value)}
              placeholder="Nombre"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={customPrice}
              onChange={(event) => setCustomPrice(event.target.value)}
              placeholder="Precio"
            />
            <input
              type="number"
              min="1"
              step="1"
              value={customQty}
              onChange={(event) => setCustomQty(event.target.value)}
              placeholder="Cant."
            />
            <button type="button" className="btn btn--outline" onClick={addCustom} disabled={!customName.trim()}>
              Agregar
            </button>
          </div>
        </div>

        {lines.length > 0 ? (
          <ul className="admin-sale__lines">
            {lines.map((line) => (
              <li key={line.key}>
                <div>
                  <strong>
                    {line.quantity}× {line.name}
                  </strong>
                  {line.custom ? <em>No registrada</em> : null}
                  {line.options.length > 0 ? (
                    <em>{line.options.map((option) => option.title).join(" · ")}</em>
                  ) : null}
                </div>
                <span>{formatPen(line.unitPrice * line.quantity)}</span>
                <div className="qty">
                  <button
                    type="button"
                    onClick={() =>
                      setLines((current) =>
                        current
                          .map((item) =>
                            item.key === line.key ? { ...item, quantity: item.quantity - 1 } : item,
                          )
                          .filter((item) => item.quantity > 0),
                      )
                    }
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setLines((current) =>
                        current.map((item) =>
                          item.key === line.key ? { ...item, quantity: item.quantity + 1 } : item,
                        ),
                      )
                    }
                  >
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="admin-sale__hint">
            Busca una prenda del catálogo o agrega una suelta. Contado descuenta stock; contra entrega lo reserva.
          </p>
        )}

        <div className="admin-sale__fields">
          <label>
            Cliente (opcional)
            <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Nombre" />
          </label>
          <label>
            Correo (opcional)
            <input
              type="email"
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.target.value)}
              placeholder="Para que lo vea en su cuenta"
            />
          </label>
          {paymentMode === "contraEntrega" ? (
            <label>
              Adelanto
              <input
                type="number"
                min="0"
                step="0.01"
                value={advance}
                onChange={(event) => setAdvance(event.target.value)}
                placeholder="0"
              />
            </label>
          ) : null}
          <label>
            Nota
            <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Yape, destino, talla, etc." />
          </label>
        </div>

        <footer>
          <div>
            <strong>Total {formatPen(total)}</strong>
            {paymentMode === "contraEntrega" ? (
              <em>
                Adelanto {formatPen(advanceAmount)} · Saldo {formatPen(balance)}
              </em>
            ) : null}
          </div>
          <button type="button" className="btn btn--primary" disabled={!lines.length || busy} onClick={() => void save()}>
            {busy
              ? "Guardando…"
              : paymentMode === "contraEntrega"
                ? "Reservar pedido"
                : "Registrar venta"}
          </button>
        </footer>
      </section>
    </div>
  )
}
