import { useEffect, useState, type ReactNode } from "react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { container } from "../../infrastructure/composition/container.ts"
import { useAuth } from "../auth/auth-context.ts"
import { useCatalog } from "../catalog/catalog-context.ts"
import { useAdminGuard } from "./useAdminGuard.ts"

const NAV_COLLAPSED_KEY = "nana-admin-nav-collapsed"
const THEME_KEY = "nana-admin-theme"

export type AdminTheme = "light" | "dark"

export type AdminShellContext = {
  theme: AdminTheme
  themeLabel: string
  toggleTheme: () => void
}

const MENU: { to: string; label: string; icon: string; end?: boolean }[] = [
  { to: "/admin", label: "Inicio", end: true, icon: "home" },
  { to: "/admin/productos", label: "Productos", icon: "shirt" },
  { to: "/admin/categorias", label: "Categorías", icon: "grid" },
  { to: "/admin/inventario", label: "Inventario", icon: "box" },
  { to: "/admin/ofertas", label: "Ofertas", icon: "tag" },
  { to: "/admin/pedidos", label: "Pedidos", icon: "clipboard" },
  { to: "/admin/usuarios", label: "Usuarios", icon: "users" },
  { to: "/admin/videos", label: "Videos", icon: "video" },
  { to: "/admin/tienda", label: "Tienda", icon: "store" },
]

function readCollapsed() {
  try {
    return localStorage.getItem(NAV_COLLAPSED_KEY) === "1"
  } catch {
    return false
  }
}

function readTheme(): AdminTheme {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === "light" || saved === "dark") return saved
  } catch {
    /* ignore */
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function AdminLayout() {
  useCatalog()
  const { customer, loading, isAdmin, isDev } = useAdminGuard()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const store = container.getStore()
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [theme, setTheme] = useState<AdminTheme>(readTheme)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopNav, setDesktopNav] = useState(() =>
    window.matchMedia("(min-width: 768px)").matches,
  )

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)")
    const sync = () => setDesktopNav(media.matches)
    media.addEventListener("change", sync)
    return () => media.removeEventListener("change", sync)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(NAV_COLLAPSED_KEY, collapsed ? "1" : "0")
    } catch {
      /* ignore quota / private mode */
    }
  }, [collapsed])

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* ignore quota / private mode */
    }
  }, [theme])

  const toggleTheme = () => setTheme((current) => (current === "dark" ? "light" : "dark"))
  const themeLabel = theme === "dark" ? "Modo claro" : "Modo oscuro"

  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false)
    }
    document.addEventListener("keydown", onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = previous
    }
  }, [mobileOpen])

  if (loading || !isAdmin) {
    return <div className="admin-boot">Cargando panel…</div>
  }

  const shellClass = [
    "admin-shell",
    collapsed && desktopNav ? "is-collapsed" : "",
    mobileOpen ? "is-nav-open" : "",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div className={shellClass} data-theme={theme}>
      <button
        type="button"
        className="admin-nav-backdrop"
        aria-label="Cerrar menú"
        onClick={() => setMobileOpen(false)}
      />
      <aside className="admin-nav" id="admin-nav">
        <div className="admin-nav__brand">
          <img src={store.logo} alt="" />
          <div className="admin-nav__brand-copy">
            <strong>NaNa Admin</strong>
            <span>{isDev ? "Desarrollador" : "Administrador"}</span>
          </div>
          <button
            type="button"
            className="admin-nav__icon-btn admin-nav__close"
            aria-label="Cerrar menú"
            onClick={() => setMobileOpen(false)}
          >
            <NavGlyph name="close" />
          </button>
        </div>
        <nav aria-label="Administración">
          {MENU.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="admin-nav__link"
              title={item.label}
              onClick={() => setMobileOpen(false)}
            >
              <NavGlyph name={item.icon} />
              <span className="admin-nav__label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="admin-nav__foot">
          <p className="admin-nav__user">{customer?.name}</p>
          <button
            type="button"
            className="admin-nav__action admin-nav__action--danger"
            title="Salir"
            onClick={() => {
              logout()
              navigate("/entrar")
            }}
          >
            <NavGlyph name="logout" />
            <span className="admin-nav__label">Salir</span>
          </button>
          <button
            type="button"
            className="admin-nav__collapse"
            onClick={() => setCollapsed((value) => !value)}
            aria-pressed={collapsed}
            title={collapsed ? "Mostrar menú" : "Ocultar menú"}
          >
            <NavGlyph name={collapsed ? "expand" : "collapse"} />
            <span className="admin-nav__label">{collapsed ? "Mostrar menú" : "Ocultar menú"}</span>
          </button>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <button
            type="button"
            className="admin-topbar__menu"
            aria-label="Abrir menú"
            aria-controls="admin-nav"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            <NavGlyph name="menu" />
          </button>
          <div className="admin-topbar__brand">
            <img src={store.logo} alt="" />
            <strong>NaNa Admin</strong>
          </div>
        </header>
        <Outlet context={{ theme, themeLabel, toggleTheme } satisfies AdminShellContext} />
      </div>
    </div>
  )
}

function NavGlyph({ name }: { name: string }) {
  const icons: Record<string, ReactNode> = {
    home: (
      <>
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </>
    ),
    shirt: <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.5a2 2 0 0 0 1.98 1.67H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10.86h1.16a2 2 0 0 0 1.98-1.67l.58-3.5a2 2 0 0 0-1.34-2.23z" />,
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.2" />
        <rect x="14" y="3" width="7" height="7" rx="1.2" />
        <rect x="3" y="14" width="7" height="7" rx="1.2" />
        <rect x="14" y="14" width="7" height="7" rx="1.2" />
      </>
    ),
    box: (
      <>
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </>
    ),
    tag: (
      <>
        <path d="M12 2H2v10l9.29 9.29a1 1 0 0 0 1.41 0l8.59-8.59a1 1 0 0 0 0-1.41Z" />
        <circle cx="6.5" cy="6.5" r="1.5" />
      </>
    ),
    clipboard: (
      <>
        <rect x="8" y="2" width="8" height="4" rx="1" />
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    video: (
      <>
        <rect x="2" y="6" width="14" height="12" rx="2" />
        <path d="m16 10 6-3v10l-6-3z" />
      </>
    ),
    store: (
      <>
        <path d="M3 9 5.2 4h13.6L21 9" />
        <path d="M3 9v11h18V9" />
        <path d="M9 20v-6h6v6" />
      </>
    ),
    external: (
      <>
        <path d="M15 3h6v6" />
        <path d="M10 14 21 3" />
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      </>
    ),
    logout: (
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </>
    ),
    collapse: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M9 4v16" />
        <path d="m15 9-3 3 3 3" />
      </>
    ),
    expand: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M9 4v16" />
        <path d="m12 9 3 3-3 3" />
      </>
    ),
    menu: (
      <>
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="18" x2="20" y2="18" />
      </>
    ),
    close: (
      <>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </>
    ),
    moon: (
      <>
        <path d="M21 14.5A8.4 8.4 0 0 1 9.5 3 7 7 0 1 0 21 14.5Z" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  )
}
