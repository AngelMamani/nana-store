import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { firebaseAuth, firebaseDb, googleAuthProvider } from "./firebase.ts"
import { SUPERADMIN_EMAIL, type Customer, type AuthResult, type UserRole } from "../../domain/auth/entities.ts"

async function fetchUserRole(email: string, uid: string): Promise<UserRole> {
  if (email.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase()) {
    return "desarrollador"
  }
  try {
    const snap = await getDoc(doc(firebaseDb, "users", uid))
    if (snap.exists()) {
      const data = snap.data()
      if (data.role) return data.role as UserRole
    }
  } catch {
    // fallback
  }
  return "cliente"
}

function authCode(error: unknown) {
  return typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : ""
}

async function syncUserDocument(user: User, role: UserRole) {
  const userDocRef = doc(firebaseDb, "users", user.uid)
  const userSnap = await getDoc(userDocRef)
  if (!userSnap.exists()) {
    await setDoc(userDocRef, {
      id: user.uid,
      name: user.displayName || user.email?.split("@")[0] || "",
      email: user.email || "",
      role,
      createdAt: new Date().toISOString(),
    })
    return
  }
  if (user.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase() && userSnap.data().role !== "desarrollador") {
    await setDoc(userDocRef, { role: "desarrollador" }, { merge: true })
  }
}

function userToCustomer(user: User, role: UserRole = "cliente"): Customer {
  const finalRole = user.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase() ? "desarrollador" : role
  return {
    id: user.uid,
    name: user.displayName || user.email?.split("@")[0] || "Cliente NaNa",
    email: user.email || "",
    role: finalRole,
  }
}

export class FirebaseAuthService {
  async getCurrentCustomer(): Promise<Customer | null> {
    const user = firebaseAuth.currentUser
    if (user) {
      const role = await fetchUserRole(user.email || "", user.uid)
      return userToCustomer(user, role)
    }

    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
        unsubscribe()
        if (!user) return resolve(null)
        const role = await fetchUserRole(user.email || "", user.uid)
        resolve(userToCustomer(user, role))
      })
    })
  }

  async loginWithEmail(email: string, password: string): Promise<AuthResult<Customer>> {
    try {
      const cred = await signInWithEmailAndPassword(firebaseAuth, email, password)
      const role = await fetchUserRole(cred.user.email || "", cred.user.uid)
      return { ok: true, value: userToCustomer(cred.user, role) }
    } catch {
      return { ok: false, error: { type: "invalid-credentials" } }
    }
  }

  async registerWithEmail(name: string, email: string, password: string): Promise<AuthResult<Customer>> {
    try {
      const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password)
      if (name) {
        await updateProfile(cred.user, { displayName: name })
      }
      const role: UserRole = email.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase() ? "desarrollador" : "cliente"
      // Guardar perfil en Firestore
      await setDoc(doc(firebaseDb, "users", cred.user.uid), {
        id: cred.user.uid,
        name: name || cred.user.email?.split("@")[0] || "",
        email: cred.user.email,
        role,
        createdAt: new Date().toISOString(),
      })
      return { ok: true, value: userToCustomer(cred.user, role) }
    } catch (err: unknown) {
      const errorMsg = (err as { code?: string })?.code || ""
      if (errorMsg === "auth/email-already-in-use") {
        return { ok: false, error: { type: "email-taken" } }
      }
      if (errorMsg === "auth/weak-password") {
        return { ok: false, error: { type: "weak-password" } }
      }
      return { ok: false, error: { type: "invalid-credentials" } }
    }
  }

  async completeGoogleRedirect(): Promise<Customer | null> {
    try {
      const result = await getRedirectResult(firebaseAuth)
      if (!result?.user) return null
      return this.#finishGoogleUser(result.user)
    } catch {
      return null
    }
  }

  async loginWithGoogle(): Promise<AuthResult<Customer>> {
    try {
      const result = await signInWithPopup(firebaseAuth, googleAuthProvider)
      const customer = await this.#finishGoogleUser(result.user)
      return { ok: true, value: customer }
    } catch (error) {
      const code = authCode(error)
      if (code === "auth/unauthorized-domain") {
        return { ok: false, error: { type: "unauthorized-domain" } }
      }
      if (code === "auth/popup-closed-by-user") {
        return { ok: false, error: { type: "invalid-credentials" } }
      }
      if (code === "auth/popup-blocked" || code === "auth/cancelled-popup-request") {
        try {
          await signInWithRedirect(firebaseAuth, googleAuthProvider)
          return { ok: false, error: { type: "redirect-pending" } }
        } catch (redirectError) {
          if (authCode(redirectError) === "auth/unauthorized-domain") {
            return { ok: false, error: { type: "unauthorized-domain" } }
          }
        }
      }
      return { ok: false, error: { type: "invalid-credentials" } }
    }
  }

  async #finishGoogleUser(user: User): Promise<Customer> {
    const role: UserRole = user.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase() ? "desarrollador" : "cliente"
    await syncUserDocument(user, role)
    const finalRole = await fetchUserRole(user.email || "", user.uid)
    return userToCustomer(user, finalRole)
  }

  async logout(): Promise<void> {
    await signOut(firebaseAuth)
  }

  onCustomerChanged(callback: (customer: Customer | null) => void): () => void {
    return onAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) {
        callback(null)
      } else {
        const role = await fetchUserRole(user.email || "", user.uid)
        callback(userToCustomer(user, role))
      }
    })
  }
}
