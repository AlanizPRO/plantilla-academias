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
  encargado?: string // mamá, papá o tutor, para menores de edad
}
export type Cuenta = { banco: string; titular: string; numero: string; moneda: string }
export type Disponible = { dia: number; desde: string; hasta: string }
export type Ajustes = {
  cuotaMensual: number; moneda: string; diaPago: number; diasAvisoAntes: number
  duracion: number; disponibilidad: Disponible[]; telefonoProfesor: string
  cuentas: Cuenta[]; mensajeRecordatorio: string; firma: string
}
export type Reserva = {
  id: string; alumnoId: string; fecha: string; hora: string; tipo: 'reposicion' | 'extra'
  estado: 'pendiente' | 'aprobada' | 'rechazada'; nota?: string
}
export type Pago = {
  id: string; alumnoId: string; mes: string; monto: number; metodo?: string; nota?: string; fecha?: Timestamp
  numero?: number; cuenta?: string; avisoId?: string
}
/** El alumno avisa que ya pagó (con foto del comprobante); el profesor lo confirma y se vuelve un Pago con recibo. */
export type AvisoPago = {
  id: string; alumnoId: string; mes: string; monto: number; metodo: string; cuenta?: string; referencia?: string
  foto?: string; nota?: string; estado: 'pendiente' | 'confirmado' | 'rechazado'; motivo?: string; fecha?: Timestamp; pagoId?: string
}
export type TipoFecha = 'feriado' | 'sinclase' | 'evento'
export type Fecha = { id: string; fecha: string; hasta?: string; titulo: string; tipo: TipoFecha; nota?: string }
export type Tarea = {
  id: string; titulo: string; texto: string; para: string; entrega?: string; enlace?: string
  hechas: Record<string, boolean>; fecha?: Timestamp
}
export type Tema = { texto: string; hecho: boolean }
export type Programa = { id: string; alumnoId: string; periodo: string; temas: Tema[]; nota?: string; enlace?: string; actualizado?: Timestamp }
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
  cuentas: [],
  mensajeRecordatorio: '',
  firma: cliente.nombreProfesor ? `${cliente.nombreProfesor}\n${cliente.nombreApp}` : cliente.nombreApp,
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

// Recordatorio formal. El profesor lo puede cambiar en Ajustes; las palabras entre { } se llenan solas.
export const RECORDATORIO_BASE = `Estimado(a) {nombre}:

Reciba un cordial saludo de {academia}. Le recordamos que la mensualidad de {mes} de {alumno}, por un monto de {monto}, {vence}.

{cuentas}
Si ya realizó el pago, puede avisarnos desde la app con la foto del comprobante, o ignorar este mensaje.

Agradecemos su puntualidad.
{firma}`

export const PALABRAS_RECORDATORIO = ['{nombre}', '{alumno}', '{mes}', '{monto}', '{vence}', '{cuentas}', '{academia}', '{firma}']

export function textoCuentas(aj: Ajustes) {
  const cs = (aj.cuentas ?? []).filter((c) => c.numero.trim())
  if (cs.length === 0) return ''
  return `Puede pagar en efectivo o por transferencia/depósito a:\n${cs.map((c) => `• ${c.banco} ${c.moneda} ${c.numero}${c.titular ? ` (a nombre de ${c.titular})` : ''}`).join('\n')}\n`
}

export function textoRecordatorio(a: Alumno, mes: string, aj: Ajustes) {
  const dia = deIso(`${mes}-${dos(aj.diaPago)}`)
  const fechaVence = `${dia.getDate()} de ${MESES[dia.getMonth()]}`
  const vence = estadoPago(false, mes, aj) === 'atrasado' ? `venció el ${fechaVence} y se encuentra pendiente` : `vence el ${fechaVence}`
  const valores: Record<string, string> = {
    '{nombre}': (a.encargado?.trim() || a.nombre).trim(),
    '{alumno}': a.nombre.trim(),
    '{mes}': nombreMes(mes),
    '{monto}': dinero(cuotaDe(a, aj), aj),
    '{vence}': vence,
    '{cuentas}': textoCuentas(aj),
    '{academia}': cliente.nombreApp,
    '{firma}': aj.firma?.trim() || cliente.nombreApp,
  }
  let texto = aj.mensajeRecordatorio?.trim() || RECORDATORIO_BASE
  for (const [k, v] of Object.entries(valores)) texto = texto.split(k).join(v)
  return texto.replace(/\n{3,}/g, '\n\n').trim()
}

