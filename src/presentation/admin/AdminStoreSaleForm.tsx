import { useEffect, useMemo, useRef, useState } from "react"
import { formatPen } from "../../domain/catalog/money.ts"
import { parseMoney, productCost, recommendedSalePrice } from "../../domain/catalog/profit.ts"
import {
  defaultSelection,
  isOptionAvailable,
  isPurchasable,
  selectedUnitPrice,
  selectionComplete,
} from "../../domain/catalog/pricing.ts"
import { searchProducts } from "../../domain/catalog/search.ts"
import { productStock } from "../../domain/catalog/stock.ts"
import type { Product } from "../../domain/catalog/entities.ts"
import {
  lineDiscount,
  lineGross,
  lineNet,
  lineProfit,
  orderDiscountOf,
  orderPayableTotal,
  orderProfitOf,
  orderPhone,
  orderSubtotal,
  payMethodOf,
  paymentMode as paymentModeOf,
  type DiscountKind,
  type OrderLine,
  type PayMethod,
  type PaymentMode,
  type StoreOrder,
} from "../../domain/ordering/entities.ts"
import { buildReceiptTicket } from "../../domain/ordering/receipt.ts"
import { container } from "../../infrastructure/composition/container.ts"
import { printReceipt } from "../../infrastructure/ordering/thermal-printer.ts"
import { useCatalog } from "../catalog/catalog-context.ts"
import { showAdminError, showAdminSuccess } from "./admin-alerts.ts"

type DraftLine = OrderLine & { key: string }

function lineKey(productId: string, options: OrderLine["options"]) {
  return `${productId}::${options.map((option) => `${option.name}:${option.title}`).join("|")}`
}

function draftLinesFromOrder(order: StoreOrder): DraftLine[] {
  return order.lines.map((line) => ({
    ...line,
    key: line.custom || line.productId.startsWith("custom:") ? line.productId : lineKey(line.productId, line.options),
  }))
}

function DiscountControls({
  kind,
  value,
  onKind,
  onValue,
}: {
  kind: DiscountKind | null
  value: string
  onKind: (kind: DiscountKind | null) => void
  onValue: (value: string) => void
}) {
  return (
    <div className="admin-sale__pay admin-sale__off">
      <button type="button" className={!kind ? "is-active" : ""} onClick={() => onKind(null)}>
        No
      </button>
      <button type="button" className={kind === "percent" ? "is-active" : ""} onClick={() => onKind("percent")}>
        %
      </button>
      <button type="button" className={kind === "amount" ? "is-active" : ""} onClick={() => onKind("amount")}>
        S/
      </button>
      {kind ? (
        <input
          type="number"
          min="0"
          max={kind === "percent" ? 100 : undefined}
          step={kind === "percent" ? "1" : "0.01"}
          value={value}
          onChange={(event) => onValue(event.target.value)}
          placeholder={kind === "percent" ? "10" : "5.00"}
        />
      ) : null}
    </div>
  )
}

