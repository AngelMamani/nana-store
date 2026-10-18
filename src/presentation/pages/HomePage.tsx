import { Link } from "react-router-dom"
import { container } from "../../infrastructure/composition/container.ts"
import { ProductCard } from "../components/ProductCard.tsx"

export function HomePage() {
  const store = container.getStore()
  const sections = container.getHomeSections()

  return (
    <div className="page">
      <img className="banner" src={store.banner} alt="NaNa, ropa infantil" />
      {sections.map((section) => (
        <section key={section.category.id} className="home-section">
          <header>
            <h2>{section.category.name}</h2>
            <Link to={`/c/${section.category.slug}`}>Ver todo ({section.total})</Link>
          </header>
          <div className="rail">
            {section.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <Link className="see-all" to={`/c/${section.category.slug}`}>
            Ver todo de {section.category.name}
          </Link>
        </section>
      ))}
    </div>
  )
}
