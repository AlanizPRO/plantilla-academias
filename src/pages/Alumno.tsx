import type { User } from 'firebase/auth'
import { doc, onSnapshot, query, where } from 'firebase/firestore'
import { useEffect, useState, type ReactNode } from 'react'
import { cliente, tiene } from '../cliente'
import { T } from '../textos'
import { Barra, Encabezado, type Pestana } from '../componentes'
import {
  col, cuotaDe, dinero, estadoPago, fechaCorta, hora12, hoy, isoDia, isoMes, nombreMes, sumarDias,
  rangoFecha, sinClase, TEXTO_FECHA, TEXTO_PAGO, useAjustes, useAvisos, useLista, usePublico,
  type Alumno as TAlumno, type Fecha, type AvisoPago, type Pago, type Reserva,
} from '../datos'
import { db } from '../firebase'
import { salir } from '../sesion'
import Avisos from './Avisos'
import Horario from './Horario'
import Materiales from './Materiales'
import Calendario, { useFechas } from './Calendario'
import MisPagos from './MisPagos'
import Programas from './Programas'
import Tareas, { useTareas } from './Tareas'

type Vista = 'inicio' | 'horario' | 'pagos' | 'estudio' | 'avisos'
type SubEstudio = 'tareas' | 'programa' | 'material'

function vistos() { try { return Number(localStorage.getItem('avisosVistos')) || 0 } catch { return 0 } }

export default function Alumno({ usuario, alumnoId, botonTema }: { usuario: User; alumnoId: string; botonTema: ReactNode }) {
  const [vista, setVista] = useState<Vista>('inicio')
  const [sub, setSub] = useState<SubEstudio>(tiene('tareas') ? 'tareas' : tiene('programas') ? 'programa' : 'material')
  const tareas = useTareas(alumnoId)
  const tareasPendientes = tareas.filter((t) => !t.hechas?.[alumnoId]).length
  const fechas = useFechas()
  const [yo, setYo] = useState<TAlumno | null>(null)
  const [ultimoVisto, setUltimoVisto] = useState(vistos)
  const ajustes = useAjustes()
  const fijos = usePublico()
  const avisos = useAvisos(alumnoId)
  const pagos = (useLista<Pago>(query(col('pagos'), where('alumnoId', '==', alumnoId)), [alumnoId]) ?? []).sort((a, b) => b.mes.localeCompare(a.mes))
  const avisosPago = useLista<AvisoPago>(query(col('avisosPago'), where('alumnoId', '==', alumnoId)), [alumnoId]) ?? []
  const [abrirYaPague, setAbrirYaPague] = useState(false)

  useEffect(() => onSnapshot(doc(db, 'alumnos', alumnoId), (s) => setYo(s.exists() ? ({ id: s.id, ...s.data() } as TAlumno) : null), () => setYo(null)), [alumnoId])

  const nuevos = avisos.filter((a) => (a.fecha?.toMillis() ?? 0) > ultimoVisto).length
  function ir(v: string) {
    setVista(v as Vista); scrollTo(0, 0); if (v !== 'pagos') setAbrirYaPague(false)
    if (v === 'avisos') { const t = Date.now(); setUltimoVisto(t); try { localStorage.setItem('avisosVistos', String(t)) } catch { /* sin almacenamiento */ } }
  }
  const pestanas: Pestana[] = [
    { id: 'inicio', nombre: 'Inicio', icono: 'inicio' },
    ...(tiene('horarios') ? [{ id: 'horario', nombre: 'Horario', icono: 'horario' }] : []),
    ...(tiene('pagos') ? [{ id: 'pagos', nombre: 'Pagos', icono: 'pagos' }] : []),
    ...(tiene('materiales') || tiene('tareas') || tiene('programas') ? [{ id: 'estudio', nombre: 'Estudio', icono: 'estudio', punto: tareasPendientes > 0 }] : []),
    ...(tiene('avisos') ? [{ id: 'avisos', nombre: 'Avisos', icono: 'avisos', punto: nuevos > 0 }] : []),
  ]
  const mes = isoMes(new Date())
  const estado = estadoPago(pagos.some((p) => p.mes === mes), mes, ajustes)
  const enRevision = avisosPago.some((a) => a.estado === 'pendiente' && a.mes <= mes)

  return (
    <>
      <div className="app">
        <Encabezado subtitulo={yo?.nombre ?? usuario.displayName ?? T.Persona} derecha={botonTema} />
        <main>
          {vista === 'inicio' && <Inicio yo={yo} estado={estado} mes={mes} ajustes={ajustes} enRevision={enRevision} onYaPague={() => { setAbrirYaPague(true); ir('pagos') }} avisos={avisos.slice(0, 2)} nuevos={nuevos} onIr={ir} fechas={fechas} tareasPendientes={tareasPendientes} />}
          {vista === 'horario' && <Horario modo="alumno" ajustes={ajustes} yo={yo} fijos={fijos} />}
          {vista === 'pagos' && <MisPagos yo={yo} pagos={pagos} avisosPago={avisosPago} ajustes={ajustes} abrirAviso={abrirYaPague}
            banner={<BannerPago yo={yo} estado={estado} mes={mes} ajustes={ajustes} enRevision={enRevision} />} />}
          {vista === 'estudio' && <>
            {[tiene('tareas'), tiene('programas'), tiene('materiales')].filter(Boolean).length > 1 && (
              <div className="tabs" role="tablist" style={{ marginBottom: 12 }}>
                {tiene('tareas') && <button className="tab" role="tab" aria-selected={sub === 'tareas'} onClick={() => setSub('tareas')}>{T.Tareas}{tareasPendientes > 0 ? ` (${tareasPendientes})` : ''}</button>}
                {tiene('programas') && <button className="tab" role="tab" aria-selected={sub === 'programa'} onClick={() => setSub('programa')}>{T.Programa}</button>}
                {tiene('materiales') && <button className="tab" role="tab" aria-selected={sub === 'material'} onClick={() => setSub('material')}>Material</button>}
              </div>
            )}
            {sub === 'tareas' && tiene('tareas') && <Tareas alumnoId={alumnoId} />}
            {sub === 'programa' && tiene('programas') && <Programas alumnoId={alumnoId} />}
            {sub === 'material' && tiene('materiales') && <Materiales alumnoId={alumnoId} />}
          </>}
          {vista === 'avisos' && <>
            <Avisos alumnoId={alumnoId} />
            {tiene('calendario') && <Calendario />}
          </>}
          <div className="fila" style={{ justifyContent: 'center', marginTop: 24 }}>
            <button className="btn btn-borde btn-chico" onClick={salir}>Cerrar sesión</button>
          </div>
        </main>
      </div>
      <Barra pestanas={pestanas} actual={vista} onIr={ir} />
    </>
  )
}

