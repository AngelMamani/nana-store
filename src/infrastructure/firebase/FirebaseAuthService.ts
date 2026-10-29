import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { firebaseAuth, firebaseDb, googleAuthProvider } from "./firebase.ts"
import type { Customer, AuthResult, UserRole } from "../../domain/auth/entities.ts"

const SUPERADMIN_EMAIL = "amamanim@unamad.edu.pe"

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

  async loginWithGoogle(): Promise<AuthResult<Customer>> {
    try {
      const result = await signInWithPopup(firebaseAuth, googleAuthProvider)
      const user = result.user
      const role: UserRole = (user.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase()) ? "desarrollador" : "cliente"

      // Sincronizar o crear usuario en Firestore
      const userDocRef = doc(firebaseDb, "users", user.uid)
      const userSnap = await getDoc(userDocRef)
      if (!userSnap.exists()) {
        await setDoc(userDocRef, {
          id: user.uid,
          name: user.displayName || "",
          email: user.email || "",
          role,
          createdAt: new Date().toISOString(),
        })
      } else {
        const existingData = userSnap.data()
        // Si es el correo del superadmin, asegurar que tenga el rol de desarrollador
        if (user.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase() && existingData.role !== "desarrollador") {
          await setDoc(userDocRef, { role: "desarrollador" }, { merge: true })
        }
      }

      const finalRole = await fetchUserRole(user.email || "", user.uid)
      return { ok: true, value: userToCustomer(user, finalRole) }
    } catch {
      return { ok: false, error: { type: "invalid-credentials" } }
    }
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
