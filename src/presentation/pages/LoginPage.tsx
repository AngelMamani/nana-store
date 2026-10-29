import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { authErrorMessage } from "../auth/auth-error.ts"
import { useAuth } from "../auth/auth-context.ts"

export function LoginPage() {
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
    navigate("/cuenta")
  }

  return (
    <form className="auth" onSubmit={onSubmit}>
      <h1>Entrar</h1>
      <p>Usa tu cuenta de NaNa para que el pedido lleve tu nombre.</p>
      <label>
        Correo
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <label>
        Contraseña
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      {error && <p className="notice">{error}</p>}
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
      <p className="auth-switch">
        ¿Aún no tienes cuenta? <Link to="/registro">Regístrate</Link>
      </p>
    </form>
  )
}