type PropsBanner = { yo: TAlumno | null; estado: ReturnType<typeof estadoPago>; mes: string; ajustes: ReturnType<typeof useAjustes>; enRevision: boolean }

function BannerPago({ yo, estado, mes, ajustes, enRevision, onYaPague }: PropsBanner & { onYaPague?: () => void }) {
  if (!yo) return null
  const monto = dinero(cuotaDe(yo, ajustes), ajustes)
  const [texto, pill] = TEXTO_PAGO[estado]
  const mensajes: Record<string, string> = {
    pagado: `Tu cuota de ${nombreMes(mes)} está pagada. ¡Gracias!`,
    'al-dia': `Tu próxima cuota (${monto}) se paga el ${ajustes.diaPago} de ${nombreMes(mes).split(' ')[0]}.`,
    'por-vencer': `Tu cuota de ${monto} vence el ${ajustes.diaPago}. ¡No lo olvides!`,
    'vence-hoy': `Hoy vence tu cuota de ${monto}.`,
    atrasado: `Tu cuota de ${nombreMes(mes)} (${monto}) está atrasada. Venció el día ${ajustes.diaPago}.`,
  }
  const urgente = !enRevision && ['por-vencer', 'vence-hoy', 'atrasado'].includes(estado)
  if (enRevision && estado !== 'pagado') return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="fila" style={{ justifyContent: 'space-between' }}><b>Pago del mes</b><span className="pill p-amarillo">En revisión</span></div>
      <p>Enviaste tu comprobante. Cuando {T.tuAdmin} lo confirme, verás tu recibo en Pagos.</p>
    </div>
  )
  return (
    <div className={urgente ? (estado === 'atrasado' ? 'error' : 'aviso') : 'panel'} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="fila" style={{ justifyContent: 'space-between' }}><b>Pago del mes</b><span className={`pill ${pill}`}>{texto}</span></div>
      <p>{mensajes[estado]}</p>
      {urgente && onYaPague && <button className="btn btn-principal btn-chico" style={{ alignSelf: 'flex-start' }} onClick={onYaPague}>Ya pagué: enviar comprobante</button>}
    </div>
  )
}

