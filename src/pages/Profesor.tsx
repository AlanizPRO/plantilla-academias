import type { User } from 'firebase/auth'
import { query, where } from 'firebase/firestore'
import { useState, type ReactNode } from 'react'
import { tiene } from '../cliente'
import { Barra, Encabezado, type Pestana } from '../componentes'
import {
  col, cuotaDe, DIAS, dinero, hora12, hoy, isoDia, isoMes, nombreMes, todos, useAjustes, useAjustesConEstado, useLista,
  type Alumno as TAlumno, type Pago, type Reserva,
} from '../datos'
import { ICONOS } from '../iconos'
import { salir } from '../sesion'
import Ajustes from './Ajustes'
import Alumnos from './Alumnos'
import Avisos from './Avisos'
import Horario from './Horario'
import Materiales from './Materiales'
import Pagos from './Pagos'

type Vista = 'inicio' | 'alumnos' | 'horario' | 'pagos' | 'mas' | 'avisos' | 'materiales' | 'ajustes'

export default function Profesor({ usuario, botonTema }: { usuario: User; botonTema: ReactNode }) {
  const [vista, setVista] = useState<Vista>('inicio')
  const [ajustes, ajustesCargados] = useAjustesConEstado()
  const alumnos = useLista<TAlumno>(todos('alumnos')) ?? []
  const desde = isoDia(hoy())
  const pendientes = (useLista<Reserva>(query(col('reservas'), where('estado', '==', 'pendiente')), []) ?? []).filter((r) => r.fecha >= desde)

  const ir = (v: string) => { setVista(v as Vista); scrollTo(0, 0) }
  const pestanas: Pestana[] = [
    { id: 'inicio', nombre: 'Inicio', icono: 'inicio' },
    { id: 'alumnos', nombre: 'Alumnos', icono: 'alumnos' },
    { id: 'horario', nombre: 'Horario', icono: 'horario', punto: pendientes.length > 0 },
    { id: 'pagos', nombre: 'Pagos', icono: 'pagos' },
    { id: 'mas', nombre: 'Más', icono: 'mas' },
  ]
  const actual = ['avisos', 'materiales', 'ajustes'].includes(vista) ? 'mas' : vista

  return (
    <>
      <div className="app">
        <Encabezado subtitulo="Profesor" derecha={botonTema} />
        <main>
          {vista === 'inicio' && <Inicio alumnos={alumnos} pendientes={pendientes.length} onIr={ir} nombre={usuario.displayName ?? ''} />}
          {vista === 'alumnos' && <Alumnos alumnos={alumnos} ajustes={ajustes} />}
          {vista === 'horario' && <Horario modo="profesor" ajustes={ajustes} alumnos={alumnos} />}
          {vista === 'pagos' && <Pagos alumnos={alumnos} ajustes={ajustes} />}
          {vista === 'avisos' && <Avisos alumnos={alumnos} />}
          {vista === 'materiales' && <Materiales alumnos={alumnos} />}
          {vista === 'ajustes' && <Ajustes key={ajustesCargados ? 'cargado' : 'inicial'} ajustes={ajustes} correo={usuario.email ?? ''} onSalir={salir} />}
          {vista === 'mas' && (
            <section className="pantalla">
              <h1>Más</h1>
              <div className="lista">
                <Opcion icono="avisos" titulo="Avisos" texto="Mensajes para tus alumnos" onClick={() => ir('avisos')} />
                {tiene('materiales') && <Opcion icono="materiales" titulo="Material de estudio" texto="Partituras, audios y videos de Drive" onClick={() => ir('materiales')} />}
                <Opcion icono="ajustes" titulo="Ajustes" texto="Cuota, día de pago y horario disponible" onClick={() => ir('ajustes')} />
              </div>
            </section>
          )}
        </main>
      </div>
      <Barra pestanas={pestanas} actual={actual} onIr={ir} />
    </>
  )
}

function Opcion({ icono, titulo, texto, onClick }: { icono: string; titulo: string; texto: string; onClick: () => void }) {
  return (
    <button className="fila-item" onClick={onClick}>
      <span className="ini" style={{ background: 'var(--principal)' }}>{ICONOS[icono]}</span>
      <div><b>{titulo}</b><small>{texto}</small></div>
      <span aria-hidden="true">›</span>
    </button>
  )
}

