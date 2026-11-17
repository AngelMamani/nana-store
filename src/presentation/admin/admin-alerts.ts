import Swal from "sweetalert2"
import "sweetalert2/dist/sweetalert2.min.css"

function isDarkAdmin() {
  return document.querySelector(".admin-shell")?.getAttribute("data-theme") === "dark"
}

function themed() {
  return Swal.mixin({
    buttonsStyling: false,
    customClass: {
      popup: isDarkAdmin() ? "admin-swal admin-swal--dark" : "admin-swal",
      title: "admin-swal__title",
      htmlContainer: "admin-swal__text",
      confirmButton: "admin-swal__confirm",
      cancelButton: "admin-swal__cancel",
      icon: "admin-swal__icon",
    },
  })
}

export async function confirmAdminAction(options: {
  title: string
  text: string
  confirmText: string
  icon?: "warning" | "question" | "info"
  danger?: boolean
}) {
  const result = await themed().fire({
    title: options.title,
    text: options.text,
    icon: options.icon ?? (options.danger ? "warning" : "question"),
    showCancelButton: true,
    reverseButtons: true,
    confirmButtonText: options.confirmText,
    cancelButtonText: "Cancelar",
    customClass: {
      popup: isDarkAdmin() ? "admin-swal admin-swal--dark" : "admin-swal",
      title: "admin-swal__title",
      htmlContainer: "admin-swal__text",
      confirmButton: options.danger ? "admin-swal__confirm admin-swal__confirm--danger" : "admin-swal__confirm",
      cancelButton: "admin-swal__cancel",
      icon: "admin-swal__icon",
    },
  })
  return result.isConfirmed
}

export async function showAdminSuccess(title: string, text?: string) {
  await themed().fire({
    title,
    text,
    icon: "success",
    confirmButtonText: "Listo",
    heightAuto: false,
  })
}

export async function showAdminError(title: string, text?: string) {
  await themed().fire({
    title,
    text,
    icon: "error",
    confirmButtonText: "Entendido",
    heightAuto: false,
  })
}

export async function promptAdminText(options: {
  title: string
  text?: string
  value?: string
  confirmText: string
  placeholder?: string
}) {
  const result = await themed().fire({
    title: options.title,
    text: options.text,
    input: "text",
    inputValue: options.value ?? "",
    inputPlaceholder: options.placeholder,
    showCancelButton: true,
    reverseButtons: true,
    confirmButtonText: options.confirmText,
    cancelButtonText: "Cancelar",
    customClass: {
      popup: isDarkAdmin() ? "admin-swal admin-swal--dark" : "admin-swal",
      title: "admin-swal__title",
      htmlContainer: "admin-swal__text",
      confirmButton: "admin-swal__confirm",
      cancelButton: "admin-swal__cancel",
      input: "admin-swal__input",
    },
  })
  if (!result.isConfirmed) return null
  return String(result.value ?? "").trim()
}

export async function promptAdminNumber(options: {
  title: string
  text?: string
  value?: string
  confirmText: string
  placeholder?: string
}) {
  const result = await themed().fire({
    title: options.title,
    text: options.text,
    input: "number",
    inputValue: options.value ?? "",
    inputPlaceholder: options.placeholder,
    inputAttributes: { min: "0", step: "0.01" },
    showCancelButton: true,
    reverseButtons: true,
    confirmButtonText: options.confirmText,
    cancelButtonText: "Cancelar",
    customClass: {
      popup: isDarkAdmin() ? "admin-swal admin-swal--dark" : "admin-swal",
      title: "admin-swal__title",
      htmlContainer: "admin-swal__text",
      confirmButton: "admin-swal__confirm",
      cancelButton: "admin-swal__cancel",
      input: "admin-swal__input",
    },
  })
  if (!result.isConfirmed) return null
  const value = Number(result.value)
  return Number.isFinite(value) ? value : null
}
