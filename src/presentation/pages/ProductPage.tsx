import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import type { Product } from "../../domain/catalog/entities.ts"
import { formatPen } from "../../domain/catalog/money.ts"
import {
  findVariant,
  isOptionAvailable,
  isPurchasable,
  selectedCompareAt,
  selectedImage,
  selectedUnitPrice,
  summarizePrice,
} from "../../domain/catalog/pricing.ts"
import { buildProductInterestMessage } from "../../domain/ordering/whatsapp-order.ts"
import { container } from "../../infrastructure/composition/container.ts"
import { useAuth } from "../auth/auth-context.ts"
import { useCart } from "../cart/cart-context.ts"

function initialSelection(product: Product) {
  const selection: Record<string, string> = {}
  for (const variation of product.variations) {
    const only = variation.options[0]
    if (variation.options.length === 1 && only) selection[variation.name] = only.title
  }
  return selection
}

function ProductDetail({ product }: { product: Product }) {
  const navigate = useNavigate()
  const store = container.getStore()
  const cart = useCart()
  const auth = useAuth()
  const [selection, setSelection] = useState(() => initialSelection(product))
  const [quantity, setQuantity] = useState(1)
  const [photo, setPhoto] = useState<string | null>(product.image)
  const [notice, setNotice] = useState("")

  useEffect(() => {
    document.title = `${product.name} · ${store.name}`
  }, [product.name, store.name])

  const thumbs = useMemo(
    () => [
      ...new Set(
        [
          product.image,
          ...product.gallery,
          ...product.variations.flatMap((variation) => variation.options.map((option) => option.image)),
        ].filter((image): image is string => Boolean(image)),
      ),
    ],
    [product],
  )

  const categoryName = container.listCategories().find((category) => category.id === product.categoryId)?.name
  const variant = findVariant(product, selection)
  const summary = summarizePrice(product)
  const needsChoice = product.variations.some((variation) => !selection[variation.name])
  const ready = isPurchasable(product, selection)
  const price = needsChoice ? summary.amount : selectedUnitPrice(product, selection)
  const compareAt = needsChoice ? null : selectedCompareAt(product, selection)
  const stockLimit = variant?.stock ?? null
  const activePhoto = photo ?? selectedImage(product, selection)
  const interest = `https://wa.me/${store.whatsapp}?text=${encodeURIComponent(buildProductInterestMessage(product.name, auth.customer?.name))}`

  function choose(name: string, title: string) {
    const next = { ...selection, [name]: title }
    setSelection(next)
    setPhoto(selectedImage(product, next))
    setNotice("")
  }

  function addToCart() {
    if (!ready) {
      setNotice(needsChoice ? "Elige una opción para continuar." : "Esta opción no está disponible.")
      return
    }
    cart.addLine({
      productId: product.id,
      variantId: variant?.id ?? null,
      name: product.name,
      image: selectedImage(product, selection),
      options: Object.entries(selection).map(([name, title]) => ({ name, title })),
      unitPrice: selectedUnitPrice(product, selection),
      quantity,
    })
  }

  return (
    <article className="product">
      <button className="back" type="button" onClick={() => navigate(-1)}>
        Volver
      </button>
      <div className="product__layout">
        <div className="gallery">
          <div className="gallery__main">
            {activePhoto ? <img src={activePhoto} alt={product.name} /> : <span>NaNa</span>}
          </div>
          {thumbs.length > 1 && (
            <div className="gallery__thumbs">
              {thumbs.map((image) => (
                <button
                  key={image}
                  type="button"
                  className={image === activePhoto ? "is-active" : ""}
                  onClick={() => setPhoto(image)}
                >
                  <img src={image} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="product__info">
          {categoryName && <p className="eyebrow">{categoryName}</p>}
          <h1>{product.name}</h1>
          {product.code && <p className="code">Cod: {product.code}</p>}
          {product.variations.map((variation) => (
            <fieldset key={variation.id}>
              <legend>{variation.name}</legend>
              <div className="options">
                {variation.options.map((option) => {
                  const available = isOptionAvailable(product, selection, variation.name, option.title)
                  const selected = selection[variation.name] === option.title
                  return (
                    <button
                      key={option.title}
                      type="button"
                      className={`option ${selected ? "is-selected" : ""}`}
                      disabled={!available}
                      onClick={() => choose(variation.name, option.title)}
                    >
                      {option.image && <img src={option.image} alt="" />}
                      <span>{option.title}</span>
                    </button>
                  )
                })}
              </div>
            </fieldset>
          ))}
          <p className="product__price">
            {needsChoice && summary.from ? <span>A partir de </span> : null}
            {formatPen(price)}
            {compareAt !== null && <s>{formatPen(compareAt)}</s>}
          </p>
          <div className="buy">
            <div className="qty">
              <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Menos">
                −
              </button>
              <span>{quantity}</span>
              <button
                type="button"
                aria-label="Más"
                onClick={() =>
                  setQuantity((value) => (stockLimit === null ? value + 1 : Math.min(stockLimit, value + 1)))
                }
              >
                +
              </button>
            </div>
            <button className="btn" type="button" onClick={addToCart}>
              {needsChoice ? "Elige una opción" : ready ? "Añadir" : "No disponible"}
            </button>
          </div>
          {notice && <p className="notice">{notice}</p>}
          {product.description && (
            <section className="description">
              <h2>Descripción</h2>
              <p>{product.description}</p>
            </section>
          )}
          <a className="btn btn--whatsapp" href={interest} target="_blank" rel="noreferrer">
            Preguntas sobre el producto por WhatsApp
          </a>
        </div>
      </div>
    </article>
  )
}

export function ProductPage() {
  const { productId = "" } = useParams()
  const product = container.getProductById(productId)

  if (!product) {
    return (
      <div className="page empty-state">
        <h1>Producto no encontrado</h1>
        <p>Asegúrate de que la dirección sea correcta o vuelve al catálogo.</p>
        <Link to="/">Ir al inicio</Link>
      </div>
    )
  }

  return <ProductDetail key={product.id} product={product} />
}
