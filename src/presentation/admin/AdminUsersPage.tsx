import { useEffect, useMemo, useState, type ReactNode } from "react"
import type { StoreUser, UserRole } from "../../domain/auth/entities.ts"
import { isProtectedDeveloper, roleLabel } from "../../domain/auth/entities.ts"
import { container } from "../../infrastructure/composition/container.ts"
import { confirmAdminAction, showAdminError } from "./admin-alerts.ts"
import { useAdminGuard } from "./useAdminGuard.ts"

const VIEW_KEY = "nana-admin-users-view"
const PAGE_SIZE = 10
const ROLES: UserRole[] = ["cliente", "administrador", "desarrollador"]

type UserView = "list" | "cards"
type RoleFilter = "all" | UserRole

function readView(): UserView {
  try {
    const saved = localStorage.getItem(VIEW_KEY)
    if (saved === "list" || saved === "cards") return saved
  } catch {
    /* ignore */
  }
  return window.matchMedia("(max-width: 767px)").matches ? "cards" : "list"
}

function initials(name: string, email: string) {
  const source = name.trim() || email.trim()
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return source.slice(0, 2).toUpperCase() || "?"
}

function formatJoined(value: string | null) {
  if (!value) return "Sin fecha"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Sin fecha"
  return date.toLocaleDateString("es-PE", { dateStyle: "medium" })
}