// ---------- Recibos ----------
export const numeroRecibo = (n?: number) => (n ? `N.º ${String(n).padStart(4, '0')}` : 'Sin número')
export function textoRecibo(p: Pago, a: Alumno | null | undefined, aj: Ajustes) {
  return [
    `*${cliente.nombreApp}* — Recibo ${numeroRecibo(p.numero)}`,
    `Recibimos de: ${a?.encargado?.trim() ? `${a.encargado} (por ${a.nombre})` : a?.nombre ?? ''}`,
    `Concepto: mensualidad de ${nombreMes(p.mes)}`,
    `Monto: ${dinero(p.monto, aj)} · ${p.metodo ?? ''}${p.cuenta ? ` (${p.cuenta})` : ''}`,
    `Fecha: ${(p.fecha?.toDate() ?? new Date()).toLocaleDateString('es-NI')}`,
    '', '¡Muchas gracias!', aj.firma?.trim() || cliente.nombreApp,
  ].join('\n')
}

// ---------- Calendario ----------
// Feriados nacionales de Nicaragua (Jueves y Viernes Santo cambian cada año).
function domingoPascua(anio: number) {
  const a = anio % 19, b = Math.floor(anio / 100), c = anio % 100, d = Math.floor(b / 4), e = b % 4
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(anio, mes - 1, dia)
}
export function feriadosNicaragua(anio: number): Omit<Fecha, 'id'>[] {
  const pascua = domingoPascua(anio)
  const f = (m: number, d: number, titulo: string) => ({ fecha: `${anio}-${dos(m)}-${dos(d)}`, titulo, tipo: 'feriado' as const })
  return [
    f(1, 1, 'Año Nuevo'),
    { fecha: isoDia(sumarDias(pascua, -3)), hasta: isoDia(sumarDias(pascua, -2)), titulo: 'Jueves y Viernes Santo', tipo: 'feriado' },
    f(5, 1, 'Día del Trabajo'),
    f(5, 30, 'Día de las Madres'),
    f(7, 19, 'Aniversario de la Revolución'),
    { ...f(9, 14, 'Fiestas Patrias'), hasta: `${anio}-09-15` },
    f(12, 8, 'La Purísima'),
    f(12, 25, 'Navidad'),
  ]
}
export const TEXTO_FECHA: Record<TipoFecha, [string, string]> = {
  feriado: ['Feriado', 'p-rosa'],
  sinclase: ['Sin clases', 'p-amarillo'],
  evento: ['Actividad', 'p-verde'],
}
/** ¿Ese día no hay clases (feriado o día libre)? */
export const sinClase = (fechas: Fecha[], dia: string) =>
  fechas.some((f) => f.tipo !== 'evento' && dia >= f.fecha && dia <= (f.hasta || f.fecha))
export function rangoFecha(f: Fecha) {
  const a = fechaCorta(deIso(f.fecha))
  return f.hasta && f.hasta !== f.fecha ? `${a} al ${fechaCorta(deIso(f.hasta))}` : a
}
export const periodoActual = () => { const d = new Date(); return `${d.getFullYear()} · ${d.getMonth() < 6 ? 'I' : 'II'} semestre` }

export function mensajeError(e: unknown) {
  const codigo = (e as { code?: string })?.code ?? ''
  if (codigo.includes('permission-denied')) return 'No tienes permiso para hacer eso.'
  if (codigo.includes('unavailable')) return 'Sin conexión. Se guardará cuando vuelva la señal.'
  if (codigo.includes('popup-closed')) return 'Se cerró la ventana de Google antes de terminar.'
  return 'Algo salió mal. Intenta de nuevo.'
}

export const iniciales = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
