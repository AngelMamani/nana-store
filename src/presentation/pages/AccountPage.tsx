import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../auth/auth-context.ts"

export function AccountPage() {
  const auth = useAuth()
  const navigate = useNavigate()

  if (!auth.customer) {
    return (
      <div className="page empty-state">
        <h1>Tu cuenta</h1>
        <p>Entra para ver tus datos.</p>
        <Link className="btn" to="/entrar">
          Entrar
        </Link>
      </div>
    )
  }

  return (
    <section className="auth">
      <h1>Hola, {auth.customer.name}</h1>
      <p>{auth.customer.email}</p>
      <p>Cuando envíes el carrito por WhatsApp, el mensaje incluirá tu nombre.</p>
      <button
        className="btn"
        type="button"
        onClick={() => {
          auth.logout()
          navigate("/")
        }}
      >
        Cerrar sesión
      </button>
    </section>
  )
}
