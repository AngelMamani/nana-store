import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

export const firebaseConfig = {
  apiKey: "AIzaSyD4kBkS848vFP4K0Fbo2yyG9j1VB77b2Qc",
  authDomain: "nana-store-8b0ab.firebaseapp.com",
  projectId: "nana-store-8b0ab",
  storageBucket: "nana-store-8b0ab.firebasestorage.app",
  messagingSenderId: "194400153115",
  appId: "1:194400153115:web:fb48ed1a91854b74c612be",
}

// Inicialización singleton
export const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp()
export const firebaseAuth = getAuth(firebaseApp)
export const firebaseDb = getFirestore(firebaseApp)
export const firebaseStorage = getStorage(firebaseApp)
export const googleAuthProvider = new GoogleAuthProvider()
