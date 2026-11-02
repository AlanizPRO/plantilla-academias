import { onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, type User } from 'firebase/auth'
import { doc, getDoc, onSnapshot, writeBatch } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { correoAdmin } from './cliente'
import { auth, db, google } from './firebase'

export type Rol = 'cargando' | 'fuera' | 'admin' | 'alumno' | 'sin-rol'
export type Sesion = { rol: Rol; usuario: User | null; alumnoId?: string }

const CLAVE = 'invitacion'

// Si la app se abrió con un enlace de invitación (?i=CODIGO), lo guardamos hasta que el alumno entre.
export function guardarInvitacionDeLaUrl() {
  const url = new URL(location.href)
  const codigo = url.searchParams.get('i')
  if (!codigo) return
  try { localStorage.setItem(CLAVE, codigo.trim().toUpperCase()) } catch { /* sin almacenamiento */ }
  url.searchParams.delete('i')
  history.replaceState(null, '', url.pathname + url.search + url.hash)
}
export function invitacionGuardada() {
  try { return localStorage.getItem(CLAVE) ?? '' } catch { return '' }
}
function olvidarInvitacion() {
  try { localStorage.removeItem(CLAVE) } catch { /* sin almacenamiento */ }
}

export async function entrar() {
  try {
    await signInWithPopup(auth, google)
  } catch (e) {
    const codigo = (e as { code?: string }).code ?? ''
    if (codigo.includes('popup-blocked') || codigo.includes('operation-not-supported')) await signInWithRedirect(auth, google)
    else throw e
  }
}
export const salir = () => signOut(auth)

// Vincula la cuenta de Google del alumno con su ficha usando el código de invitación.
export async function aceptarInvitacion(codigoTexto: string) {
  const u = auth.currentUser
  if (!u) throw new Error('Primero entra con Google.')
  const codigo = codigoTexto.trim().toUpperCase()
  const inv = await getDoc(doc(db, 'invitaciones', codigo))
  if (!inv.exists()) throw new Error('Ese código no existe. Revisa que esté bien escrito.')
  const { alumnoId, usada } = inv.data() as { alumnoId: string; usada: boolean }
  if (usada) throw new Error('Esa invitación ya se usó. Pide una nueva a tu profesor.')
  const lote = writeBatch(db)
  lote.set(doc(db, 'usuarios', u.uid), { alumnoId, codigo, nombre: u.displayName ?? '', correo: u.email ?? '' })
  lote.update(doc(db, 'invitaciones', codigo), { usada: true, uid: u.uid })
  lote.update(doc(db, 'alumnos', alumnoId), { uid: u.uid, correoApp: u.email ?? '', vinculado: true })
  await lote.commit()
  olvidarInvitacion()
}

export function useSesion(): Sesion & { errorInvitacion: string } {
  const [usuario, setUsuario] = useState<User | null | undefined>(undefined)
  const [perfil, setPerfil] = useState<{ alumnoId?: string } | null | undefined>(undefined)
  const [errorInvitacion, setErrorInvitacion] = useState('')

  useEffect(() => onAuthStateChanged(auth, setUsuario), [])

  const esAdmin = !!usuario && usuario.emailVerified && (usuario.email ?? '').toLowerCase() === correoAdmin

  useEffect(() => {
    if (!usuario || esAdmin) { setPerfil(undefined); return }
    // Ignoramos lo que aún no confirmó el servidor: si no, el alumno pediría sus datos antes de que la invitación quede guardada.
    return onSnapshot(doc(db, 'usuarios', usuario.uid), { includeMetadataChanges: true }, (s) => {
      if (s.metadata.hasPendingWrites) return
      setPerfil(s.exists() ? s.data() : null)
    }, () => setPerfil(null))
  }, [usuario, esAdmin])

  // Alumno nuevo que llegó con un enlace: lo vinculamos solo.
  useEffect(() => {
    if (!usuario || esAdmin || perfil !== null) return
    const codigo = invitacionGuardada()
    if (!codigo) return
    aceptarInvitacion(codigo).catch((e: Error) => { olvidarInvitacion(); setErrorInvitacion(e.message) })
  }, [usuario, esAdmin, perfil])

  if (usuario === undefined) return { rol: 'cargando', usuario: null, errorInvitacion }
  if (!usuario) return { rol: 'fuera', usuario: null, errorInvitacion }
  if (esAdmin) return { rol: 'admin', usuario, errorInvitacion }
  if (perfil === undefined) return { rol: 'cargando', usuario, errorInvitacion }
  if (perfil?.alumnoId) return { rol: 'alumno', usuario, alumnoId: perfil.alumnoId, errorInvitacion }
  return { rol: 'sin-rol', usuario, errorInvitacion }
}
