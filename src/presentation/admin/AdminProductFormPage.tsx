import { useMemo, useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import type { Product } from "../../domain/catalog/entities.ts"
import { extractColors, extractSizes, rebuildVariations, variantOptionKey } from "../../domain/catalog/variants.ts"
import { container } from "../../infrastructure/composition/container.ts"
import { useCatalog } from "../catalog/catalog-context.ts"
import { AdminBarcodeScan } from "./AdminBarcodeScan.tsx"
import { showAdminError, showAdminSuccess } from "./admin-alerts.ts"

type FormState = {
  name: string
  code: string
  description: string
  categoryId: string
  price: string
  promotionalPrice: string
  pin: boolean
  fillStock: string
}

function toForm(product: Product | null): FormState {
  if (!product) {
    const first = container.listCategories()[0]
    return {
      name: "",
      code: "",
      description: "",
      categoryId: first?.id ?? "",
      price: "",
      promotionalPrice: "",
      pin: false,
      fillStock: "",
    }
  }
  return {
    name: product.name,
    code: product.code ?? "",
    description: product.description ?? "",
    categoryId: product.categoryId ?? "",
    price: String(product.price),
    promotionalPrice: product.promotionalPrice === null ? "" : String(product.promotionalPrice),
    pin: product.pin,
    fillStock: "",
  }
}

function uniqueGallery(product: Product | null) {
  if (!product) return []
  return [...new Set([product.image, ...product.gallery].filter((image): image is string => Boolean(image)))]
}

const STEPS = [
  { title: "Fotos", hint: "Toca para agregar las fotos de la prenda." },
  { title: "Qué es", hint: "Dile a NaNa cómo se llama y de qué categoría es." },
  { title: "Precio", hint: "El precio de venta. La oferta es opcional." },
  { title: "Tallas", hint: "Elige colores, tallas y cuántas unidades hay." },
] as const

const SIZE_PRESETS = ["2", "4", "6", "8", "10", "12", "14", "S", "M", "L"]

function comboOptions(color: string | null, size: string | null) {
  return [
    ...(color ? [{ name: "Color", title: color }] : []),
    ...(size ? [{ name: "Tamaño", title: size }] : []),
  ]
}

export function AdminProductFormPage() {
  useCatalog()
  const { productId } = useParams()
  const navigate = useNavigate()
  const existing = productId && productId !== "nuevo" ? container.getProductById(productId) : null
  const categories = container.listCategories()
  const [form, setForm] = useState<FormState>(() => toForm(existing))
  const [sizes, setSizes] = useState(() => extractSizes(existing?.variations ?? []))
  const [colors, setColors] = useState(() => extractColors(existing?.variations ?? []))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(0)
  const [scanOpen, setScanOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [colorDraft, setColorDraft] = useState("")
  const [sizeDraft, setSizeDraft] = useState("")
  const [gallery, setGallery] = useState<string[]>(() => uniqueGallery(existing))
  const [stocks, setStocks] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const variant of existing?.variants ?? []) {
      initial[variantOptionKey(variant.options)] = variant.stock === null ? "" : String(variant.stock)
    }
    return initial
  })
  const id = existing?.id ?? crypto.randomUUID()
  const namedSizes = sizes.map((item) => item.trim()).filter(Boolean)
  const namedColors = colors.map((item) => item.trim()).filter(Boolean)

  const preview = useMemo(() => {
    const price = Number(form.price) || 0
    const promo = form.promotionalPrice === "" ? null : Number(form.promotionalPrice)
    return rebuildVariations(
      id,
      price,
      promo !== null && Number.isFinite(promo) ? promo : null,
      sizes.map((item) => item.trim()).filter(Boolean),
      colors.map((item) => item.trim()).filter(Boolean),
      existing?.variants ?? [],
      null,
    )
  }, [form.price, form.promotionalPrice, sizes, colors, existing, id])

  function patch(partial: Partial<FormState>) {
    setForm((current) => ({ ...current, ...partial }))
  }

  function stockValue(color: string | null, size: string | null) {
    const options = comboOptions(color, size)
    if (!options.length) return ""
    const key = variantOptionKey(options)
    if (key in stocks) return stocks[key]
    const matched = existing?.variants.find((variant) => variantOptionKey(variant.options) === key)
    return matched?.stock === null || matched?.stock === undefined ? "" : String(matched.stock)
  }

  function setStockValue(color: string | null, size: string | null, value: string) {
    const options = comboOptions(color, size)
    if (!options.length) return
    setStocks((current) => ({ ...current, [variantOptionKey(options)]: value }))
  }

  function removeColor(index: number) {
    setColors((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  function removeSize(index: number) {
    setSizes((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  function addNamed(kind: "color" | "size", raw: string) {
    const value = raw.trim()
    if (!value) return
    if (kind === "color") {
      setColors((current) => (current.some((item) => item.trim().toLowerCase() === value.toLowerCase()) ? current : [...current, value]))
      setColorDraft("")
      return
    }
    setSizes((current) => (current.some((item) => item.trim().toLowerCase() === value.toLowerCase()) ? current : [...current, value]))
    setSizeDraft("")
  }

  function toggleSize(value: string) {
    setSizes((current) =>
      current.some((item) => item.trim().toLowerCase() === value.toLowerCase())
        ? current.filter((item) => item.trim().toLowerCase() !== value.toLowerCase())
        : [...current, value],
    )
  }

  function goBack() {
    if (step > 0) {
      setStep((current) => current - 1)
      return
    }
    if (window.history.length > 1) navigate(-1)
    else navigate("/admin/productos")
  }

  async function goNext() {
    if (step === 1 && !form.name.trim()) {
      await showAdminError("Falta el nombre", "Escribe cómo se llama la prenda para continuar.")
      return
    }
    if (step === 2 && (form.price.trim() === "" || !Number.isFinite(Number(form.price)))) {
      await showAdminError("Falta el precio", "Escribe el precio de venta en soles.")
      return
    }
    setStep((current) => current + 1)
  }

  const totalUnits = preview.variants.reduce((sum, variant) => {
    const raw = stocks[variantOptionKey(variant.options)]
    const amount = raw === "" || raw === undefined ? Number(variant.stock ?? 0) : Number(raw)
    return sum + (Number.isFinite(amount) ? amount : 0)
  }, 0)

  async function onUpload(selected: File[]) {
    if (!selected.length) return
    setUploading(selected.length)
    try {
      const stamp = Date.now()
      const urls = await Promise.all(
        selected.map((file, index) =>
          container.storage.uploadImage(file, `products/${id}/${stamp}-${index}-${file.name}`),
        ),
      )
      setGallery((current) => [...current, ...urls])
    } catch {
      await showAdminError("No se pudieron subir las imágenes", "Revisa los archivos o los permisos de Storage.")
    } finally {
      setUploading(0)
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const price = Number(form.price)
    if (!form.name.trim() || !Number.isFinite(price)) {
      await showAdminError("Faltan datos", "El nombre y el precio son obligatorios.")
      return
    }
    if (!namedColors.length && !namedSizes.length) {
      await showAdminError("Faltan variantes", "Agrega al menos un color o una talla en la tabla.")
      return
    }
    const promotionalPrice = form.promotionalPrice === "" ? null : Number(form.promotionalPrice)
    const product: Product = {
      id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      code: form.code.trim() || null,
      categoryId: form.categoryId || null,
      image: gallery[0] ?? null,
      gallery,
      price,
      promotionalPrice: promotionalPrice !== null && Number.isFinite(promotionalPrice) ? promotionalPrice : null,
      pin: form.pin,
      rank: existing?.rank ?? container.listProducts().length,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      variations: preview.variations,
      variants: preview.variants.map((variant) => {
        const raw = stockValue(
          variant.options.find((item) => item.name === "Color")?.title ?? null,
          variant.options.find((item) => item.name === "Tamaño")?.title ?? null,
        )
        const amount = raw === "" ? null : Number(raw)
        return {
          ...variant,
          price: variant.price || price,
          promotionalPrice:
            variant.promotionalPrice ??
            (promotionalPrice !== null && Number.isFinite(promotionalPrice) ? promotionalPrice : null),
          stock: amount !== null && Number.isFinite(amount) ? amount : null,
        }
      }),
    }
    setSaving(true)
    try {
      await container.saveProduct(product)
      await showAdminSuccess(
        existing ? "Producto actualizado" : "Producto creado",
        existing ? "Los cambios ya están en el catálogo." : "La prenda nueva ya aparece en el catálogo.",
      )
      navigate("/admin/productos")
    } catch {
      await showAdminError(
        "No se pudo guardar",
        "Revisa permisos de la colección catalog_products e inténtalo de nuevo.",
      )
      setSaving(false)
    }
  }

  const current = STEPS[step]

  return (
    <div className="admin-screen admin-create">
      <header className="admin-create__bar">
        <button type="button" className="admin-create__back" onClick={goBack} aria-label={step === 0 ? "Regresar" : "Paso anterior"}>
          ←
        </button>
        <div>
          <p className="admin-kicker">
            Paso {step + 1} de {STEPS.length}
          </p>
          <h1>{existing ? "Editar producto" : "Nuevo producto"}</h1>
        </div>
        <Link className="admin-create__cancel" to="/admin">
          Inicio
        </Link>
      </header>

      <ol className="admin-create__dots" aria-label="Pasos">
        {STEPS.map((item, index) => (
          <li key={item.title} className={index === step ? "is-on" : index < step ? "is-done" : ""}>
            <button type="button" onClick={() => setStep(index)}>
              {index + 1}
            </button>
            <span>{item.title}</span>
          </li>
        ))}
      </ol>

      <form className="admin-create__card admin-form" onSubmit={onSubmit}>
        <div className="admin-create__intro">
          <h2>{current.title}</h2>
          <p>{current.hint}</p>
        </div>

        {step === 0 ? (
          <fieldset className="admin-gallery admin-create__photos">
            <legend className="admin-create__legend">Fotos</legend>
            <label className="admin-create__drop">
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={uploading > 0}
                onChange={(event) => {
                  const selected = Array.from(event.target.files ?? [])
                  event.target.value = ""
                  void onUpload(selected)
                }}
              />
              <strong>{uploading > 0 ? `Subiendo ${uploading} fotos…` : "Toca para sacar o elegir fotos"}</strong>
              <em>La primera foto es la que se ve en la tienda.</em>
            </label>
            {gallery.length > 0 && (
              <ul className="admin-gallery__list">
                {gallery.map((image, index) => (
                  <li key={image}>
                    <img src={image} alt="" />
                    {index === 0 && <em>Principal</em>}
                    <div>
                      {index > 0 && (
                        <button type="button" onClick={() => setGallery((current) => [image, ...current.filter((item) => item !== image)])}>
                          Principal
                        </button>
                      )}
                      <button
                        type="button"
                        className="is-danger"
                        onClick={() => setGallery((current) => current.filter((item) => item !== image))}
                      >
                        Quitar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </fieldset>
        ) : null}

        {step === 1 ? (
          <>
            <label>
              Nombre de la prenda
              <input
                value={form.name}
                onChange={(event) => patch({ name: event.target.value })}
                placeholder="Ej. Vestido floral rosa"
                required
              />
            </label>
            <label>
              Categoría
              <select value={form.categoryId} onChange={(event) => patch({ categoryId: event.target.value })}>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Código de barras (opcional)
              <div className="admin-form__code">
                <input
                  value={form.code}
                  onChange={(event) => patch({ code: event.target.value })}
                  placeholder="Escanear o escribir"
                  autoComplete="off"
                />
                <button type="button" className="btn btn--outline" onClick={() => setScanOpen(true)}>
                  Escanear
                </button>
              </div>
            </label>
            <label>
              Descripción (opcional)
              <textarea
                value={form.description}
                onChange={(event) => patch({ description: event.target.value })}
                rows={3}
                placeholder="Tela, temporada o detalle para la tienda"
              />
            </label>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <label>
              Precio de venta (S/)
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.price}
                onChange={(event) => patch({ price: event.target.value })}
                placeholder="0.00"
                required
              />
            </label>
            <label>
              Precio de oferta (opcional)
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.promotionalPrice}
                onChange={(event) => patch({ promotionalPrice: event.target.value })}
                placeholder="Si no hay oferta, déjalo vacío"
              />
            </label>
            <label className={`admin-pin${form.pin ? " is-on" : ""}`}>
              <span className="admin-pin__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 17v5" />
                  <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16h14v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
                </svg>
              </span>
              <span className="admin-pin__copy">
                <strong>Destacar en el inicio</strong>
                <em>Sale primero en la portada de la tienda.</em>
              </span>
              <input type="checkbox" checked={form.pin} onChange={(event) => patch({ pin: event.target.checked })} />
              <span className="admin-pin__switch" aria-hidden="true" />
            </label>
          </>
        ) : null}

        {step === 3 ? (
          <section className="admin-create__stock">
            <div>
              <h3>Tallas</h3>
              <div className="admin-create__chips">
                {SIZE_PRESETS.map((size) => {
                  const on = namedSizes.some((item) => item.toLowerCase() === size.toLowerCase())
                  return (
                    <button key={size} type="button" className={on ? "is-on" : ""} onClick={() => toggleSize(size)}>
                      {size}
                    </button>
                  )
                })}
              </div>
              <div className="admin-create__add">
                <input
                  value={sizeDraft}
                  onChange={(event) => setSizeDraft(event.target.value)}
                  placeholder="Otra talla"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      addNamed("size", sizeDraft)
                    }
                  }}
                />
                <button type="button" className="btn btn--outline" onClick={() => addNamed("size", sizeDraft)}>
                  Agregar
                </button>
              </div>
              {namedSizes.length > 0 ? (
                <ul className="admin-create__tags">
                  {namedSizes.map((size) => (
                    <li key={`size-${size}`}>
                      {size}
                      <button type="button" aria-label={`Quitar talla ${size}`} onClick={() => removeSize(sizes.findIndex((item) => item.trim() === size))}>
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div>
              <h3>Colores</h3>
              <div className="admin-create__add">
                <input
                  value={colorDraft}
                  onChange={(event) => setColorDraft(event.target.value)}
                  placeholder="Ej. Rosa, blanco, azul"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      addNamed("color", colorDraft)
                    }
                  }}
                />
                <button type="button" className="btn btn--outline" onClick={() => addNamed("color", colorDraft)}>
                  Agregar color
                </button>
              </div>
              {namedColors.length > 0 ? (
                <ul className="admin-create__tags">
                  {namedColors.map((color, index) => (
                    <li key={`color-${color}`}>
                      {color}
                      <button type="button" aria-label={`Quitar color ${color}`} onClick={() => removeColor(index)}>
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="admin-form__hint">Si no hay colores, pon al menos una talla.</p>
              )}
            </div>

            <div className="admin-create__qty">
              <h3>Cantidad de cada una</h3>
              <p className="admin-form__hint">
                {preview.variants.length} combinaciones · {totalUnits} unidades en total
              </p>
              <div className="admin-stock-matrix__fill">
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={form.fillStock}
                  onChange={(event) => patch({ fillStock: event.target.value })}
                  placeholder="Ej. 5"
                />
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => {
                    const next: Record<string, string> = { ...stocks }
                    for (const variant of preview.variants) {
                      next[variantOptionKey(variant.options)] = form.fillStock
                    }
                    setStocks(next)
                  }}
                >
                  Poner en todas
                </button>
              </div>
              {preview.variants.length === 0 ? (
                <p className="admin-form__hint">Elige una talla o un color para cargar el stock.</p>
              ) : (
                <ul className="admin-create__combos">
                  {preview.variants.map((variant) => {
                    const color = variant.options.find((item) => item.name === "Color")?.title ?? null
                    const size = variant.options.find((item) => item.name === "Tamaño")?.title ?? null
                    const label = [color, size].filter(Boolean).join(" · ")
                    return (
                      <li key={variantOptionKey(variant.options)}>
                        <span>{label || "Unidad"}</span>
                        <input
                          type="number"
                          min="0"
                          inputMode="numeric"
                          value={stockValue(color, size)}
                          onChange={(event) => setStockValue(color, size, event.target.value)}
                          aria-label={`Stock ${label}`}
                        />
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </section>
        ) : null}

        <div className="admin-create__foot">
          <button type="button" className="btn btn--outline" onClick={goBack}>
            {step === 0 ? "Regresar" : "Atrás"}
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn" onClick={() => void goNext()}>
              Siguiente
            </button>
          ) : (
            <button className="btn" type="submit" disabled={saving}>
              {saving ? "Guardando…" : existing ? "Guardar cambios" : "Crear producto"}
            </button>
          )}
        </div>
      </form>
      {scanOpen ? (
        <AdminBarcodeScan
          onClose={() => setScanOpen(false)}
          onDetect={(code) => {
            patch({ code })
            setScanOpen(false)
          }}
        />
      ) : null}
    </div>
  )
}
