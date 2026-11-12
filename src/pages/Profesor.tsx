import type { User } from 'firebase/auth'
import { query, where } from 'firebase/firestore'
import { useState, type ReactNode } from 'react'
import { tiene } from '../cliente'
import { T } from '../textos'
import { Barra, Encabezado, type Pestana } from '../componentes'
import {
  col, cuotaDe, DIAS, dinero, hora12, hoy, isoDia, isoMes, nombreMes, todos, useAjustes, useAjustesConEstado, useLista,
  sinClase, type Alumno as TAlumno, type Pago, type Reserva,
} from '../datos'
import { ICONOS } from '../iconos'
import { salir } from '../sesion'
import Ajustes from './Ajustes'
import Alumnos from './Alumnos'
import Avisos from './Avisos'
import Horario from './Horario'
import Materiales from './Materiales'
import Calendario, { useFechas } from './Calendario'
import Pagos, { usePorConfirmar } from './Pagos'
import Programas from './Programas'
import Tareas from './Tareas'

type Vista = 'inicio' | 'alumnos' | 'horario' | 'pagos' | 'mas' | 'avisos' | 'materiales' | 'ajustes' | 'tareas' | 'programas' | 'calendario'

export default function Profesor({ usuario, botonTema }: { usuario: User; botonTema: ReactNode }) {
  const [vista, setVista] = useState<Vista>('inicio')
  const [ajustes, ajustesCargados] = useAjustesConEstado()
  const alumnos = useLista<TAlumno>(todos('alumnos')) ?? []
  const desde = isoDia(hoy())
  const porConfirmar = usePorConfirmar()
  const pendientes = (useLista<Reserva>(query(col('reservas'), where('estado', '==', 'pendiente')), []) ?? []).filter((r) => r.fecha >= desde)

  const ir = (v: string) => { setVista(v as Vista); scrollTo(0, 0) }
  const pestanas: Pestana[] = [
    { id: 'inicio', nombre: 'Inicio', icono: 'inicio' },
    { id: 'alumnos', nombre: T.Personas, icono: 'alumnos' },
    ...(tiene('horarios') ? [{ id: 'horario', nombre: 'Horario', icono: 'horario', punto: pendientes.length > 0 }] : []),
    ...(tiene('pagos') ? [{ id: 'pagos', nombre: 'Pagos', icono: 'pagos', punto: porConfirmar.length > 0 }] : []),
    { id: 'mas', nombre: 'Más', icono: 'mas' },
  ]
  const actual = ['avisos', 'materiales', 'ajustes', 'tareas', 'programas', 'calendario'].includes(vista) ? 'mas' : vista

  return (
    <>
      <div className="app">
        <Encabezado subtitulo={T.Admin} derecha={botonTema} />
        <main>
          {vista === 'inicio' && <Inicio alumnos={alumnos} pendientes={pendientes.length} porConfirmar={porConfirmar.length} onIr={ir} nombre={usuario.displayName ?? ''} />}
          {vista === 'alumnos' && <Alumnos alumnos={alumnos} ajustes={ajustes} />}
          {vista === 'horario' && <Horario modo="profesor" ajustes={ajustes} alumnos={alumnos} />}
          {vista === 'pagos' && <Pagos alumnos={alumnos} ajustes={ajustes} />}
          {vista === 'avisos' && <Avisos alumnos={alumnos} />}
          {vista === 'materiales' && <Materiales alumnos={alumnos} />}
          {vista === 'tareas' && <Tareas alumnos={alumnos} />}
          {vista === 'programas' && <Programas alumnos={alumnos} />}
          {vista === 'calendario' && <Calendario profesor />}
          {vista === 'ajustes' && <Ajustes key={ajustesCargados ? 'cargado' : 'inicial'} ajustes={ajustes} correo={usuario.email ?? ''} onSalir={salir} />}
          {vista === 'mas' && (
            <section className="pantalla">
              <h1>Más</h1>
              <div className="lista">
                {tiene('avisos') && <Opcion icono="avisos" titulo="Avisos" texto={`Mensajes para ${T.tusPersonas}`} onClick={() => ir('avisos')} />}
                {tiene('tareas') && <Opcion icono="tareas" titulo={T.Tareas} texto={`Lo que ${T.tusPersonas} deben practicar`} onClick={() => ir('tareas')} />}
                {tiene('programas') && <Opcion icono="programa" titulo={`${T.Programa}s del semestre`} texto={`${T.programaDescripcion}, con avance`} onClick={() => ir('programas')} />}
                {tiene('calendario') && <Opcion icono="calendario" titulo="Calendario" texto={`Feriados, días sin ${T.clases} y actividades`} onClick={() => ir('calendario')} />}
                {tiene('materiales') && <Opcion icono="materiales" titulo={T.material} texto={T.materialDescripcion} onClick={() => ir('materiales')} />}
                <Opcion icono="ajustes" titulo="Ajustes" texto="Cuota, cuentas, recordatorio y horario" onClick={() => ir('ajustes')} />
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

function Inicio({ alumnos, pendientes, porConfirmar, onIr, nombre }: { alumnos: TAlumno[]; pendientes: number; porConfirmar: number; onIr: (v: string) => void; nombre: string }) {
  const fechas = useFechas()
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
    ...reservasHoy.map((r) => ({ hora: r.hora, nombre: alumnos.find((a) => a.id === r.alumnoId)?.nombre ?? T.Persona, extra: true })),
  ].sort((a, b) => a.hora.localeCompare(b.hora))

  return (
    <section className="pantalla">
      <div><h1>Hola{nombre ? `, ${nombre.split(' ')[0]}` : ''}</h1><p className="suave">{DIAS[dia]} · {nombreMes(mes)}</p></div>
      <div className="stats">
        <button className="stat" onClick={() => onIr('alumnos')} style={{ textAlign: 'left' }}><b>{activos.length}</b><span>{T.Personas}</span></button>
        {tiene('pagos') && <button className="stat" onClick={() => onIr('pagos')} style={{ textAlign: 'left' }}><b>{deben.length}</b><span>Deben este mes</span></button>}
        {tiene('reservas') && <button className="stat" onClick={() => onIr('horario')} style={{ textAlign: 'left' }}><b>{pendientes}</b><span>Por aprobar</span></button>}
      </div>
      {porConfirmar > 0 && <button className="aviso" style={{ border: 0, textAlign: 'left' }} onClick={() => onIr('pagos')}>💵 {porConfirmar} pago{porConfirmar > 1 ? 's' : ''} por confirmar (te avisaron con comprobante) →</button>}
      {pendientes > 0 && <button className="aviso" style={{ border: 0, textAlign: 'left' }} onClick={() => onIr('horario')}>Tienes {pendientes} solicitud{pendientes > 1 ? 'es' : ''} de {T.clase} por aprobar →</button>}
      {tiene('horarios') && <div className="panel">
        <h3>{T.Clases} de hoy</h3>
        {sinClase(fechas, hoyIso) && <p className="aviso">Hoy no hay {T.clases}: {fechas.find((f) => f.tipo !== 'evento' && hoyIso >= f.fecha && hoyIso <= (f.hasta || f.fecha))?.titulo}.</p>}
        {clasesHoy.length === 0 && <p className="suave">No hay {T.clases} hoy.</p>}
        <div className="lista">
          {clasesHoy.map((c, i) => (
            <div key={i} className="fila-item"><b style={{ minWidth: 80 }}>{hora12(c.hora)}</b><div><b>{c.nombre}</b></div>{c.extra && <span className="pill p-amarillo">Extra</span>}</div>
          ))}
        </div>
      </div>}
      {tiene('pagos') && deben.length > 0 && (
        <div className="panel">
          <h3>Por cobrar en {nombreMes(mes).split(' ')[0]}</h3>
          <p><b>{dinero(deben.reduce((s, a) => s + cuotaDe(a, ajustes), 0), ajustes)}</b> de {deben.length} {deben.length > 1 ? T.personas : T.persona}.</p>
          <button className="btn btn-principal" onClick={() => onIr('pagos')}>Ver y recordar por WhatsApp</button>
        </div>
      )}
      {alumnos.length === 0 && (
        <div className="panel destacado">
          <h3>Primeros pasos</h3>
          <p className="suave">1. Revisa tu cuota y tu horario en Ajustes. 2. Agrega a {T.tusPersonas}. 3. Invita a cada uno a la app con su enlace.</p>
          <div className="fila"><button className="btn" style={{ background: '#fff', color: 'var(--principal)' }} onClick={() => onIr('ajustes')}>Ajustes</button>
            <button className="btn" style={{ background: '#fff', color: 'var(--principal)' }} onClick={() => onIr('alumnos')}>Agregar {T.personas}</button></div>
        </div>
      )}
    </section>
  )
}