export function AdminUsersPage() {
  const { customer, isDev } = useAdminGuard()
  const [users, setUsers] = useState<StoreUser[]>([])
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<RoleFilter>("all")
  const [view, setView] = useState<UserView>(readView)
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const next = await container.listUsers()
        if (active) {
          setUsers(next)
          setError("")
        }
      } catch {
        if (active) setError("No se pudieron cargar los usuarios.")
      }
    }

    void load()
    const stop = container.subscribeUsers(() => {
      void load()
    })
    return () => {
      active = false
      stop()
    }
  }, [])

  const stats = useMemo(() => {
    let cliente = 0
    let administrador = 0
    let desarrollador = 0
    for (const user of users) {
      if (user.role === "cliente") cliente += 1
      if (user.role === "administrador") administrador += 1
      if (user.role === "desarrollador") desarrollador += 1
    }
    return { cliente, administrador, desarrollador, total: users.length }
  }, [users])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return users.filter((user) => {
      if (filter !== "all" && user.role !== filter) return false
      if (!needle) return true
      return `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(needle)
    })
  }, [users, query, filter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const from = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const to = Math.min(currentPage * PAGE_SIZE, filtered.length)

  function changeView(next: UserView) {
    setView(next)
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      /* ignore */
    }
  }

  function applyFilter(next: RoleFilter) {
    setFilter(next)
    setPage(1)
  }

  async function assignRole(user: StoreUser, role: UserRole) {
    if (!isDev) {
      await showAdminError("Sin permiso", "Solo un desarrollador puede cambiar roles.")
      return
    }
    if (user.role === role) return
    if (isProtectedDeveloper(user.email) && role !== "desarrollador") {
      await showAdminError("Usuario protegido", "El desarrollador principal no se puede cambiar.")
      return
    }
    const ok = await confirmAdminAction({
      title: `Rol: ${roleLabel(role)}`,
      text: `¿Asignar “${roleLabel(role)}” a ${user.name} (${user.email})?`,
      confirmText: "Cambiar rol",
      icon: role === "cliente" ? "warning" : "question",
      danger: role === "cliente" && user.role !== "cliente",
    })
    if (!ok) return
    setBusyId(user.id)
    try {
      await container.updateUserRole(user, role)
    } catch {
      await showAdminError("No se pudo actualizar", "Revisa las reglas de Firestore e inténtalo de nuevo.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="admin-screen admin-users">
      <section className="admin-products-hero">
        <div>
          <p className="admin-kicker">Acceso</p>
          <h1>Usuarios</h1>
          <p>
            {stats.total} cuentas · {stats.administrador} administradores ·{" "}
            {isDev ? "puedes cambiar roles al instante" : "solo lectura; un desarrollador asigna roles"}
          </p>
        </div>
      </section>

      {error && <p className="notice">{error}</p>}

      <section className="admin-users-kpis" aria-label="Resumen de usuarios">
        <KpiCard
          tone="ink"
          icon="users"
          label="Todos"
          value={stats.total}
          hint="cuentas registradas"
          active={filter === "all"}
          onClick={() => applyFilter("all")}
        />
        <KpiCard
          tone="pink"
          icon="user"
          label="Clientes"
          value={stats.cliente}
          hint="compran en la tienda"
          active={filter === "cliente"}
          onClick={() => applyFilter("cliente")}
        />
        <KpiCard
          tone="mint"
          icon="shield"
          label="Administradores"
          value={stats.administrador}
          hint="entran al panel"
          active={filter === "administrador"}
          onClick={() => applyFilter("administrador")}
        />
        <KpiCard
          tone="violet"
          icon="code"
          label="Desarrolladores"
          value={stats.desarrollador}
          hint="controlan roles"
          active={filter === "desarrollador"}
          onClick={() => applyFilter("desarrollador")}
        />
      </section>

      <div className="admin-products-toolbar">
        <label className="admin-products-search">
          <Glyph name="search" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
            placeholder="Buscar por nombre o correo"
          />
        </label>
        <div className="admin-products-views" role="group" aria-label="Modo de vista">
          <button
            type="button"
            className={view === "list" ? "is-active" : ""}
            aria-pressed={view === "list"}
            title="Vista lista"
            onClick={() => changeView("list")}
          >
            <Glyph name="list" />
            <span>Lista</span>
          </button>
          <button
            type="button"
            className={view === "cards" ? "is-active" : ""}
            aria-pressed={view === "cards"}
            title="Vista tarjetas"
            onClick={() => changeView("cards")}
          >
            <Glyph name="cards" />
            <span>Tarjetas</span>
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <section className="admin-products-empty">
          <Glyph name="users" />
          <strong>{users.length === 0 ? "Aún no hay usuarios" : "Nadie coincide con ese filtro"}</strong>
          <p>
            {users.length === 0
              ? "Aparecerán cuando alguien se registre o entre con Google."
              : "Prueba otra búsqueda o pulsa otra tarjeta."}
          </p>
        </section>
      ) : view === "cards" ? (
        <section className="admin-users-grid">
          {visible.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              isSelf={customer?.id === user.id}
              isDev={isDev}
              busy={busyId === user.id}
              onRole={(role) => void assignRole(user, role)}
            />
          ))}
        </section>
      ) : (
        <section className="admin-products-table admin-card">
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Correo</th>
                  <th>Alta</th>
                  <th>Rol</th>
                  {isDev && <th>Asignar</th>}
                </tr>
              </thead>
              <tbody>
                {visible.map((user) => (
                  <tr key={user.id} className={customer?.id === user.id ? "is-self" : ""}>
                    <td>
                      <div className="admin-user-cell">
                        <span className={`admin-user-avatar is-${user.role}`}>{initials(user.name, user.email)}</span>
                        <div>
                          <strong>{user.name}</strong>
                          {customer?.id === user.id && <em>Tú</em>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <a href={`mailto:${user.email}`}>{user.email}</a>
                    </td>
                    <td>{formatJoined(user.createdAt)}</td>
                    <td>
                      <span className={`role-tag role-tag--${user.role}`}>{roleLabel(user.role)}</span>
                    </td>
                    {isDev && (
                      <td>
                        <RoleSwitcher
                          user={user}
                          busy={busyId === user.id}
                          onRole={(role) => void assignRole(user, role)}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {filtered.length > 0 && (
        <nav className="admin-products-pager" aria-label="Paginación de usuarios">
          <p>
            Mostrando {from}-{to} de {filtered.length}
          </p>
          <div>
            <button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
              <Glyph name="prev" />
              Anterior
            </button>
            <span>
              Página {currentPage} de {pageCount}
            </span>
            <button type="button" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>
              Siguiente
              <Glyph name="next" />
            </button>
          </div>
        </nav>
      )}
    </div>
  )
}

function UserCard({
  user,
  isSelf,
  isDev,
  busy,
  onRole,
}: {
  user: StoreUser
  isSelf: boolean
  isDev: boolean
  busy: boolean
  onRole: (role: UserRole) => void
}) {
  return (
    <article className={`admin-user-card is-${user.role}`}>
      <div className="admin-user-card__head">
        <span className={`admin-user-avatar is-${user.role}`}>{initials(user.name, user.email)}</span>
        <div>
          <p>{formatJoined(user.createdAt)}</p>
          <h2>{user.name}</h2>
          <a href={`mailto:${user.email}`}>{user.email}</a>
          {isSelf && <em>Tú</em>}
        </div>
      </div>
      <span className={`role-tag role-tag--${user.role}`}>{roleLabel(user.role)}</span>
      {isDev && <RoleSwitcher user={user} busy={busy} onRole={onRole} />}
    </article>
  )
}

function RoleSwitcher({
  user,
  busy,
  onRole,
}: {
  user: StoreUser
  busy: boolean
  onRole: (role: UserRole) => void
}) {
  const locked = isProtectedDeveloper(user.email)
  return (
    <div className="admin-user-roles" role="group" aria-label={`Rol de ${user.name}`}>
      {ROLES.map((role) => (
        <button
          key={role}
          type="button"
          className={`is-${role} ${user.role === role ? "is-active" : ""}`}
          disabled={busy || user.role === role || (locked && role !== "desarrollador")}
          title={locked && role !== "desarrollador" ? "Usuario protegido" : roleLabel(role)}
          onClick={() => onRole(role)}
        >
          {roleLabel(role)}
        </button>
      ))}
    </div>
  )
}

function KpiCard({
  tone,
  icon,
  label,
  value,
  hint,
  active,
  onClick,
}: {
  tone: string
  icon: string
  label: string
  value: number
  hint: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button type="button" className={`admin-inventory-kpi is-${tone} ${active ? "is-active" : ""}`} onClick={onClick}>
      <span className="admin-home-stat__icon">
        <Glyph name={icon} />
      </span>
      <em>{label}</em>
      <strong>{value}</strong>
      <span>{hint}</span>
    </button>
  )
}

function Glyph({ name }: { name: string }) {
  const icons: Record<string, ReactNode> = {
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3-3" />
      </>
    ),
    list: (
      <>
        <path d="M8 6h13" />
        <path d="M8 12h13" />
        <path d="M8 18h13" />
        <path d="M3 6h.01" />
        <path d="M3 12h.01" />
        <path d="M3 18h.01" />
      </>
    ),
    cards: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.2" />
        <rect x="14" y="3" width="7" height="7" rx="1.2" />
        <rect x="3" y="14" width="7" height="7" rx="1.2" />
        <rect x="14" y="14" width="7" height="7" rx="1.2" />
      </>
    ),
    prev: <path d="m15 18-6-6 6-6" />,
    next: <path d="m9 18 6-6-6-6" />,
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    user: (
      <>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    code: (
      <>
        <path d="m16 18 6-6-6-6" />
        <path d="m8 6-6 6 6 6" />
      </>
    ),
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  )
}
