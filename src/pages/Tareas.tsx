import { addDoc, deleteDoc, doc, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { useState } from 'react'
import { Hoja, Vacio } from '../componentes'
import { col, deIso, enlaceWhatsApp, fechaCorta, hoy, isoDia, mensajeError, sumarDias, todos, useLista, type Alumno, type Tarea } from '../datos'
import { db } from '../firebase'
import { ICONOS } from '../iconos'
import { T } from '../textos'

export function useTareas(alumnoId?: string) {
  const q = alumnoId ? query(col('tareas'), where('para', 'in', ['todos', alumnoId])) : todos('tareas')
  return (useLista<Tarea>(q, [alumnoId]) ?? []).sort((a, b) => (a.entrega || '9999').localeCompare(b.entrega || '9999'))
}

// El profesor deja tareas (para todos o para uno); el alumno las marca como hechas.
export default function Tareas({ alumnos, alumnoId }: { alumnos?: Alumno[]; alumnoId?: string }) {
  const tareas = useTareas(alumnoId)
  const [nueva, setNueva] = useState(false)
  const [verHechas, setVerHechas] = useState(false)
  const [error, setError] = useState('')
  const profesor = !alumnoId
  const activos = (alumnos ?? []).filter((a) => a.activo)
  const nombre = (id: string) => (id === 'todos' ? 'Todos' : alumnos?.find((a) => a.id === id)?.nombre ?? T.Persona)
  const cuantos = (t: Tarea) => (t.para === 'todos' ? activos.length : 1)
  const hechasDe = (t: Tarea) => Object.values(t.hechas ?? {}).filter(Boolean).length
  const terminada = (t: Tarea) => (profesor ? hechasDe(t) >= cuantos(t) : !!t.hechas?.[alumnoId!])
  const lista = tareas.filter((t) => terminada(t) === verHechas)
  const hoyIso = isoDia(hoy())

  async function marcar(t: Tarea, hecha: boolean) {
    setError('')
    try { await updateDoc(doc(db, 'tareas', t.id), { [`hechas.${alumnoId}`]: hecha }) } catch (e) { setError(mensajeError(e)) }
  }

  return (
    <section className="pantalla">
      <div className="top">
        <div><h1>{T.Tareas}</h1><p className="suave">{profesor ? `Lo que ${T.tusPersonas} deben practicar.` : `Lo que te dejó ${T.tuAdmin}.`}</p></div>
        {profesor && <button className="btn btn-principal" onClick={() => setNueva(true)}>+ {T.Tarea}</button>}
      </div>
      <div className="tabs" role="tablist">
        <button className="tab" role="tab" aria-selected={!verHechas} onClick={() => setVerHechas(false)}>Pendientes</button>
        <button className="tab" role="tab" aria-selected={verHechas} onClick={() => setVerHechas(true)}>Hechas</button>
      </div>
      {error && <p className="error">{error}</p>}
      {lista.length === 0 && <Vacio>{verHechas ? 'Nada aquí todavía.' : `No hay ${T.tareas} pendientes. 🎶`}</Vacio>}
      <div className="lista">
        {lista.map((t) => {
          const vencida = !!t.entrega && t.entrega < hoyIso && !terminada(t)
          return (
            <div key={t.id} className="panel" style={{ gap: 6 }}>
              <div className="fila" style={{ justifyContent: 'space-between' }}>
                <h3 className={!profesor && terminada(t) ? 'hecha' : ''}>{t.titulo}</h3>
                {t.entrega && <span className={`pill ${vencida ? 'p-rosa' : 'p-gris'}`}>Para el {fechaCorta(deIso(t.entrega))}</span>}
              </div>
              {t.texto && <p style={{ whiteSpace: 'pre-wrap' }}>{t.texto}</p>}
              <div className="fila" style={{ justifyContent: 'space-between' }}>
                {t.enlace ? <a className="btn btn-acento btn-chico" href={t.enlace} target="_blank" rel="noreferrer">{ICONOS.enlace}Abrir material</a> : <span />}
                {profesor ? <>
                  <span className="pill p-gris">Para: {nombre(t.para)} · {hechasDe(t)}/{cuantos(t)} hecha{cuantos(t) > 1 ? 's' : ''}</span>
                  <button className="btn btn-rosa btn-chico" aria-label={`Borrar ${t.titulo}`} onClick={() => deleteDoc(doc(db, 'tareas', t.id))}>×</button>
                </> : (
                  <button className={`btn btn-chico ${terminada(t) ? 'btn-borde' : 'btn-principal'}`} onClick={() => marcar(t, !terminada(t))}>{terminada(t) ? 'Desmarcar' : '✓ Ya la hice'}</button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {nueva && alumnos && <HojaTarea alumnos={activos} onCerrar={() => setNueva(false)} />}
    </section>
  )
}

function HojaTarea({ alumnos, onCerrar }: { alumnos: Alumno[]; onCerrar: () => void }) {
  const [titulo, setTitulo] = useState('')
  const [texto, setTexto] = useState('')
  const [para, setPara] = useState('todos')
  const [entrega, setEntrega] = useState(isoDia(sumarDias(hoy(), 7)))
  const [enlace, setEnlace] = useState('')
  const [listo, setListo] = useState(false)
  const [error, setError] = useState('')
  const alumno = alumnos.find((a) => a.id === para)
  async function guardar() {
    if (!titulo.trim()) { setError('Escribe la tarea.'); return }
    if (enlace.trim() && !/^https?:\/\//.test(enlace.trim())) { setError('El enlace debe empezar con https://'); return }
    try {
      await addDoc(col('tareas'), { titulo: titulo.trim(), texto: texto.trim(), para, entrega, enlace: enlace.trim(), hechas: {}, fecha: serverTimestamp() })
      setListo(true)
    } catch (e) { setError(mensajeError(e)) }
  }
  if (listo) return (
    <Hoja titulo={`${T.Tarea} guardada`} onCerrar={onCerrar}>
      <p className="ok">{para === 'todos' ? `Todos ${T.tusPersonas}` : alumno?.nombre} la verán en su app.</p>
      {alumno?.telefono && <a className="btn btn-whatsapp" href={enlaceWhatsApp(alumno.telefono, `Tarea: ${titulo}\n${texto}${entrega ? `\nPara el ${fechaCorta(deIso(entrega))}` : ''}`)} target="_blank" rel="noreferrer">{ICONOS.whatsapp}Mandarla también por WhatsApp</a>}
      <button className="btn btn-borde" onClick={onCerrar}>Cerrar</button>
    </Hoja>
  )
  return (
    <Hoja titulo={`Nueva ${T.tarea}`} onCerrar={onCerrar}>
      <label className="campo" htmlFor="t-para">Para
        <select id="t-para" value={para} onChange={(e) => setPara(e.target.value)}>
          <option value="todos">Todos los {T.personas}</option>
          {alumnos.sort((a, b) => a.nombre.localeCompare(b.nombre)).map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
      </label>
      <label className="campo" htmlFor="t-titulo">{T.Tarea}<input id="t-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. Escala de Do mayor, 2 octavas" /></label>
      <label className="campo" htmlFor="t-texto">Indicaciones (opcional)<textarea id="t-texto" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ej. 15 minutos diarios, metrónomo a 80" /></label>
      <div className="campos">
        <label className="campo" htmlFor="t-entrega">Para cuándo<input id="t-entrega" type="date" value={entrega} onChange={(e) => setEntrega(e.target.value)} /></label>
        <label className="campo" htmlFor="t-enlace">Enlace de Drive o YouTube (opcional)<input id="t-enlace" type="url" inputMode="url" value={enlace} onChange={(e) => setEnlace(e.target.value)} placeholder="https://…" /></label>
      </div>
      {error && <p className="error">{error}</p>}
      <button className="btn btn-principal" onClick={guardar}>Guardar {T.tarea}</button>
    </Hoja>
  )
}
