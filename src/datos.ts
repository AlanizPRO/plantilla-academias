import {
  collection, doc, onSnapshot, query, setDoc, where, type DocumentData, type Query, type Timestamp,
} from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { cliente } from './cliente'
import { db } from './firebase'

// ---------- Tipos ----------
export type Clase = { dia: number; hora: string } // dia: 0 domingo … 6 sábado; hora "16:00"
export type Alumno = {
  id: string; nombre: string; telefono?: string; correo?: string; instrumento?: string; nivel?: string
  cuota?: number; notas?: string; activo: boolean; clases: Clase[]; uid?: string; vinculado?: boolean
}
export type Disponible = { dia: number; desde: string; hasta: string }
export type Ajustes = {
  cuotaMensual: number; moneda: string; diaPago: number; diasAvisoAntes: number
  duracion: number; disponibilidad: Disponible[]; telefonoProfesor: string
}
export type Reserva = {
  id: string; alumnoId: string; fecha: string; hora: string; tipo: 'reposicion' | 'extra'
  estado: 'pendiente' | 'aprobada' | 'rechazada'; nota?: string
}
export type Pago = { id: string; alumnoId: string; mes: string; monto: number; metodo?: string; nota?: string; fecha?: Timestamp }
export type Aviso = { id: string; titulo: string; texto: string; para: string; fecha?: Timestamp }
export type Material = { id: string; titulo: string; enlace: string; para: string; mes?: string; nota?: string; fecha?: Timestamp }

export const AJUSTES_INICIALES: Ajustes = {
  cuotaMensual: cliente.cobro.cuotaMensual,
  moneda: cliente.cobro.moneda,
  diaPago: cliente.cobro.diaPago,
  diasAvisoAntes: cliente.cobro.diasAvisoAntes ?? 3,
  duracion: 60,
  disponibilidad: [1, 2, 3, 4, 5].map((dia) => ({ dia, desde: '14:00', hasta: '19:00' })),
  telefonoProfesor: '',
}

