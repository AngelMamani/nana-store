import { Link } from "react-router-dom"
import type { Product } from "../../domain/catalog/entities.ts"
import { formatPen } from "../../domain/catalog/money.ts"
import { summarizePrice } from "../../domain/catalog/pricing.ts"

export function ProductCard({ product }: { product: Product }) {
  const price = summarizePrice(product)

  return (
    <Link className="product-card" to={`/p/${product.id}`}>
      <div className="product-card__media">
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
  )
}
