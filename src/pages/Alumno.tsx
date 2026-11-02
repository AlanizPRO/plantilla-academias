import type { User } from 'firebase/auth'
import { doc, onSnapshot, query, where } from 'firebase/firestore'
import { useEffect, useState, type ReactNode } from 'react'
import { cliente, tiene } from '../cliente'
import { Barra, Encabezado, Vacio, type Pestana } from '../componentes'
import {
  col, cuotaDe, dinero, enlaceWhatsApp, estadoPago, fechaCorta, hora12, hoy, isoDia, isoMes, nombreMes, sumarDias,
  TEXTO_PAGO, useAjustes, useAvisos, useLista, usePublico, type Alumno as TAlumno, type Pago, type Reserva,
} from '../datos'
import { db } from '../firebase'
import { ICONOS } from '../iconos'
import { salir } from '../sesion'
import Avisos from './Avisos'
import Horario from './Horario'
import Materiales from './Materiales'

type Vista = 'inicio' | 'horario' | 'pagos' | 'material' | 'avisos'

function vistos() { try { return Number(localStorage.getItem('avisosVistos')) || 0 } catch { return 0 } }

export default function Alumno({ usuario, alumnoId, botonTema }: { usuario: User; alumnoId: string; botonTema: ReactNode }) {
  const [vista, setVista] = useState<Vista>('inicio')
  const [yo, setYo] = useState<TAlumno | null>(null)
  const [ultimoVisto, setUltimoVisto] = useState(vistos)
  const ajustes = useAjustes()
  const fijos = usePublico()
  const avisos = useAvisos(alumnoId)
  const pagos = (useLista<Pago>(query(col('pagos'), where('alumnoId', '==', alumnoId)), [alumnoId]) ?? []).sort((a, b) => b.mes.localeCompare(a.mes))

  useEffect(() => onSnapshot(doc(db, 'alumnos', alumnoId), (s) => setYo(s.exists() ? ({ id: s.id, ...s.data() } as TAlumno) : null), () => setYo(null)), [alumnoId])

  const nuevos = avisos.filter((a) => (a.fecha?.toMillis() ?? 0) > ultimoVisto).length
  function ir(v: string) {
    setVista(v as Vista); scrollTo(0, 0)
    if (v === 'avisos') { const t = Date.now(); setUltimoVisto(t); try { localStorage.setItem('avisosVistos', String(t)) } catch { /* sin almacenamiento */ } }
  }
  const pestanas: Pestana[] = [
    { id: 'inicio', nombre: 'Inicio', icono: 'inicio' },
    { id: 'horario', nombre: 'Horario', icono: 'horario' },
    { id: 'pagos', nombre: 'Pagos', icono: 'pagos' },
    ...(tiene('materiales') ? [{ id: 'material', nombre: 'Material', icono: 'materiales' }] : []),
    { id: 'avisos', nombre: 'Avisos', icono: 'avisos', punto: nuevos > 0 },
  ]
  const mes = isoMes(new Date())
  const estado = estadoPago(pagos.some((p) => p.mes === mes), mes, ajustes)

  return (
    <>
      <div className="app">
        <Encabezado subtitulo={yo?.nombre ?? usuario.displayName ?? 'Alumno'} derecha={botonTema} />
        <main>
          {vista === 'inicio' && <Inicio yo={yo} estado={estado} mes={mes} ajustes={ajustes} avisos={avisos.slice(0, 2)} nuevos={nuevos} onIr={ir} />}
          {vista === 'horario' && <Horario modo="alumno" ajustes={ajustes} yo={yo} fijos={fijos} />}
          {vista === 'pagos' && (
            <section className="pantalla">
              <h1>Mis pagos</h1>
              <BannerPago yo={yo} estado={estado} mes={mes} ajustes={ajustes} />
              {pagos.length === 0 && <Vacio>Todavía no hay pagos registrados.</Vacio>}
              <div className="lista">
                {pagos.map((p) => (
                  <div key={p.id} className="fila-item">
                    <div><b style={{ textTransform: 'capitalize' }}>{nombreMes(p.mes)}</b><small>{p.metodo}{p.fecha ? ` · ${p.fecha.toDate().toLocaleDateString('es-NI')}` : ''}</small></div>
                    <span className="pill p-verde">{dinero(p.monto, ajustes)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
          {vista === 'material' && <Materiales alumnoId={alumnoId} />}
          {vista === 'avisos' && <Avisos alumnoId={alumnoId} />}
          <div className="fila" style={{ justifyContent: 'center', marginTop: 24 }}>
            <button className="btn btn-borde btn-chico" onClick={salir}>Cerrar sesión</button>
          </div>
        </main>
      </div>
      <Barra pestanas={pestanas} actual={vista} onIr={ir} />
    </>
  )
}

type PropsBanner = { yo: TAlumno | null; estado: ReturnType<typeof estadoPago>; mes: string; ajustes: ReturnType<typeof useAjustes> }

function BannerPago({ yo, estado, mes, ajustes }: PropsBanner) {
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
  const urgente = ['por-vencer', 'vence-hoy', 'atrasado'].includes(estado)
  return (
    <div className={urgente ? (estado === 'atrasado' ? 'error' : 'aviso') : 'panel'} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="fila" style={{ justifyContent: 'space-between' }}><b>Pago del mes</b><span className={`pill ${pill}`}>{texto}</span></div>
      <p>{mensajes[estado]}</p>
      {urgente && ajustes.telefonoProfesor && (
        <a className="btn btn-whatsapp btn-chico" style={{ alignSelf: 'flex-start' }} target="_blank" rel="noreferrer"
          href={enlaceWhatsApp(ajustes.telefonoProfesor, `Hola, soy ${yo.nombre}. Ya realicé el pago de ${nombreMes(mes)} (${monto}).`)}>
          {ICONOS.whatsapp}Avisar que ya pagué
        </a>
      )}
    </div>
  )
}

function proximaClase(yo: TAlumno | null, mias: Reserva[]) {
  if (!yo) return null
  const ahora = new Date()
  const opciones: Date[] = []
  for (let i = 0; i < 8; i++) {
    const d = sumarDias(hoy(), i)
    for (const c of yo.clases ?? []) if (c.dia === d.getDay()) opciones.push(new Date(`${isoDia(d)}T${c.hora}`))
  }
  for (const r of mias) if (r.estado === 'aprobada') opciones.push(new Date(`${r.fecha}T${r.hora}`))
  return opciones.filter((d) => d > ahora).sort((a, b) => +a - +b)[0] ?? null
}

function Inicio({ yo, estado, mes, ajustes, avisos, nuevos, onIr }: PropsBanner & { avisos: ReturnType<typeof useAvisos>; nuevos: number; onIr: (v: string) => void }) {
  const desde = isoDia(hoy())
  const mias = useLista<Reserva>(yo ? query(col('reservas'), where('alumnoId', '==', yo.id)) : null, [yo?.id]) ?? []
  const proxima = proximaClase(yo, mias.filter((r) => r.fecha >= desde))
  const hh = proxima ? `${String(proxima.getHours()).padStart(2, '0')}:${String(proxima.getMinutes()).padStart(2, '0')}` : ''
  return (
    <section className="pantalla">
      <div><h1>Hola{yo ? `, ${yo.nombre.split(' ')[0]}` : ''} 👋</h1><p className="suave">{cliente.nombreApp}</p></div>
      <div className="panel destacado">
        <span className="etiqueta" style={{ color: 'rgba(255,255,255,.85)' }}>Tu próxima clase</span>
        <h2>{proxima ? `${fechaCorta(proxima)} · ${hora12(hh)}` : 'Sin clases agendadas'}</h2>
        {yo?.instrumento && <p className="suave">{yo.instrumento}{yo.nivel ? ` · ${yo.nivel}` : ''}</p>}
      </div>
      <BannerPago yo={yo} estado={estado} mes={mes} ajustes={ajustes} />
      {tiene('reservas') && <button className="btn btn-principal" onClick={() => onIr('horario')}>Reponer o pedir clase</button>}
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
