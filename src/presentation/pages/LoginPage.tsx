import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { authErrorMessage } from "../auth/auth-error.ts"
import { useAuth } from "../auth/auth-context.ts"
import { container } from "../../infrastructure/composition/container.ts"
import { GoogleIcon } from "../components/Icons.tsx"
import loginBackground from "../../assets/login.png"

export function LoginPage() {
  const store = container.getStore()
  const auth = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError("")
    const result = await auth.login(email, password)
    setPending(false)
    if (!result.ok) {
      setError(authErrorMessage(result.error))
      return
    }
    const userRole = result.value.role
    if (userRole === "desarrollador" || userRole === "administrador") {
      navigate("/admin")
    } else {
      navigate("/cuenta")
    }
  }

  return (
    <div
      className="fullscreen-auth"
      style={{ backgroundImage: `url(${loginBackground})` }}
    >
      <div className="fullscreen-auth__backdrop" />

      {/* Botón flotante para regresar a la tienda */}
      <Link to="/" className="fullscreen-auth__back-btn" aria-label="Volver a la tienda">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        <span>Volver a la tienda</span>
      </Link>

      <div className="fullscreen-auth__container">
        <div className="fullscreen-auth__card">
          <div className="fullscreen-auth__header">
            <Link to="/" className="fullscreen-auth__brand-circle" title="Ir a inicio">
              <img src={store.logo} alt={store.name} />
            </Link>
          </div>

          <form className="fullscreen-auth__form" onSubmit={onSubmit}>
            <div className="input-field">
              <label htmlFor="login-email">Correo electrónico</label>
              <div className="input-wrapper">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="ejemplo@correo.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-field">
              <label htmlFor="login-password">Contraseña</label>
              <div className="input-wrapper">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="fullscreen-auth__error">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button
              className="fullscreen-auth__btn"
              type="submit"
              disabled={pending}
            >
              {pending ? (
                <span className="btn-loader">Entrando...</span>
              ) : (
                <span>Iniciar sesión</span>
              )}
            </button>

            <div className="auth-separator">
              <span>o continúa con</span>
            </div>

            <button
              type="button"
              className="btn-google"
              onClick={async () => {
                setPending(true)
                setError("")
                const result = await auth.loginWithGoogle()
                setPending(false)
                if (result.ok) {
                  const userRole = result.value.role
                  if (userRole === "desarrollador" || userRole === "administrador") {
                    navigate("/admin")
                  } else {
                    navigate("/cuenta")
                  }
                } else {
                  setError("No se pudo iniciar sesión con Google")
                }
              }}
              disabled={pending}
            >
              <GoogleIcon />
              <span>Continuar con Google</span>
            </button>
          </form>

          <div className="fullscreen-auth__footer">
            <p>
              ¿Aún no tienes cuenta?{" "}
              <Link to="/registro">Regístrate gratis</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