export function AdminStoreSaleForm({
  onClose,
  order = null,
}: {
  onClose: () => void
  order?: StoreOrder | null
}) {
  useCatalog()
  const products = container.listProducts()
  const categories = container.listCategories()
  const editing = Boolean(order)
  const searchRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState("")
  const [categoryId, setCategoryId] = useState("all")
  const [picking, setPicking] = useState<Product | null>(null)
  const [selection, setSelection] = useState<Record<string, string>>({})
  const [lines, setLines] = useState<DraftLine[]>(() => (order ? draftLinesFromOrder(order) : []))
  const [customerName, setCustomerName] = useState(order?.customerName ?? "")
  const [customerPhone, setCustomerPhone] = useState(order ? (orderPhone(order) ?? "") : "")
  const [note, setNote] = useState(order?.note ?? "")
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(order ? paymentModeOf(order) : "contado")
  const [payMethod, setPayMethod] = useState<PayMethod>(order ? (payMethodOf(order) ?? "efectivo") : "efectivo")
  const [advance, setAdvance] = useState(order && order.advance != null ? String(order.advance) : "")
  const [customName, setCustomName] = useState("")
  const [customCost, setCustomCost] = useState("")
  const [customPrice, setCustomPrice] = useState("")
  const [discountKind, setDiscountKind] = useState<DiscountKind | null>(order?.discountKind ?? null)
  const [discountValue, setDiscountValue] = useState(order?.discountValue ? String(order.discountValue) : "")
  const [busy, setBusy] = useState(false)
  const [pane, setPane] = useState<"catalog" | "ticket">(order ? "ticket" : "catalog")

  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      searchRef.current?.focus()
    }
  }, [])

  const matches = useMemo(() => {
    const found = searchProducts(products, search)
    const inCategory = categoryId === "all" ? found : found.filter((product) => product.categoryId === categoryId)
    return inCategory.slice(0, 80)
  }, [products, search, categoryId])

  const saleDiscounts = {
    lines,
    discountKind,
    discountValue: Number(discountValue) || 0,
  }
  const subtotal = orderSubtotal(lines)
  const totalOff = orderDiscountOf(saleDiscounts)
  const total = orderPayableTotal(saleDiscounts)
  const saleProfit = orderProfitOf({ ...saleDiscounts, total })
  const advanceAmount = Math.min(Math.max(0, Number(advance) || 0), total)
  const balance = Math.max(0, total - advanceAmount)

  function addProduct(product: Product, chosen: Record<string, string>) {
    if (!isPurchasable(product, chosen)) return
    const options = Object.entries(chosen).map(([name, title]) => ({ name, title }))
    const key = lineKey(product.id, options)
    const unitPrice = selectedUnitPrice(product, chosen)
    const unitCost = productCost(product)
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
          unitCost,
          options,
        },
      ]
    })
    setPicking(null)
    setSelection({})
    if (!window.matchMedia("(min-width: 1024px)").matches) {
      setPane("catalog")
    }
  }

  function startAdd(product: Product) {
    const stock = productStock(product)
    if (stock === 0) return
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
    const unitCost = parseMoney(customCost)
    const quantity = 1
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
        unitCost,
        options: [],
        custom: true,
      },
    ])
    setCustomName("")
    setCustomCost("")
    setCustomPrice("")
  }

  async function save() {
    if (!lines.length || busy) return
    setBusy(true)
    const reserved = paymentMode === "contraEntrega"
    const method = payMethod === "yape" ? "Yape" : "efectivo"
    const payload = {
      customerName,
      customerPhone,
      note,
      paymentMode,
      payMethod,
      advance: reserved ? advanceAmount : total,
      discountKind,
      discountValue: Number(discountValue) || 0,
      lines: lines.map(({ key: _key, ...line }) => line),
    }
    try {
      if (order) await container.updateStoreSale(order, payload)
      else await container.recordStoreSale(payload)
      try {
        await printReceipt(
          buildReceiptTicket(container.getStore(), {
            createdAt: new Date().toISOString(),
            customerName,
            customerPhone,
            lines: payload.lines,
            total,
            advance: payload.advance,
            balance: reserved ? Math.max(0, total - payload.advance) : 0,
            paymentMode,
            payMethod,
            note,
            reserved,
            discountKind,
            discountValue: Number(discountValue) || 0,
          }),
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : "La venta se guardó, pero no se imprimió."
        if (!message.toLowerCase().includes("cancel") && !message.toLowerCase().includes("not found")) {
          await showAdminError("No se imprimió la boleta", message)
        }
      }
      onClose()
      await showAdminSuccess(
        editing ? (reserved ? "Reserva actualizada" : "Reserva cobrada") : reserved ? "Pedido reservado" : "Venta registrada",
        reserved
          ? `Quedó contra entrega (${method}): el stock de las prendas del catálogo se apartó.`
          : `Quedó como atendida. Pagó con ${method}.`,
      )
    } catch {
      setBusy(false)
      await showAdminError("No se pudo guardar", "Revisa la conexión e inténtalo de nuevo.")
    }
  }

  return (
    <div className="admin-sale">
      <button className="admin-sale__backdrop" type="button" aria-label="Cerrar" onClick={onClose} />
      <section className="admin-sale__panel" role="dialog" aria-labelledby="admin-sale-title">
        <header>
          <div>
            <p className="admin-kicker">Caja · tienda física</p>
            <h2 id="admin-sale-title">{editing ? "Editar reserva" : "Nueva venta"}</h2>
            <p className="admin-sale__lead">
              {editing ? "Cambia prendas, adelanto o cobra el saldo." : "Elige prendas, revisa el pedido y cobra."}
            </p>
          </div>
          <button type="button" className="admin-sale__close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className="admin-sale__tabs" role="tablist" aria-label="Venta en tienda">
          <button
            type="button"
            role="tab"
            aria-selected={pane === "catalog"}
            className={pane === "catalog" ? "is-active" : ""}
            onClick={() => setPane("catalog")}
          >
            Catálogo
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={pane === "ticket"}
            className={pane === "ticket" ? "is-active" : ""}
            onClick={() => setPane("ticket")}
          >
            Pedido
            {lines.length > 0 ? <b>{lines.reduce((sum, line) => sum + line.quantity, 0)}</b> : null}
          </button>
        </div>

        <div className={`admin-sale__body is-${pane}`}>
          <div className="admin-sale__catalog">
            <div className="admin-sale__section-head">
              <div>
                <p className="admin-kicker">Catálogo</p>
                <strong>{matches.length} prendas</strong>
              </div>
            </div>
            <label className="admin-products-search">
              <input
                ref={searchRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Código, nombre o talla"
                autoComplete="off"
              />
            </label>

            <div className="admin-sale__cats admin-orders-channels" role="group" aria-label="Categoría">
              <button
                type="button"
                className={categoryId === "all" ? "is-active" : ""}
                onClick={() => setCategoryId("all")}
              >
                Todas
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={categoryId === category.id ? "is-active" : ""}
                  onClick={() => setCategoryId(category.id)}
                >
                  {category.name}
                </button>
              ))}
            </div>

            {picking ? (
              <div className="admin-sale__pick">
                <p>
                  Elige talla o color
                  <strong>{picking.name}</strong>
                </p>
                {picking.variations.map((variation) => (
                  <fieldset key={variation.id}>
                    <legend>{variation.name}</legend>
                    <div className="options">
                      {variation.options.map((option) => {
                        const available = isOptionAvailable(picking, selection, variation.name, option.title)
                        return (
                          <button
                            key={option.title}
                            type="button"
                            disabled={!available}
                            className={`option ${selection[variation.name] === option.title ? "is-selected" : ""}`}
                            onClick={() =>
                              setSelection((current) => ({ ...current, [variation.name]: option.title }))
                            }
                          >
                            {option.title}
                          </button>
                        )
                      })}
                    </div>
                  </fieldset>
                ))}
                <div className="admin-sale__pick-actions">
                  <button type="button" className="btn btn--outline" onClick={() => setPicking(null)}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn--primary"
                    disabled={!isPurchasable(picking, selection) || !selectionComplete(picking, selection)}
                    onClick={() => addProduct(picking, selection)}
                  >
                    Agregar · {formatPen(selectedUnitPrice(picking, selection))}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="admin-sale__scroller">
              {matches.length === 0 ? (
                <p className="admin-sale__hint">No hay prendas con ese filtro. Cambia la búsqueda o la categoría.</p>
              ) : (
                <div className="admin-sale__grid">
                  {matches.map((product) => {
                    const stock = productStock(product)
                    const out = stock === 0
                    return (
                      <button
                        key={product.id}
                        type="button"
                        className={`admin-sale__card ${out ? "is-out" : ""} ${picking?.id === product.id ? "is-active" : ""}`}
                        disabled={out}
                        onClick={() => startAdd(product)}
                      >
                        {product.image ? <img src={product.image} alt="" /> : <span className="admin-sale__tile-ph" />}
                        <span className="admin-sale__card-body">
                          {product.code ? <em>{product.code}</em> : null}
                          <strong>{product.name}</strong>
                          <span className="admin-sale__card-meta">
                            <b>{formatPen(selectedUnitPrice(product, defaultSelection(product)))}</b>
                            <i>{out ? "Sin stock" : stock === null ? "Disponible" : `${stock} u.`}</i>
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <aside className="admin-sale__ticket">
            <div className="admin-sale__section-head">
              <div>
                <p className="admin-kicker">Pedido</p>
                <strong>{lines.length === 0 ? "Vacío" : `${lines.reduce((sum, line) => sum + line.quantity, 0)} ítems`}</strong>
              </div>
              {lines.length > 0 ? (
                <button type="button" className="admin-sale__clear" onClick={() => setLines([])}>
                  Vaciar
                </button>
              ) : null}
            </div>

            <div className="admin-sale__ticket-scroll">
            {lines.length > 0 ? (
              <ul className="admin-sale__lines">
                {lines.map((line) => (
                  <li key={line.key}>
                    <div>
                      <strong>{line.name}</strong>
                      {line.custom ? <em>No registrada</em> : null}
                      {line.options.length > 0 ? (
                        <em>{line.options.map((option) => option.title).join(" · ")}</em>
                      ) : null}
                    </div>
                    <span>
                      {lineDiscount(line) > 0 ? <s>{formatPen(lineGross(line))}</s> : null}
                      {formatPen(lineNet(line))}
                      {lineProfit(line) !== null ? <em>Ganancia {formatPen(lineProfit(line)!)}</em> : null}
                    </span>
                    <div className="admin-stock-stepper">
                      <button
                        type="button"
                        aria-label="Quitar una"
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
                      <b>{line.quantity}</b>
                      <button
                        type="button"
                        aria-label="Agregar una"
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
                    <DiscountControls
                      kind={line.discountKind ?? null}
                      value={line.discountValue ? String(line.discountValue) : ""}
                      onKind={(kind) =>
                        setLines((current) =>
                          current.map((item) =>
                            item.key === line.key
                              ? { ...item, discountKind: kind, discountValue: kind ? item.discountValue || 0 : 0 }
                              : item,
                          ),
                        )
                      }
                      onValue={(value) =>
                        setLines((current) =>
                          current.map((item) =>
                            item.key === line.key ? { ...item, discountValue: Number(value) || 0 } : item,
                          ),
                        )
                      }
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="admin-sale__hint">Selecciona una prenda del catálogo para armar el pedido.</p>
            )}

            <div className="admin-sale__block">
              <p className="admin-kicker">Cobro</p>
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
              {paymentMode === "contraEntrega" ? (
                <label className="admin-sale__advance">
                  Adelanto
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={advance}
                    onChange={(event) => setAdvance(event.target.value)}
                    placeholder="0.00"
                  />
                </label>
              ) : null}
            </div>

            <div className="admin-sale__block">
              <p className="admin-kicker">Cliente</p>
              <div className="admin-sale__fields">
                <label>
                  Cliente
                  <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Opcional" />
                </label>
                <label>
                  Número
                  <input
                    type="tel"
                    inputMode="tel"
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    placeholder="9XXXXXXXX"
                  />
                </label>
                <label>
                  Nota
                  <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Destino, referencia…" />
                </label>
              </div>
            </div>

            <details className="admin-sale__emergency">
              <summary>Emergencia: prenda no registrada</summary>
              <div className="admin-sale__custom">
                <input
                  value={customName}
                  onChange={(event) => setCustomName(event.target.value)}
                  placeholder="Nombre"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={customCost}
                  onChange={(event) => {
                    const next = event.target.value
                    const cost = parseMoney(next)
                    const suggested = cost !== null ? recommendedSalePrice(cost) : 0
                    const previous = parseMoney(customCost) !== null ? recommendedSalePrice(parseMoney(customCost) ?? 0) : 0
                    const current = parseMoney(customPrice)
                    setCustomCost(next)
                    if (suggested > 0 && (customPrice === "" || current === previous)) {
                      setCustomPrice(String(suggested))
                    }
                  }}
                  placeholder="Costo"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={customPrice}
                  onChange={(event) => setCustomPrice(event.target.value)}
                  placeholder="Venta S/"
                />
                <button type="button" className="btn btn--outline" onClick={addCustom} disabled={!customName.trim()}>
                  +
                </button>
              </div>
            </details>
            </div>

            <footer>
              {lines.length > 0 ? (
                <label className="admin-sale__advance admin-sale__total-off">
                  Descuento al total
                  <DiscountControls
                    kind={discountKind}
                    value={discountValue}
                    onKind={(kind) => {
                      setDiscountKind(kind)
                      if (!kind) setDiscountValue("")
                    }}
                    onValue={setDiscountValue}
                  />
                </label>
              ) : null}
              <div className="admin-sale__payrow">
                <div>
                  <em>{payMethod === "yape" ? "Yape" : "Efectivo"}{paymentMode === "contraEntrega" ? " · contra entrega" : ""}</em>
                  {totalOff > 0 || subtotal !== total ? <small>Subtotal {formatPen(subtotal)}</small> : null}
                  {totalOff > 0 ? <small>Descuento −{formatPen(totalOff)}</small> : null}
                  <strong>{formatPen(total)}</strong>
                  {lines.length > 0 ? (
                    <small>
                      {saleProfit.missing > 0
                        ? `Ganancia ${formatPen(saleProfit.amount)} · falta costo en ${saleProfit.missing}`
                        : `Ganancia ${formatPen(saleProfit.amount)}`}
                    </small>
                  ) : null}
                  {paymentMode === "contraEntrega" ? (
                    <small>
                      Adelanto {formatPen(advanceAmount)} · Saldo {formatPen(balance)}
                    </small>
                  ) : null}
                </div>
                <button type="button" className="btn btn--primary" disabled={!lines.length || busy} onClick={() => void save()}>
                  {busy
                    ? "Guardando…"
                    : paymentMode === "contraEntrega"
                      ? editing
                        ? "Guardar"
                        : "Reservar"
                      : "Cobrar"}
                </button>
              </div>
            </footer>
          </aside>
        </div>
      </section>
    </div>
  )
}
