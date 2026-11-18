import { Link } from "react-router-dom"
import type { Product } from "../../domain/catalog/entities.ts"
import { formatPen } from "../../domain/catalog/money.ts"
import {
  canQuickAdd,
  defaultSelection,
  findVariant,
  selectedImage,
  selectedUnitPrice,
  summarizePrice,
} from "../../domain/catalog/pricing.ts"
import { useCart } from "../cart/cart-context.ts"
import { CartIcon } from "./Icons.tsx"

export function ProductCard({ product }: { product: Product }) {
  const cart = useCart()
  const price = summarizePrice(product)
  const quickAdd = canQuickAdd(product)

  function addToCart() {
    const selection = defaultSelection(product)
    cart.addLine({
      productId: product.id,
      variantId: findVariant(product, selection)?.id ?? null,
      name: product.name,
      image: selectedImage(product, selection),
      options: Object.entries(selection).map(([name, title]) => ({ name, title })),
      unitPrice: selectedUnitPrice(product, selection),
      quantity: 1,
    })
  }

  return (
    <article className="product-card">
      <Link className="product-card__link" to={`/p/${product.id}`}>
        <div className="product-card__media">
          {product.pin ? <span className="pin-badge">DESTACADO</span> : null}
          {price.offer && <span className="offer-badge">OFERTA</span>}
          {product.image ? (
            <img src={product.image} alt="" />
          ) : (
            <span className="product-card__fallback">NaNa</span>
          )}
        </div>
        <h3>{product.name}</h3>
        <p className="product-card__price">
          {price.from ? <span>A partir de </span> : null}
          {formatPen(price.amount)}
        </p>
      </Link>
      {quickAdd ? (
        <button className="product-card__add" type="button" onClick={addToCart}>
          <CartIcon />
          Añadir
        </button>
      ) : (
        <Link className="product-card__add" to={`/p/${product.id}`}>
          Elegir talla
        </Link>
      )}
    </article>
  )
}
