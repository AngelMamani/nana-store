import type { AuthFailure } from "../../domain/auth/entities.ts"

export function authErrorMessage(error: AuthFailure): string {
  switch (error.type) {
    case "invalid-name":
      return "Escribe tu nombre."
    case "invalid-email":
      return "Escribe un correo válido."
    case "weak-password":
      return "La contraseña debe tener al menos 8 caracteres."
    case "email-taken":
      return "Ya existe una cuenta con ese correo."
    case "invalid-credentials":
      return "Correo o contraseña incorrectos."
  }
}