// ---------- Lecturas en vivo ----------
export function useLista<T>(q: Query<DocumentData> | null, deps: unknown[] = []) {
  const [lista, setLista] = useState<T[] | null>(null)
  useEffect(() => {
    if (!q) { setLista([]); return }
    return onSnapshot(q, (s) => setLista(s.docs.map((d) => ({ id: d.id, ...d.data() }) as T)), (e) => {
      console.error(e); setLista([])
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return lista
}

export function useAjustesConEstado(): [Ajustes, boolean] {
  const [estado, setEstado] = useState<[Ajustes, boolean]>([AJUSTES_INICIALES, false])
  useEffect(() => onSnapshot(doc(db, 'ajustes', 'general'), (s) => {
    setEstado([s.exists() ? { ...AJUSTES_INICIALES, ...s.data() } : AJUSTES_INICIALES, true])
  }, () => setEstado([AJUSTES_INICIALES, true])), [])
  return estado
}
export const useAjustes = () => useAjustesConEstado()[0]

export function usePublico() {
  const [fijos, setFijos] = useState<Clase[]>([])
  useEffect(() => onSnapshot(doc(db, 'publico', 'agenda'), (s) => setFijos((s.data()?.fijos as Clase[]) ?? []), () => {}), [])
  return fijos
}

export const col = (nombre: string) => collection(db, nombre)
export const todos = (nombre: string) => query(col(nombre))

const ordenAvisos = (a: Aviso, b: Aviso) => (b.fecha?.toMillis() ?? Date.now()) - (a.fecha?.toMillis() ?? Date.now())
export function useAvisos(alumnoId?: string) {
  const q = alumnoId ? query(col('avisos'), where('para', 'in', ['todos', alumnoId])) : todos('avisos')
  return (useLista<Aviso>(q, [alumnoId]) ?? []).sort(ordenAvisos)
}

// El profesor guarda aquí las horas de clases fijas (sin nombres) para que los alumnos vean qué está libre.
export async function actualizarAgendaPublica(alumnos: Alumno[]) {
  const fijos = alumnos.filter((a) => a.activo).flatMap((a) => a.clases ?? [])
  await setDoc(doc(db, 'publico', 'agenda'), { fijos })
}

// ---------- Fechas ----------
export const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const dos = (n: number) => String(n).padStart(2, '0')

export const isoDia = (d: Date) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`
export const isoMes = (d: Date) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}`
export const hoy = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }
export const deIso = (s: string) => { const [a, m, d] = s.split('-').map(Number); return new Date(a, m - 1, d || 1) }
export const sumarDias = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r }
export const nombreMes = (mes: string) => { const d = deIso(mes); return `${MESES[d.getMonth()]} ${d.getFullYear()}` }
export const fechaCorta = (d: Date) => `${DIAS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`
export const mesAnterior = (mes: string) => { const d = deIso(mes); d.setMonth(d.getMonth() - 1); return isoMes(d) }
export const mesSiguiente = (mes: string) => { const d = deIso(mes); d.setMonth(d.getMonth() + 1); return isoMes(d) }

const aMin = (h: string) => { const [a, b] = h.split(':').map(Number); return a * 60 + b }
const aHora = (m: number) => `${dos(Math.floor(m / 60))}:${dos(m % 60)}`
export function horasDelDia(disp: Disponible[], dia: number, duracion: number) {
  const horas: string[] = []
  for (const b of disp.filter((x) => x.dia === dia)) {
    for (let m = aMin(b.desde); m + duracion <= aMin(b.hasta); m += duracion) horas.push(aHora(m))
  }
  return [...new Set(horas)].sort()
}
export const hora12 = (h: string) => {
  const [a, b] = h.split(':').map(Number)
  return `${((a + 11) % 12) + 1}:${dos(b)} ${a < 12 ? 'a. m.' : 'p. m.'}`
}

// ---------- Pagos ----------
export type EstadoPago = 'pagado' | 'al-dia' | 'por-vencer' | 'vence-hoy' | 'atrasado'
export const cuotaDe = (a: Alumno, aj: Ajustes) => a.cuota || aj.cuotaMensual
export const dinero = (n: number, aj: Ajustes) => `${aj.moneda} ${n.toLocaleString('es-NI')}`

export function estadoPago(pagado: boolean, mes: string, aj: Ajustes): EstadoPago {
  if (pagado) return 'pagado'
  const vence = deIso(`${mes}-${dos(aj.diaPago)}`)
  const h = hoy()
  if (h > vence) return 'atrasado'
  if (+h === +vence) return 'vence-hoy'
  if (h >= sumarDias(vence, -aj.diasAvisoAntes)) return 'por-vencer'
  return 'al-dia'
}
export const TEXTO_PAGO: Record<EstadoPago, [string, string]> = {
  pagado: ['Pagado', 'p-verde'],
  'al-dia': ['Pendiente', 'p-gris'],
  'por-vencer': ['Por vencer', 'p-amarillo'],
  'vence-hoy': ['Vence hoy', 'p-amarillo'],
  atrasado: ['Atrasado', 'p-rosa'],
}

// ---------- WhatsApp ----------
export function enlaceWhatsApp(telefono: string | undefined, texto: string) {
  let n = (telefono ?? '').replace(/\D/g, '')
  if (n.length === 8) n = `505${n}` // número de Nicaragua sin código de país
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`
}

export function textoRecordatorio(a: Alumno, mes: string, aj: Ajustes) {
  const nombre = a.nombre.split(' ')[0]
  return `Hola ${nombre}, te recuerdo que la cuota de ${nombreMes(mes)} (${dinero(cuotaDe(a, aj), aj)}) vence el ${aj.diaPago}. ¡Gracias! — ${cliente.nombreApp}`
}

export function mensajeError(e: unknown) {
  const codigo = (e as { code?: string })?.code ?? ''
  if (codigo.includes('permission-denied')) return 'No tienes permiso para hacer eso.'
  if (codigo.includes('unavailable')) return 'Sin conexión. Se guardará cuando vuelva la señal.'
  if (codigo.includes('popup-closed')) return 'Se cerró la ventana de Google antes de terminar.'
  return 'Algo salió mal. Intenta de nuevo.'
}

export const iniciales = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
