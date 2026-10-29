import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../auth/auth-context.ts"
import { collection, getDocs, doc, updateDoc } from "firebase/firestore"
import { firebaseDb } from "../../infrastructure/firebase/firebase.ts"
import type { UserRole } from "../../domain/auth/entities.ts"

type UserItem = {
  id: string
  name: string
  email: string
  role: UserRole
  createdAt?: string
}

export function AdminPage() {
  const { customer, logout } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState<UserItem[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState("")

  const isDev = customer?.role === "desarrollador"
  const isAdmin = customer?.role === "administrador" || isDev

  useEffect(() => {
    if (!customer) {
      navigate("/entrar")
      return
    }
    if (!isAdmin) {
      navigate("/cuenta")
      return
    }
    loadUsers()
  }, [customer, isAdmin, navigate])

  async function loadUsers() {
    setLoadingUsers(true)
    try {
      const snap = await getDocs(collection(firebaseDb, "users"))
      const list: UserItem[] = []
      snap.forEach((d) => {
        const data = d.data()
        list.push({
          id: d.id,
          name: data.name || "Sin nombre",
          email: data.email || "",
          role: (data.role as UserRole) || "cliente",
          createdAt: data.createdAt,
        })
      })
      setUsers(list)
    } catch {
      setStatusMsg("No se pudieron cargar los usuarios.")
    } finally {
      setLoadingUsers(false)
    }
  }

  async function handleRoleChange(userId: string, newRole: UserRole) {
    if (!isDev) {
      setStatusMsg("Solo un usuario con rol 'desarrollador' puede modificar roles de administración.")
      return
    }
    setSavingId(userId)
    setStatusMsg("")
    try {
      await updateDoc(doc(firebaseDb, "users", userId), { role: newRole })
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      )
      setStatusMsg("Rol actualizado correctamente.")
    } catch {
      setStatusMsg("Error al actualizar el rol en Firestore.")
    } finally {
      setSavingId(null)
    }
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="admin-page page">
      <header className="admin-header">
        <div>
          <span className="admin-badge">
            {isDev ? "Rol: Desarrollador 🚀" : "Rol: Administrador 🛡️"}
          </span>
          <h1>Panel de Administración NaNa</h1>
          <p>
            Bienvenido, <strong>{customer?.name}</strong> ({customer?.email})
          </p>
        </div>
        <div className="admin-header__actions">
          <Link to="/" className="btn btn--outline">
            Ver Tienda
          </Link>
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => {
              logout()
              navigate("/entrar")
            }}
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      {statusMsg && <div className="notice">{statusMsg}</div>}

      <div className="admin-grid">
        <section className="admin-card">
          <h2>Gestión de Usuarios y Roles</h2>
          <p>
            {isDev
              ? "Como Desarrollador, puedes asignar y promover a usuarios como Administrador o Desarrollador."
              : "Vista de roles asignados a usuarios en el sistema."}
          </p>

          {loadingUsers ? (
            <p>Cargando lista de usuarios...</p>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Correo</th>
                    <th>Rol Actual</th>
                    {isDev && <th>Asignar Rol</th>}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.name}</strong>
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`role-tag role-tag--${u.role}`}>
                          {u.role}
                        </span>
                      </td>
                      {isDev && (
                        <td>
                          <select
                            value={u.role}
                            disabled={savingId === u.id || u.email === "amamanim@unamad.edu.pe"}
                            onChange={(e) =>
                              handleRoleChange(u.id, e.target.value as UserRole)
                            }
                            className="role-select"
                          >
                            <option value="cliente">Cliente</option>
                            <option value="administrador">Administrador</option>
                            <option value="desarrollador">Desarrollador</option>
                          </select>
                        </td>
                      )}
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={isDev ? 4 : 3} style={{ textAlign: "center" }}>
                        No hay usuarios registrados aún en Firestore.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="admin-card">
          <h2>Módulos del Sistema</h2>
          <div className="admin-modules">
            <div className="admin-module-item">
              <h3>📦 Catálogo de Productos</h3>
              <p>Gestiona productos, stock, tallas y precios.</p>
              <span className="badge badge--soft">Próximamente</span>
            </div>
            <div className="admin-module-item">
              <h3>🛍️ Pedidos y Ventas</h3>
              <p>Seguimiento a pedidos generados por clientes.</p>
              <span className="badge badge--soft">Próximamente</span>
            </div>
            <div className="admin-module-item">
              <h3>🖼️ Galería y Multimedia</h3>
              <p>Imágenes subidas en Firebase Storage.</p>
              <span className="badge badge--soft">Próximamente</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
