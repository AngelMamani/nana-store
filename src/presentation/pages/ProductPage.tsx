import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import type { Product } from "../../domain/catalog/entities.ts"
import { formatPen } from "../../domain/catalog/money.ts"
import {
  defaultSelection,
  findVariant,
  isOptionAvailable,
  isPurchasable,
  selectedCompareAt,
  selectedImage,
  selectedUnitPrice,
  selectionComplete,
  summarizePrice,
} from "../../domain/catalog/pricing.ts"
import { suggestRelatedProducts } from "../../domain/catalog/search.ts"
import { buildProductInterestMessage } from "../../domain/ordering/whatsapp-order.ts"
import { container } from "../../infrastructure/composition/container.ts"
import { useAuth } from "../auth/auth-context.ts"
import { useCatalog } from "../catalog/catalog-context.ts"
import { useCart } from "../cart/cart-context.ts"
import { ProductCard } from "../components/ProductCard.tsx"

function ProductDetail({ product }: { product: Product }) {
  const navigate = useNavigate()
  const store = container.getStore()
  const cart = useCart()
  const auth = useAuth()
  const [selection, setSelection] = useState(() => defaultSelection(product))
  const [quantity, setQuantity] = useState(1)
  const [photo, setPhoto] = useState<string | null>(product.image)
  const [showVideo, setShowVideo] = useState(Boolean(product.video))
  const [notice, setNotice] = useState("")

  const related = useMemo(
    () => suggestRelatedProducts(container.listProducts(), product),
    [product],
  )

  useEffect(() => {
    document.title = `${product.name} · ${store.name}`
    window.scrollTo(0, 0)
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
  const needsChoice = !selectionComplete(product, selection)
  const ready = isPurchasable(product, selection)
  const price = needsChoice ? summary.amount : selectedUnitPrice(product, selection)
  const compareAt = needsChoice ? null : selectedCompareAt(product, selection)
  const stockLimit = variant?.stock ?? null
  const activePhoto = photo ?? selectedImage(product, selection)
  const showingVideo = Boolean(product.video) && showVideo
  const interest = `https://wa.me/${store.whatsapp}?text=${encodeURIComponent(buildProductInterestMessage(product.name, auth.customer?.name))}`

  function choose(name: string, title: string) {
    const next = { ...selection, [name]: title }
    setSelection(next)
    setPhoto(selectedImage(product, next))
    setShowVideo(false)
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
      unitCost: product.cost ?? null,
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
            {showingVideo ? (
              <video src={product.video ?? undefined} controls playsInline preload="metadata" poster={activePhoto ?? undefined} />
            ) : activePhoto ? (
              <img src={activePhoto} alt={product.name} />
            ) : (
              <span>NaNa</span>
            )}
          </div>
          {(product.video || thumbs.length > 1) && (
            <div className="gallery__thumbs">
              {product.video ? (
                <button
                  type="button"
                  className={`gallery__thumb-video ${showingVideo ? "is-active" : ""}`}
                  onClick={() => setShowVideo(true)}
                >
                  <video src={product.video} muted playsInline preload="metadata" />
                  <em>Video</em>
                </button>
              ) : null}
              {thumbs.map((image) => (
                <button
                  key={image}
                  type="button"
                  className={!showingVideo && image === activePhoto ? "is-active" : ""}
                  onClick={() => {
                    setShowVideo(false)
                    setPhoto(image)
                  }}
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
            <button className="btn" type="button" onClick={addToCart} disabled={!ready && !needsChoice}>
              {needsChoice ? "Elige talla o color" : ready ? "Añadir al carrito" : "Sin stock"}
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
      {related.length > 0 ? (
        <section className="home-section product-related" aria-label="Sugerencias">
          <header>
            <div>
              <h2>Quizá también te guste</h2>
              <p>
                {categoryName
                  ? `Más prendas de ${categoryName} y parecidas a esta.`
                  : "Otras prendas que pueden ir con esta."}
              </p>
            </div>
          </header>
          <div className="product-grid">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  )
}

export function ProductPage() {
  useCatalog()
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
