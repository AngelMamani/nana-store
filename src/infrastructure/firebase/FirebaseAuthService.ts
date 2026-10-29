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
import type { Customer, AuthResult } from "../../domain/auth/entities.ts"

function userToCustomer(user: User): Customer {
  return {
    id: user.uid,
    name: user.displayName || user.email?.split("@")[0] || "Cliente NaNa",
    email: user.email || "",
  }
}

export class FirebaseAuthService {
  async getCurrentCustomer(): Promise<Customer | null> {
    const user = firebaseAuth.currentUser
    if (user) return userToCustomer(user)

    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
        unsubscribe()
        resolve(user ? userToCustomer(user) : null)
      })
    })
  }

  async loginWithEmail(email: string, password: string): Promise<AuthResult<Customer>> {
    try {
      const cred = await signInWithEmailAndPassword(firebaseAuth, email, password)
      return { ok: true, value: userToCustomer(cred.user) }
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
      // Guardar perfil en Firestore
      await setDoc(doc(firebaseDb, "users", cred.user.uid), {
        id: cred.user.uid,
        name: name || cred.user.email?.split("@")[0] || "",
        email: cred.user.email,
        createdAt: new Date().toISOString(),
      })
      return { ok: true, value: userToCustomer(cred.user) }
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

      // Sincronizar o crear usuario en Firestore
      const userDocRef = doc(firebaseDb, "users", user.uid)
      const userSnap = await getDoc(userDocRef)
      if (!userSnap.exists()) {
        await setDoc(userDocRef, {
          id: user.uid,
          name: user.displayName || "",
          email: user.email || "",
          createdAt: new Date().toISOString(),
        })
      }

      return { ok: true, value: userToCustomer(user) }
    } catch {
      return { ok: false, error: { type: "invalid-credentials" } }
    }
  }

  async logout(): Promise<void> {
    await signOut(firebaseAuth)
  }

  onCustomerChanged(callback: (customer: Customer | null) => void): () => void {
    return onAuthStateChanged(firebaseAuth, (user) => {
      callback(user ? userToCustomer(user) : null)
    })
  }
}