function proximaClase(yo: TAlumno | null, mias: Reserva[], fechas: Fecha[]) {
  if (!yo) return null
  const ahora = new Date()
  const opciones: Date[] = []
  for (let i = 0; i < 8; i++) {
    const d = sumarDias(hoy(), i)
    if (sinClase(fechas, isoDia(d))) continue
    for (const c of yo.clases ?? []) if (c.dia === d.getDay()) opciones.push(new Date(`${isoDia(d)}T${c.hora}`))
  }
  for (const r of mias) if (r.estado === 'aprobada') opciones.push(new Date(`${r.fecha}T${r.hora}`))
  return opciones.filter((d) => d > ahora).sort((a, b) => +a - +b)[0] ?? null
}

function Inicio({ yo, estado, mes, ajustes, enRevision, onYaPague, avisos, nuevos, onIr, fechas, tareasPendientes }: PropsBanner & { onYaPague: () => void; avisos: ReturnType<typeof useAvisos>; nuevos: number; onIr: (v: string) => void; fechas: Fecha[]; tareasPendientes: number }) {
  const desde = isoDia(hoy())
  const mias = useLista<Reserva>(yo ? query(col('reservas'), where('alumnoId', '==', yo.id)) : null, [yo?.id]) ?? []
  const proxima = proximaClase(yo, mias.filter((r) => r.fecha >= desde), fechas)
  const proximaFecha = fechas.find((f) => (f.hasta || f.fecha) >= desde && f.fecha <= isoDia(sumarDias(hoy(), 21)))
  const hh = proxima ? `${String(proxima.getHours()).padStart(2, '0')}:${String(proxima.getMinutes()).padStart(2, '0')}` : ''
  return (
    <section className="pantalla">
      <div><h1>Hola{yo ? `, ${yo.nombre.split(' ')[0]}` : ''} 👋</h1><p className="suave">{cliente.nombreApp}</p></div>
      {tiene('horarios') && <div className="panel destacado">
        <span className="etiqueta" style={{ color: 'rgba(255,255,255,.85)' }}>{T.tuProxima}</span>
        <h2>{proxima ? `${fechaCorta(proxima)} · ${hora12(hh)}` : `Sin ${T.clases} agendad${T.c}s`}</h2>
        {yo?.instrumento && <p className="suave">{yo.instrumento}{yo.nivel ? ` · ${yo.nivel}` : ''}</p>}
      </div>}
      {tiene('pagos') && <BannerPago yo={yo} estado={estado} mes={mes} ajustes={ajustes} enRevision={enRevision} onYaPague={onYaPague} />}
      {tiene('tareas') && tareasPendientes > 0 && <button className="aviso" style={{ border: 0, textAlign: 'left' }} onClick={() => onIr('estudio')}>📝 Tienes {tareasPendientes} {tareasPendientes > 1 ? T.tareas : T.tarea} pendiente{tareasPendientes > 1 ? 's' : ''} →</button>}
      {tiene('calendario') && proximaFecha && <div className="panel" style={{ gap: 4 }}>
        <div className="fila" style={{ justifyContent: 'space-between' }}><b>{proximaFecha.titulo}</b><span className={`pill ${TEXTO_FECHA[proximaFecha.tipo][1]}`}>{TEXTO_FECHA[proximaFecha.tipo][0]}</span></div>
        <small className="suave">{rangoFecha(proximaFecha)}{proximaFecha.nota ? ` · ${proximaFecha.nota}` : ''}</small>
      </div>}
      {tiene('reservas') && <button className="btn btn-principal" onClick={() => onIr('horario')}>Reponer o pedir {T.clase}</button>}
      <div className="panel">
        <div className="fila" style={{ justifyContent: 'space-between' }}>
          <h3>Avisos {nuevos > 0 && <span className="pill p-rosa">{nuevos} nuevo{nuevos > 1 ? 's' : ''}</span>}</h3>
          <button className="btn btn-borde btn-chico" onClick={() => onIr('avisos')}>Ver todos</button>
        </div>
        {avisos.length === 0 && <p className="suave">No hay avisos.</p>}
        {avisos.map((a) => <div key={a.id}><b>{a.titulo}</b><p className="suave chico" style={{ whiteSpace: 'pre-wrap' }}>{a.texto}</p></div>)}
      </div>
    </section>
  )
}
