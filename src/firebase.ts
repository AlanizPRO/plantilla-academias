import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore'
import { cliente } from './cliente'

// Datos públicos del proyecto de Firebase del cliente (no son secretos).
const app = initializeApp({
  apiKey: cliente.firebase.apiKey,
  authDomain: `${cliente.firebase.projectId}.firebaseapp.com`,
  projectId: cliente.firebase.projectId,
  storageBucket: `${cliente.firebase.projectId}.firebasestorage.app`,
  messagingSenderId: cliente.firebase.messagingSenderId,
  appId: cliente.firebase.appId,
})

export const auth = getAuth(app)
export const google = new GoogleAuthProvider()
google.setCustomParameters({ prompt: 'select_account' })
// Guarda una copia en el teléfono: la app abre rápido y funciona con mala señal.
export const db = initializeFirestore(app, { localCache: persistentLocalCache() })
