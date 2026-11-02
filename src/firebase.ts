import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import { connectFirestoreEmulator, initializeFirestore, persistentLocalCache } from 'firebase/firestore'
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

// Solo para pruebas locales (npm run dev con VITE_EMULADOR=si): usa los emuladores de Firebase.
if (import.meta.env.VITE_EMULADOR === 'si') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  // Entrar en pruebas sin ventana de Google: __entrarPrueba('correo@gmail.com', 'Nombre')
  Object.assign(window, {
    __entrarPrueba: (email: string, name: string) => signInWithCredential(auth,
      GoogleAuthProvider.credential(JSON.stringify({ sub: email, email, email_verified: true, name }))),
  })
}
