import { useMemo, useRef, useState, type FormEvent } from "react"
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
  const [gallery, setGallery] = useState<string[]>(() => uniqueGallery(existing))
  const cameraInput = useRef<HTMLInputElement>(null)
  const galleryInput = useRef<HTMLInputElement>(null)
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

  function remapStocks(kind: "Color" | "Tamaño", from: string, to: string) {
    const previous = from.trim()
    const nextName = to.trim()
    if (!previous || previous === nextName) return
    setStocks((current) => {
      const next = { ...current }
      for (const [key, value] of Object.entries(current)) {
        const token = `${kind}:${previous}`
        if (!key.split("|").includes(token)) continue
        delete next[key]
        next[key.replace(token, `${kind}:${nextName}`)] = value
      }
      return next
    })
  }

  function changeColor(index: number, value: string) {
    remapStocks("Color", colors[index], value)
    setColors((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)))
  }

  function changeSize(index: number, value: string) {
    remapStocks("Tamaño", sizes[index], value)
    setSizes((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)))
  }

  function removeColor(index: number) {
    setColors((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  function removeSize(index: number) {
    setSizes((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  const sizeColumns = namedSizes.length ? namedSizes : [null]
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

  return (
    <div className="admin-screen">
      <header className="admin-screen__head">
        <div>
          <p className="admin-kicker">Catálogo</p>
          <h1>{existing ? "Editar producto" : "Nuevo producto"}</h1>
          <p>Agrega colores y tallas directo en la tabla, con el stock de cada combinación.</p>
        </div>
        <Link className="btn btn--outline" to="/admin/productos">
          Volver
        </Link>
      </header>

      <form className="admin-card admin-form" onSubmit={onSubmit}>
        <label>
          Nombre
          <input value={form.name} onChange={(event) => patch({ name: event.target.value })} required />
        </label>
        <div className="admin-form__row">
          <label>
            Código
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
            Categoría
            <select value={form.categoryId} onChange={(event) => patch({ categoryId: event.target.value })}>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Descripción
          <textarea value={form.description} onChange={(event) => patch({ description: event.target.value })} rows={4} />
        </label>
        <div className="admin-form__row">
          <label>
            Precio (S/)
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(event) => patch({ price: event.target.value })}
              required
            />
          </label>
          <label>
            Precio de oferta
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.promotionalPrice}
              onChange={(event) => patch({ promotionalPrice: event.target.value })}
              placeholder="Opcional"
            />
          </label>
        </div>
        <fieldset className="admin-gallery">
          <legend>Fotos</legend>
          <p className="admin-form__hint">Puedes subir varias. La primera es la principal en la tienda.</p>
          <input
            ref={cameraInput}
            className="admin-gallery__file"
            type="file"
            accept="image/*"
            capture="environment"
            disabled={uploading > 0}
            onChange={(event) => {
              const selected = Array.from(event.target.files ?? [])
              event.target.value = ""
              void onUpload(selected)
            }}
          />
          <input
            ref={galleryInput}
            className="admin-gallery__file"
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
          <div className="admin-gallery__pick">
            <button type="button" className="btn btn--outline" disabled={uploading > 0} onClick={() => cameraInput.current?.click()}>
              Tomar foto
            </button>
            <button type="button" className="btn btn--outline" disabled={uploading > 0} onClick={() => galleryInput.current?.click()}>
              Elegir fotos
            </button>
          </div>
          {uploading > 0 && <p className="admin-form__hint">Subiendo {uploading} fotos…</p>}
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

        <section className="admin-stock-matrix">
          <header>
            <div>
              <h2>Colores, tallas y stock</h2>
              <p className="admin-form__hint">
                {preview.variants.length} combinaciones · {totalUnits} unidades en total. Escribe el nombre en la fila o columna y la cantidad en cada casilla.
              </p>
            </div>
            <div className="admin-stock-matrix__fill">
              <input
                type="number"
                min="0"
                value={form.fillStock}
                onChange={(event) => patch({ fillStock: event.target.value })}
                placeholder="Cantidad"
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
          </header>

          <div className="admin-stock-matrix__actions">
            <button type="button" className="btn btn--outline" onClick={() => setColors((current) => [...current, ""])}>
              + Color
            </button>
            <button type="button" className="btn btn--outline" onClick={() => setSizes((current) => [...current, ""])}>
              + Talla
            </button>
          </div>

          <div className="admin-table-wrapper">
            <table className="admin-table admin-stock-table">
              <thead>
                <tr>
                  <th>Color / talla</th>
                  {sizes.map((size, index) => (
                    <th key={`size-${index}`}>
                      <div className="admin-stock-head">
                        <input
                          value={size}
                          onChange={(event) => changeSize(index, event.target.value)}
                          placeholder="Talla"
                          aria-label={`Talla ${index + 1}`}
                        />
                        <button type="button" aria-label="Quitar talla" onClick={() => removeSize(index)}>
                          ×
                        </button>
                      </div>
                    </th>
                  ))}
                  {namedColors.length > 0 && namedSizes.length > 0 && <th>Total</th>}
                </tr>
              </thead>
              <tbody>
                {colors.length === 0 ? (
                  <tr>
                    <td colSpan={Math.max(2, sizes.length + 1)}>
                      <p className="admin-form__hint">Pulsa + Color y + Talla para armar la tabla.</p>
                    </td>
                  </tr>
                ) : (
                  colors.map((color, colorIndex) => {
                    const rowTotal = sizeColumns.reduce((sum, size) => {
                      const raw = stockValue(color.trim() || null, size)
                      const amount = raw === "" ? 0 : Number(raw)
                      return sum + (Number.isFinite(amount) ? amount : 0)
                    }, 0)
                    return (
                      <tr key={`color-${colorIndex}`}>
                        <th>
                          <div className="admin-stock-head">
                            <input
                              value={color}
                              onChange={(event) => changeColor(colorIndex, event.target.value)}
                              placeholder="Color"
                              aria-label={`Color ${colorIndex + 1}`}
                            />
                            <button type="button" aria-label="Quitar color" onClick={() => removeColor(colorIndex)}>
                              ×
                            </button>
                          </div>
                        </th>
                        {sizes.map((size, sizeIndex) => {
                          const colorName = color.trim() || null
                          const sizeName = size.trim() || null
                          const ready = Boolean(colorName && sizeName)
                          return (
                            <td key={`cell-${colorIndex}-${sizeIndex}`}>
                              <input
                                type="number"
                                min="0"
                                disabled={!ready}
                                value={ready ? stockValue(colorName, sizeName) : ""}
                                onChange={(event) => setStockValue(colorName, sizeName, event.target.value)}
                                aria-label={`Stock ${color} ${size}`}
                              />
                            </td>
                          )
                        })}
                        {namedColors.length > 0 && namedSizes.length > 0 && <td>{color.trim() ? rowTotal : "—"}</td>}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <label className={`admin-pin${form.pin ? " is-on" : ""}`}>
          <span className="admin-pin__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 17v5" />
              <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16h14v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
            </svg>
          </span>
          <span className="admin-pin__copy">
            <strong>Destacar en el inicio</strong>
            <em>Sale primero en su categoría y en el inicio de la tienda.</em>
          </span>
          <input
            type="checkbox"
            checked={form.pin}
            onChange={(event) => patch({ pin: event.target.checked })}
          />
          <span className="admin-pin__switch" aria-hidden="true" />
        </label>

        <button className="btn" type="submit" disabled={saving}>
          {saving ? "Guardando…" : "Guardar producto"}
        </button>
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
