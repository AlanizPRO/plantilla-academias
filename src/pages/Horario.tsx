import { addDoc, deleteDoc, doc, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { useMemo, useState } from 'react'
import { tiene } from '../cliente'
import { Hoja } from '../componentes'
import {
  col, DIAS, enlaceWhatsApp, fechaCorta, hora12, horasDelDia, hoy, isoDia, mensajeError, sumarDias, useLista,
  type Ajustes, type Alumno, type Clase, type Reserva,
} from '../datos'
import { db } from '../firebase'
import { ICONOS } from '../iconos'

type Props =
  | { modo: 'profesor'; ajustes: Ajustes; alumnos: Alumno[] }
  | { modo: 'alumno'; ajustes: Ajustes; yo: Alumno | null; fijos: Clase[] }

type Casilla = { hora: string; tipo: 'libre' | 'fija' | 'reserva' | 'pasada'; nombres: string[]; reserva?: Reserva; mia?: boolean }

const TIPOS = { reposicion: 'Reposición', extra: 'Clase extra' }

export default function Horario(props: Props) {
  const { ajustes, modo } = props
  const [fecha, setFecha] = useState(isoDia(hoy()))
  const [elegida, setElegida] = useState<Casilla | null>(null)
  const desde = isoDia(hoy())
  const reservas = useLista<Reserva>(query(col('reservas'), where('fecha', '>=', desde)), [desde]) ?? []
  const dias = useMemo(() => Array.from({ length: 14 }, (_, i) => sumarDias(hoy(), i)), [])

  const alumnos = modo === 'profesor' ? props.alumnos : []
  const yo = modo === 'alumno' ? props.yo : null
  const nombreDe = (id: string) => alumnos.find((a) => a.id === id)?.nombre ?? 'Alumno'

  const d = new Date(`${fecha}T00:00`)
  const dia = d.getDay()
  const ahora = new Date()
  const casillas: Casilla[] = useMemo(() => {
    const fijosDelDia = modo === 'profesor'
      ? alumnos.filter((a) => a.activo).flatMap((a) => (a.clases ?? []).filter((c) => c.dia === dia).map((c) => ({ hora: c.hora, nombre: a.nombre, id: a.id })))
      : props.fijos.filter((c) => c.dia === dia).map((c) => ({ hora: c.hora, nombre: '', id: '' }))
    const misFijas = (yo?.clases ?? []).filter((c) => c.dia === dia).map((c) => c.hora)
    const resDelDia = reservas.filter((r) => r.fecha === fecha && r.estado !== 'rechazada')
    const horas = [...new Set([...horasDelDia(ajustes.disponibilidad, dia, ajustes.duracion), ...fijosDelDia.map((f) => f.hora), ...resDelDia.map((r) => r.hora)])].sort()
    return horas.map((hora) => {
      const fijas = fijosDelDia.filter((f) => f.hora === hora)
      const res = resDelDia.find((r) => r.hora === hora)
      if (fijas.length) return { hora, tipo: 'fija', nombres: fijas.map((f) => f.nombre), mia: misFijas.includes(hora) }
      if (res) return { hora, tipo: 'reserva', nombres: [nombreDe(res.alumnoId)], reserva: res, mia: !!yo && res.alumnoId === yo.id }
      const pasada = fecha === isoDia(ahora) && new Date(`${fecha}T${hora}`) < ahora
      return { hora, tipo: pasada ? 'pasada' : 'libre', nombres: [] }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha, reservas, alumnos, yo, ajustes, modo === 'alumno' ? props.fijos : null])

  const pendientes = modo === 'profesor' ? reservas.filter((r) => r.estado === 'pendiente') : []
  const mias = yo ? reservas.filter((r) => r.alumnoId === yo.id) : []

  return (
    <section className="pantalla">
      <div><h1>Horario</h1><p className="suave">{modo === 'profesor' ? 'Toca una hora para agendar o revisar una clase.' : tiene('reservas') ? 'Las horas en verde están libres. Toca una para pedir clase.' : 'Así está la semana del profesor.'}</p></div>

      {pendientes.length > 0 && (
        <div className="panel">
          <h3>Solicitudes por aprobar ({pendientes.length})</h3>
          <div className="lista">
            {pendientes.map((r) => (
              <button key={r.id} className="fila-item" onClick={() => setElegida({ hora: r.hora, tipo: 'reserva', nombres: [nombreDe(r.alumnoId)], reserva: r })}>
                <div><b>{nombreDe(r.alumnoId)}</b><small>{fechaCorta(new Date(`${r.fecha}T00:00`))} · {hora12(r.hora)} · {TIPOS[r.tipo]}</small></div>
                <span className="pill p-amarillo">Revisar</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="dias" role="group" aria-label="Día">
        {dias.map((x) => (
          <button key={isoDia(x)} className="dia" aria-pressed={isoDia(x) === fecha} onClick={() => setFecha(isoDia(x))}>
            <small>{DIAS[x.getDay()].slice(0, 3)}</small>{x.getDate()}
          </button>
        ))}
      </div>

      <div className="panel">
        <h3>{DIAS[dia]} {d.getDate()}</h3>
        {casillas.length === 0 && <p className="suave">No hay clases este día.</p>}
        <div className="horas">
          {casillas.map((c) => <CasillaHora key={c.hora} c={c} modo={modo} onTocar={() => setElegida(c)} />)}
        </div>
      </div>

      {mias.length > 0 && (
        <div className="panel">
          <h3>Mis solicitudes</h3>
          <div className="lista">
            {mias.map((r) => (
              <div key={r.id} className="fila-item">
                <div><b>{fechaCorta(new Date(`${r.fecha}T00:00`))} · {hora12(r.hora)}</b><small>{TIPOS[r.tipo]}</small></div>
                <span className={`pill ${r.estado === 'aprobada' ? 'p-verde' : r.estado === 'rechazada' ? 'p-rosa' : 'p-amarillo'}`}>
                  {r.estado === 'aprobada' ? 'Aprobada' : r.estado === 'rechazada' ? 'No se pudo' : 'Esperando'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {elegida && modo === 'profesor' && (
        <HojaProfesor c={elegida} fecha={fecha} alumnos={alumnos} onCerrar={() => setElegida(null)} />
      )}
      {elegida && modo === 'alumno' && yo && (
        <HojaAlumno c={elegida} fecha={fecha} yo={yo} onCerrar={() => setElegida(null)} />
      )}
    </section>
  )
}

function CasillaHora({ c, modo, onTocar }: { c: Casilla; modo: 'profesor' | 'alumno'; onTocar: () => void }) {
  let clase = 'hora', texto = ''
  if (c.tipo === 'libre') { clase += ' libre'; texto = 'Libre' }
  else if (c.tipo === 'pasada') { clase += ' ocupada'; texto = 'Ya pasó' }
  else if (c.mia) { clase += ' mia'; texto = c.tipo === 'fija' ? 'Tu clase' : c.reserva?.estado === 'pendiente' ? 'Tu solicitud' : 'Tu clase extra' }
  else if (modo === 'profesor') {
    clase += c.reserva?.estado === 'pendiente' ? ' pendiente' : ' ocupada'
    texto = `${c.nombres.join(', ')}${c.reserva ? ` · ${c.reserva.estado === 'pendiente' ? 'por aprobar' : TIPOS[c.reserva.tipo].toLowerCase()}` : ''}`
  } else { clase += ' ocupada'; texto = 'Ocupado' }
  const tocable = modo === 'profesor' ? c.tipo !== 'pasada' && !(c.tipo === 'fija') : c.tipo === 'libre' && tiene('reservas')
  return (
    <button className={clase} onClick={tocable ? onTocar : undefined} disabled={!tocable} style={{ cursor: tocable ? 'pointer' : 'default', opacity: 1 }}>
      <b>{hora12(c.hora)}</b><small>{texto}</small>
    </button>
  )
}

function HojaAlumno({ c, fecha, yo, onCerrar }: { c: Casilla; fecha: string; yo: Alumno; onCerrar: () => void }) {
  const [tipo, setTipo] = useState<'reposicion' | 'extra'>('reposicion')
  const [nota, setNota] = useState('')
  const [estado, setEstado] = useState<'' | 'enviando' | 'listo'>('')
  const [error, setError] = useState('')
  async function pedir() {
    setEstado('enviando'); setError('')
    try {
      await addDoc(col('reservas'), { alumnoId: yo.id, fecha, hora: c.hora, tipo, nota: nota.trim(), estado: 'pendiente', creada: serverTimestamp() })
      setEstado('listo')
    } catch (e) { setError(mensajeError(e)); setEstado('') }
  }
  return (
    <Hoja titulo="Pedir clase" onCerrar={onCerrar}>
      <p><b>{fechaCorta(new Date(`${fecha}T00:00`))} · {hora12(c.hora)}</b></p>
      {estado === 'listo' ? <>
        <p className="ok">Listo. Tu profesor la tiene que aprobar; la verás en "Mis solicitudes".</p>
        <button className="btn btn-principal" onClick={onCerrar}>Entendido</button>
      </> : <>
        <div className="tabs" role="tablist">
          {(['reposicion', 'extra'] as const).map((t) => <button key={t} className="tab" role="tab" aria-selected={tipo === t} onClick={() => setTipo(t)}>{TIPOS[t]}</button>)}
        </div>
        <p className="suave chico">{tipo === 'reposicion' ? 'Para recuperar una clase que perdiste.' : 'Una clase adicional a la de siempre.'}</p>
        <label className="campo" htmlFor="nota-res">Nota para el profesor (opcional)
          <textarea id="nota-res" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej. Falté el martes por enfermedad" />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-principal" disabled={estado === 'enviando'} onClick={pedir}>{estado === 'enviando' ? 'Enviando…' : 'Pedir esta hora'}</button>
      </>}
    </Hoja>
  )
}

function HojaProfesor({ c, fecha, alumnos, onCerrar }: { c: Casilla; fecha: string; alumnos: Alumno[]; onCerrar: () => void }) {
  const [alumnoId, setAlumnoId] = useState('')
  const [tipo, setTipo] = useState<'reposicion' | 'extra'>('extra')
  const [error, setError] = useState('')
  const r = c.reserva
  const alumno = r ? alumnos.find((a) => a.id === r.alumnoId) : undefined
  const cuando = `${fechaCorta(new Date(`${(r?.fecha ?? fecha)}T00:00`))} a las ${hora12(c.hora)}`

  async function hacer(accion: () => Promise<unknown>) {
    setError('')
    try { await accion(); onCerrar() } catch (e) { setError(mensajeError(e)) }
  }

  if (!r) {
    const activos = alumnos.filter((a) => a.activo)
    return (
      <Hoja titulo="Agendar clase" onCerrar={onCerrar}>
        <p><b>{cuando}</b></p>
        <label className="campo" htmlFor="alumno-res">Alumno
          <select id="alumno-res" value={alumnoId} onChange={(e) => setAlumnoId(e.target.value)}>
            <option value="">Elige un alumno</option>
            {activos.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </label>
        <div className="tabs" role="tablist">
          {(['extra', 'reposicion'] as const).map((t) => <button key={t} className="tab" role="tab" aria-selected={tipo === t} onClick={() => setTipo(t)}>{TIPOS[t]}</button>)}
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-principal" disabled={!alumnoId} onClick={() => hacer(() =>
          addDoc(col('reservas'), { alumnoId, fecha, hora: c.hora, tipo, nota: '', estado: 'aprobada', creada: serverTimestamp() }))}>Agendar</button>
      </Hoja>
    )
  }
  const textoWa = (ok: boolean) => ok
    ? `Hola ${alumno?.nombre.split(' ')[0] ?? ''}, tu clase del ${cuando} quedó confirmada. ¡Nos vemos!`
    : `Hola ${alumno?.nombre.split(' ')[0] ?? ''}, no puedo darte la clase del ${cuando}. Escoge otra hora en la app, por favor.`
  return (
    <Hoja titulo={r.estado === 'pendiente' ? 'Solicitud de clase' : 'Clase agendada'} onCerrar={onCerrar}>
      <p><b>{alumno?.nombre ?? 'Alumno'}</b></p>
      <p className="suave">{cuando} · {TIPOS[r.tipo]}</p>
      {r.nota && <p className="aviso">"{r.nota}"</p>}
      {error && <p className="error">{error}</p>}
      {r.estado === 'pendiente' ? (
        <div className="fila">
          <button className="btn btn-principal" onClick={() => hacer(() => updateDoc(doc(db, 'reservas', r.id), { estado: 'aprobada' }))}>Aprobar</button>
          <button className="btn btn-rosa" onClick={() => hacer(() => updateDoc(doc(db, 'reservas', r.id), { estado: 'rechazada' }))}>No puedo</button>
        </div>
      ) : (
        <button className="btn btn-rosa" onClick={() => hacer(() => deleteDoc(doc(db, 'reservas', r.id)))}>Cancelar esta clase</button>
      )}
      {alumno?.telefono && (
        <div className="fila">
          <a className="btn btn-whatsapp btn-chico" href={enlaceWhatsApp(alumno.telefono, textoWa(true))} target="_blank" rel="noreferrer">{ICONOS.whatsapp}Avisar: confirmada</a>
          <a className="btn btn-borde btn-chico" href={enlaceWhatsApp(alumno.telefono, textoWa(false))} target="_blank" rel="noreferrer">{ICONOS.whatsapp}Avisar: no puedo</a>
        </div>
      )}
    </Hoja>
  )
}
