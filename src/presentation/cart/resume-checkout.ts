const RESUME_CHECKOUT_KEY = "nana-store.resume-checkout"

export function markResumeCheckout() {
  sessionStorage.setItem(RESUME_CHECKOUT_KEY, "1")
}

export function consumeResumeCheckout() {
  const pending = sessionStorage.getItem(RESUME_CHECKOUT_KEY) === "1"
  if (pending) sessionStorage.removeItem(RESUME_CHECKOUT_KEY)
  return pending
}
