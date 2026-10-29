import { useState, type FormEvent } from "react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { container } from "../../infrastructure/composition/container.ts"
import { useAuth } from "../auth/auth-context.ts"
import { useCart } from "../cart/cart-context.ts"
import { CartDrawer } from "./CartDrawer.tsx"
import {
  BagIcon,
  CartIcon,
  ChevronDownIcon,
  CloseIcon,
  ExternalLinkIcon,
  FootwearIcon,
  HomeIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  ShirtIcon,
  UserIcon,
  WhatsAppIcon,
} from "./Icons.tsx"

const CURRENT_YEAR = new Date().getFullYear()

const STORE_LOCATION = {
  address: "Jr. Amazonas 890 (esq. con Av. Madre de Dios), Puerto Maldonado",
  lat: -12.5958,
  lng: -69.1921,
  mapEmbedUrl:
    "https://maps.google.com/maps?q=-12.5958,-69.1921&hl=es&z=17&output=embed",
  mapDirectUrl:
    "https://www.google.com/maps/search/?api=1&query=-12.5958,-69.1921",
}

const CLOTHING_SLUGS = new Set([
  "ropa-de-nina",
  "ropa-de-nino",
  "ropa-de-bebe-nina",
  "ropa-de-bebe-nino",
  "vestidos",
  "vestidos-de-gala",
  "pijamas",
])
const SHOE_SLUGS = new Set(["zapato"])
const ACCESSORY_SLUGS = new Set(["accesorios"])

