import { useState, type FormEvent } from "react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { container } from "../../infrastructure/composition/container.ts"
import { useCart } from "../cart/cart-context.ts"
import { CartDrawer } from "./CartDrawer.tsx"

export function StoreShell() {
  const store = container.getStore()
  const categories = container.listCategories()
  const cart = useCart()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [cookiesOn, setCookiesOn] = useState(() => localStorage.getItem("nana-store.cookies") !== "accepted")

  function onSearch(event: FormEvent) {
    event.preventDefault()
    const term = query.trim()
    if (!term) return
    setMenuOpen(false)
    navigate(`/buscar?q=${encodeURIComponent(term)}`)
  }

  return (
    <div className="store">
      <header className="topbar">
        <button
          className="icon-btn"
          type="button"
          aria-label="Abrir categorías"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <span />
          <span />
          <span />
        </button>
        <NavLink className="brand" to="/">
          <img src={store.logo} alt="" />
          <strong>{store.name}</strong>
        </NavLink>
        <form className="search" onSubmit={onSearch}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre o descripción"
            aria-label="Buscar productos"
          />
          <button type="submit">Buscar</button>
        </form>
        <button className="cart-btn" type="button" onClick={cart.openCart}>
          Carrito
          <span>{cart.quantity}</span>
        </button>
      </header>

      <div className="store__body">
        <button
          className={`sidebar-backdrop ${menuOpen ? "is-open" : ""}`}
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMenuOpen(false)}
        />
        <aside className={`sidebar ${menuOpen ? "is-open" : ""}`}>
          <div className="sidebar__head">
            <strong>Categorías</strong>
            <button type="button" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú">
              ×
            </button>
          </div>
          <nav>
            <NavLink to="/" end onClick={() => setMenuOpen(false)}>
              Inicio
            </NavLink>
            {categories.map((category) => (
              <NavLink key={category.id} to={`/c/${category.slug}`} onClick={() => setMenuOpen(false)}>
                {category.name}
              </NavLink>
            ))}
          </nav>
          <section className="contact">
            <h2>Entra en contacto</h2>
            <a href={`tel:+${store.whatsapp}`}>{store.phone}</a>
            <a href={`mailto:${store.email}`}>{store.email}</a>
            <a href={`https://wa.me/${store.whatsapp}`} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
            <p>{store.address}</p>
          </section>
        </aside>
        <main>
          <Outlet />
          <footer className="site-footer">
            <p>
              Todos los productos y ofertas de este catálogo son responsabilidad de <strong>{store.name}</strong>
            </p>
            <p>{store.address}</p>
          </footer>
        </main>
      </div>
      <CartDrawer />
      {cookiesOn && (
        <div className="cookies">
          <p>Usamos el carrito guardado en este navegador para que puedas seguir tu pedido.</p>
          <button
            type="button"
            onClick={() => {
              localStorage.setItem("nana-store.cookies", "accepted")
              setCookiesOn(false)
            }}
          >
            Aceptar y cerrar
          </button>
        </div>
      )}
    </div>
  )
}
