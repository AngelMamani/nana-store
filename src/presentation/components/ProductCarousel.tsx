import { useEffect, useRef, useState } from "react"
import type { Product } from "../../domain/catalog/entities.ts"
import { ChevronLeftIcon, ChevronRightIcon } from "./Icons.tsx"
import { ProductCard } from "./ProductCard.tsx"

export function ProductCarousel({ products }: { products: Product[] }) {
  const track = useRef<HTMLDivElement>(null)
  const [canScroll, setCanScroll] = useState(false)

  useEffect(() => {
    const node = track.current
    if (!node) return

    function update() {
      if (!node) return
      setCanScroll(node.scrollWidth > node.clientWidth + 12)
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    node.addEventListener("scroll", update, { passive: true })
    return () => {
      observer.disconnect()
      node.removeEventListener("scroll", update)
    }
  }, [products])

  function scrollByCards(direction: -1 | 1) {
    const node = track.current
    if (!node) return
    const card = node.querySelector(".product-card")
    const width = card instanceof HTMLElement ? card.offsetWidth + 14 : 220
    node.scrollBy({ left: direction * width * 2, behavior: "smooth" })
  }

  if (products.length === 0) return null

  return (
    <div className={`product-carousel ${canScroll ? "is-scrollable" : ""}`}>
      {canScroll ? (
        <button
          type="button"
          className="product-carousel__nav is-prev"
          aria-label="Anteriores"
          onClick={() => scrollByCards(-1)}
        >
          <ChevronLeftIcon />
        </button>
      ) : null}
      <div className="product-carousel__track rail" ref={track}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      {canScroll ? (
        <button
          type="button"
          className="product-carousel__nav is-next"
          aria-label="Siguientes"
          onClick={() => scrollByCards(1)}
        >
          <ChevronRightIcon />
        </button>
      ) : null}
    </div>
  )
}