export function StoreShell() {
  const store = container.getStore()
  const categories = container.listCategories()
  const cart = useCart()
  const auth = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [clothingOpen, setClothingOpen] = useState(true)
  const [desktopDropdownOpen, setDesktopDropdownOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [cookiesOn, setCookiesOn] = useState(() => localStorage.getItem("nana-store.cookies") !== "accepted")

  const clothingCategories = categories.filter((c) => CLOTHING_SLUGS.has(c.slug))
  const shoeCategories = categories.filter((c) => SHOE_SLUGS.has(c.slug))
  const accessoryCategories = categories.filter((c) => ACCESSORY_SLUGS.has(c.slug))
  const otherCategories = categories.filter(
    (c) => !CLOTHING_SLUGS.has(c.slug) && !SHOE_SLUGS.has(c.slug) && !ACCESSORY_SLUGS.has(c.slug),
  )

  function onSearch(event: FormEvent) {
    event.preventDefault()
    const term = query.trim()
    if (!term) return
    setMenuOpen(false)
    navigate(`/buscar?q=${encodeURIComponent(term)}`)
  }

  return (
    <div className="store">
      <header className="site-header">
        <div className="topbar">
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
          <NavLink
            className="toolbar-btn"
            to={auth.customer ? "/cuenta" : "/entrar"}
            aria-label={auth.customer ? `Cuenta de ${auth.customer.name}` : "Entrar"}
          >
            <UserIcon />
          </NavLink>
          <button className="toolbar-btn cart-btn" type="button" aria-label="Abrir carrito" onClick={cart.openCart}>
            <CartIcon />
            {cart.quantity > 0 && <span>{cart.quantity}</span>}
          </button>
        </div>

        {/* Menú de categorías en el encabezado para escritorio */}
        <nav className="topbar__nav">
          <NavLink to="/" end className="topbar__nav-link">
            <HomeIcon />
            <span>Inicio</span>
          </NavLink>

          {/* Menú desplegable Ropa */}
          <div
            className="topbar__dropdown"
            onMouseEnter={() => setDesktopDropdownOpen(true)}
            onMouseLeave={() => setDesktopDropdownOpen(false)}
          >
            <button
              type="button"
              className={`topbar__nav-link ${desktopDropdownOpen ? "is-active" : ""}`}
              onClick={() => setDesktopDropdownOpen((prev) => !prev)}
              aria-expanded={desktopDropdownOpen}
            >
              <ShirtIcon />
              <span>Ropa</span>
              <span className="topbar__count-badge">{clothingCategories.length}</span>
              <ChevronDownIcon className="topbar__chevron" />
            </button>

            <div className={`topbar__dropdown-menu ${desktopDropdownOpen ? "is-open" : ""}`}>
              <div className="topbar__dropdown-header">
                <strong>Prendas y Moda Infantil</strong>
                <span>{clothingCategories.length} opciones</span>
              </div>
              <div className="topbar__dropdown-grid">
                {clothingCategories.map((category) => (
                  <NavLink
                    key={category.id}
                    to={`/c/${category.slug}`}
                    className="topbar__dropdown-item"
                    onClick={() => setDesktopDropdownOpen(false)}
                  >
                    <span className="topbar__dropdown-dot" />
                    <span>{category.name}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          </div>

          {/* Calzado */}
          {shoeCategories.map((category) => (
            <NavLink
              key={category.id}
              to={`/c/${category.slug}`}
              className="topbar__nav-link"
            >
              <FootwearIcon />
              <span>{category.name}</span>
            </NavLink>
          ))}

          {/* Accesorios */}
          {accessoryCategories.map((category) => (
            <NavLink
              key={category.id}
              to={`/c/${category.slug}`}
              className="topbar__nav-link"
            >
              <BagIcon />
              <span>{category.name}</span>
            </NavLink>
          ))}

          {otherCategories.map((category) => (
            <NavLink
              key={category.id}
              to={`/c/${category.slug}`}
              className="topbar__nav-link"
            >
              <span>{category.name}</span>
            </NavLink>
          ))}

          <div className="topbar__nav-promo">
            <span className="topbar__promo-badge">Puerto Maldonado · Tienda física</span>
            <a
              href={`https://wa.me/${store.whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="topbar__whatsapp-link"
            >
              <WhatsAppIcon />
              <span>WhatsApp</span>
            </a>
          </div>
        </nav>
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
            <div className="sidebar__brand">
              <img src={store.logo} alt="" className="sidebar__avatar" />
              <div className="sidebar__brand-info">
                <strong>{store.name}</strong>
                <span className="sidebar__badge">
                  <span className="sidebar__status-dot" />
                  Catálogo Oficial
                </span>
              </div>
            </div>
            <button
              type="button"
              className="sidebar__close"
              onClick={() => setMenuOpen(false)}
              aria-label="Cerrar menú"
            >
              <CloseIcon />
            </button>
          </div>

          <nav className="sidebar__nav">
            <div className="sidebar__section-title">Navegación</div>
            <NavLink to="/" end className="sidebar__item" onClick={() => setMenuOpen(false)}>
              <span className="sidebar__item-icon">
                <HomeIcon />
              </span>
              <span>Inicio</span>
            </NavLink>

            <div className="sidebar__section-title">Colecciones</div>

            {/* Agrupación Ropa */}
            <div className={`sidebar__group ${clothingOpen ? "is-expanded" : ""}`}>
              <button
                type="button"
                className="sidebar__group-btn"
                onClick={() => setClothingOpen((prev) => !prev)}
                aria-expanded={clothingOpen}
              >
                <span className="sidebar__item-icon sidebar__item-icon--pink">
                  <ShirtIcon />
                </span>
                <span className="sidebar__group-title">Ropa</span>
                <span className="sidebar__group-count">{clothingCategories.length}</span>
                <ChevronDownIcon className="sidebar__chevron" />
              </button>

              {clothingOpen && (
                <div className="sidebar__subnav">
                  {clothingCategories.map((category) => (
                    <NavLink
                      key={category.id}
                      to={`/c/${category.slug}`}
                      className="sidebar__subitem"
                      onClick={() => setMenuOpen(false)}
                    >
                      <span className="sidebar__dot" />
                      <span>{category.name}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>

            {/* Calzado */}
            {shoeCategories.map((category) => (
              <NavLink
                key={category.id}
                to={`/c/${category.slug}`}
                className="sidebar__item"
                onClick={() => setMenuOpen(false)}
              >
                <span className="sidebar__item-icon sidebar__item-icon--blue">
                  <FootwearIcon />
                </span>
                <span>{category.name}</span>
              </NavLink>
            ))}

            {/* Accesorios */}
            {accessoryCategories.map((category) => (
              <NavLink
                key={category.id}
                to={`/c/${category.slug}`}
                className="sidebar__item"
                onClick={() => setMenuOpen(false)}
              >
                <span className="sidebar__item-icon sidebar__item-icon--amber">
                  <BagIcon />
                </span>
                <span>{category.name}</span>
              </NavLink>
            ))}

            {otherCategories.map((category) => (
              <NavLink
                key={category.id}
                to={`/c/${category.slug}`}
                className="sidebar__item"
                onClick={() => setMenuOpen(false)}
              >
                <span>{category.name}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <main>
          <Outlet />
          <footer className="site-footer">
            <div className="site-footer__grid">
              <div className="site-footer__col site-footer__brand">
                <div className="site-footer__brand-header">
                  <img src={store.logo} alt={store.name} className="site-footer__logo" />
                  <strong>{store.name}</strong>
                </div>
                <p className="site-footer__tagline">
                  Moda infantil de calidad en Puerto Maldonado. Ropa para niñas, niños, bebés y calzado para momentos especiales.
                </p>
                <div className="site-footer__contact-items">
                  <a
                    className="site-footer__contact-link"
                    href={`https://wa.me/${store.whatsapp}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="icon-wrapper icon-wrapper--whatsapp">
                      <WhatsAppIcon />
                    </span>
                    <div>
                      <small>Escríbenos por WhatsApp</small>
                      <span>+{store.whatsapp}</span>
                    </div>
                  </a>
                  <a
                    className="site-footer__contact-link"
                    href={`tel:+${store.phone.replace(/[^0-9]/g, "")}`}
                  >
                    <span className="icon-wrapper">
                      <PhoneIcon />
                    </span>
                    <div>
                      <small>Teléfono</small>
                      <span>{store.phone}</span>
                    </div>
                  </a>
                  <a className="site-footer__contact-link" href={`mailto:${store.email}`}>
                    <span className="icon-wrapper">
                      <MailIcon />
                    </span>
                    <div>
                      <small>Correo electrónico</small>
                      <span>{store.email}</span>
                    </div>
                  </a>
                </div>
              </div>

              <div className="site-footer__col site-footer__nav">
                <h3>Categorías</h3>
                <nav className="site-footer__links">
                  <NavLink to="/">Inicio</NavLink>
                  {clothingCategories.slice(0, 4).map((category) => (
                    <NavLink key={category.id} to={`/c/${category.slug}`}>
                      {category.name}
                    </NavLink>
                  ))}
                  {shoeCategories.map((category) => (
                    <NavLink key={category.id} to={`/c/${category.slug}`}>
                      {category.name}
                    </NavLink>
                  ))}
                  {accessoryCategories.map((category) => (
                    <NavLink key={category.id} to={`/c/${category.slug}`}>
                      {category.name}
                    </NavLink>
                  ))}
                  <button
                    type="button"
                    className="site-footer__more-categories"
                    onClick={() => setMenuOpen(true)}
                  >
                    Ver catálogo completo ({categories.length}) →
                  </button>
                </nav>
              </div>

              <div className="site-footer__col site-footer__location">
                <h3>Nuestra Ubicación</h3>
                <div className="site-footer__address">
                  <span className="icon-wrapper icon-wrapper--pin">
                    <MapPinIcon />
                  </span>
                  <div>
                    <strong>{STORE_LOCATION.address}</strong>
                    <p>Puerto Maldonado · Madre de Dios</p>
                  </div>
                </div>

                <div className="site-footer__map-card">
                  <iframe
                    title="Ubicación exacta de NaNa Store"
                    src={STORE_LOCATION.mapEmbedUrl}
                    className="site-footer__map-iframe"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                  <a
                    className="site-footer__map-btn"
                    href={STORE_LOCATION.mapDirectUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>Abrir en Google Maps</span>
                    <ExternalLinkIcon />
                  </a>
                </div>
              </div>
            </div>

            <div className="site-footer__bottom">
              <p>
                © {CURRENT_YEAR} <strong>{store.name}</strong> · Todos los derechos reservados.
              </p>
              <p className="site-footer__disclaimer">
                Todos los productos y ofertas de este catálogo son responsabilidad de la tienda.
              </p>
            </div>
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