function Inicio({ alumnos, pendientes, onIr, nombre }: { alumnos: TAlumno[]; pendientes: number; onIr: (v: string) => void; nombre: string }) {
  const ajustes = useAjustes()
  const mes = isoMes(new Date())
  const hoyIso = isoDia(hoy())
  const pagos = useLista<Pago>(query(col('pagos'), where('mes', '==', mes)), [mes]) ?? []
  const reservasHoy = (useLista<Reserva>(query(col('reservas'), where('fecha', '==', hoyIso)), [hoyIso]) ?? []).filter((r) => r.estado === 'aprobada')
  const activos = alumnos.filter((a) => a.activo)
  const deben = activos.filter((a) => !pagos.some((p) => p.alumnoId === a.id))
  const dia = new Date().getDay()
  const clasesHoy = [
    ...activos.flatMap((a) => (a.clases ?? []).filter((c) => c.dia === dia).map((c) => ({ hora: c.hora, nombre: a.nombre, extra: false }))),
    ...reservasHoy.map((r) => ({ hora: r.hora, nombre: alumnos.find((a) => a.id === r.alumnoId)?.nombre ?? 'Alumno', extra: true })),
  ].sort((a, b) => a.hora.localeCompare(b.hora))

  return (
    <section className="pantalla">
      <div><h1>Hola{nombre ? `, ${nombre.split(' ')[0]}` : ''}</h1><p className="suave">{DIAS[dia]} · {nombreMes(mes)}</p></div>
      <div className="stats">
        <button className="stat" onClick={() => onIr('alumnos')} style={{ textAlign: 'left' }}><b>{activos.length}</b><span>Alumnos</span></button>
        <button className="stat" onClick={() => onIr('pagos')} style={{ textAlign: 'left' }}><b>{deben.length}</b><span>Deben este mes</span></button>
        <button className="stat" onClick={() => onIr('horario')} style={{ textAlign: 'left' }}><b>{pendientes}</b><span>Por aprobar</span></button>
      </div>
      {pendientes > 0 && <button className="aviso" style={{ border: 0, textAlign: 'left' }} onClick={() => onIr('horario')}>Tienes {pendientes} solicitud{pendientes > 1 ? 'es' : ''} de clase por aprobar →</button>}
      <div className="panel">
        <h3>Clases de hoy</h3>
        {clasesHoy.length === 0 && <p className="suave">No hay clases hoy.</p>}
        <div className="lista">
          {clasesHoy.map((c, i) => (
            <div key={i} className="fila-item"><b style={{ minWidth: 80 }}>{hora12(c.hora)}</b><div><b>{c.nombre}</b></div>{c.extra && <span className="pill p-amarillo">Extra</span>}</div>
          ))}
        </div>
      </div>
      {deben.length > 0 && (
        <div className="panel">
          <h3>Por cobrar en {nombreMes(mes).split(' ')[0]}</h3>
          <p><b>{dinero(deben.reduce((s, a) => s + cuotaDe(a, ajustes), 0), ajustes)}</b> de {deben.length} alumno{deben.length > 1 ? 's' : ''}.</p>
          <button className="btn btn-principal" onClick={() => onIr('pagos')}>Ver y recordar por WhatsApp</button>
        </div>
      )}
      {alumnos.length === 0 && (
        <div className="panel destacado">
          <h3>Primeros pasos</h3>
          <p className="suave">1. Revisa tu cuota y tu horario en Ajustes. 2. Agrega a tus alumnos. 3. Invita a cada uno a la app con su enlace.</p>
          <div className="fila"><button className="btn" style={{ background: '#fff', color: 'var(--principal)' }} onClick={() => onIr('ajustes')}>Ajustes</button>
            <button className="btn" style={{ background: '#fff', color: 'var(--principal)' }} onClick={() => onIr('alumnos')}>Agregar alumnos</button></div>
        </div>
      )}
    </section>
  )
}
