import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { authErrorMessage } from "../auth/auth-error.ts"
import { useAuth } from "../auth/auth-context.ts"

export function RegisterPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.")
      return
    }
    setPending(true)
    setError("")
    const result = await auth.register(name, email, password)
    setPending(false)
    if (!result.ok) {
      setError(authErrorMessage(result.error))
      return
    }
    navigate("/cuenta")
  }

  return (
    <form className="auth" onSubmit={onSubmit}>
      <h1>Crear cuenta</h1>
      <p>La cuenta se guarda en este navegador. No hace falta para ver el catálogo.</p>
      <label>
        Nombre
        <input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required />
      </label>
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
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>
      <label>
        Repite la contraseña
        <input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          required
        />
      </label>
      {error && <p className="notice">{error}</p>}
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Creando cuenta…" : "Crear cuenta"}
      </button>
      <p className="auth-switch">
        ¿Ya tienes cuenta? <Link to="/entrar">Entra</Link>
      </p>
    </form>
  )
}
