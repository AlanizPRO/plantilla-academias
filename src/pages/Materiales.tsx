import { addDoc, deleteDoc, doc, query, serverTimestamp, where } from 'firebase/firestore'
import { useState } from 'react'
import { Hoja, Vacio } from '../componentes'
import { col, isoMes, mensajeError, nombreMes, todos, useLista, type Alumno, type Material } from '../datos'
import { db } from '../firebase'
import { ICONOS } from '../iconos'
import { T } from '../textos'

export default function Materiales({ alumnos, alumnoId }: { alumnos?: Alumno[]; alumnoId?: string }) {
  const q = alumnoId ? query(col('materiales'), where('para', 'in', ['todos', alumnoId])) : todos('materiales')
  const lista = (useLista<Material>(q, [alumnoId]) ?? [])
    .sort((a, b) => (b.mes ?? '').localeCompare(a.mes ?? '') || (b.fecha?.toMillis() ?? 0) - (a.fecha?.toMillis() ?? 0))
  const [nuevo, setNuevo] = useState(false)
  const profesor = !alumnoId
  const meses = [...new Set(lista.map((m) => m.mes ?? ''))]
  const nombre = (id: string) => (id === 'todos' ? 'Todos' : alumnos?.find((a) => a.id === id)?.nombre ?? T.Persona)

  return (
    <section className="pantalla">
      <div className="top">
        <div><h1>Material</h1><p className="suave">{profesor ? 'Enlaces a tus archivos de Google Drive.' : 'Toca un material para abrirlo o descargarlo.'}</p></div>
        {profesor && <button className="btn btn-principal" onClick={() => setNuevo(true)}>+ Material</button>}
      </div>
      {lista.length === 0 && <Vacio>Todavía no hay material.</Vacio>}
      {meses.map((mes) => (
        <div key={mes} className="lista">
          <span className="etiqueta">{mes ? nombreMes(mes) : 'Sin mes'}</span>
          {lista.filter((m) => (m.mes ?? '') === mes).map((m) => (
            <div key={m.id} className="fila-item">
              <span className="ini" style={{ background: 'var(--principal)' }}>{ICONOS.materiales}</span>
              <div><b>{m.titulo}</b><small>{[m.nota, profesor ? `Para: ${nombre(m.para)}` : ''].filter(Boolean).join(' · ') || 'Google Drive'}</small></div>
              <a className="btn btn-acento btn-chico" href={m.enlace} target="_blank" rel="noreferrer">Abrir</a>
              {profesor && <button className="btn btn-rosa btn-chico" aria-label={`Borrar ${m.titulo}`} onClick={() => deleteDoc(doc(db, 'materiales', m.id))}>×</button>}
            </div>
          ))}
        </div>
      ))}
      {nuevo && alumnos && <HojaMaterial alumnos={alumnos} onCerrar={() => setNuevo(false)} />}
    </section>
  )
}

function HojaMaterial({ alumnos, onCerrar }: { alumnos: Alumno[]; onCerrar: () => void }) {
  const [titulo, setTitulo] = useState('')
  const [enlace, setEnlace] = useState('')
  const [nota, setNota] = useState('')
  const [mes, setMes] = useState(isoMes(new Date()))
  const [para, setPara] = useState('todos')
  const [error, setError] = useState('')
  async function guardar() {
    const url = enlace.trim()
    if (!titulo.trim() || !/^https?:\/\//.test(url)) { setError('Escribe un título y pega un enlace que empiece con https://'); return }
    try {
      await addDoc(col('materiales'), { titulo: titulo.trim(), enlace: url, nota: nota.trim(), mes, para, fecha: serverTimestamp() })
      onCerrar()
    } catch (e) { setError(mensajeError(e)) }
  }
  return (
    <Hoja titulo="Nuevo material" onCerrar={onCerrar}>
      <p className="aviso">En Google Drive: toca el archivo → <b>Compartir</b> → "Cualquier persona con el enlace" → <b>Copiar enlace</b>. Luego pégalo aquí.</p>
      <label className="campo" htmlFor="m-titulo">Título<input id="m-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. Escalas mayores (PDF)" /></label>
      <label className="campo" htmlFor="m-enlace">Enlace de Drive<input id="m-enlace" type="url" inputMode="url" value={enlace} onChange={(e) => setEnlace(e.target.value)} placeholder="https://drive.google.com/…" /></label>
      <div className="campos">
        <label className="campo" htmlFor="m-mes">Mes<input id="m-mes" type="month" value={mes} onChange={(e) => setMes(e.target.value)} /></label>
        <label className="campo" htmlFor="m-para">Para
          <select id="m-para" value={para} onChange={(e) => setPara(e.target.value)}>
            <option value="todos">Todos</option>
            {alumnos.filter((a) => a.activo).sort((a, b) => a.nombre.localeCompare(b.nombre)).map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </label>
      </div>
      <label className="campo" htmlFor="m-nota">Nota (opcional)<input id="m-nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej. Practicar 20 minutos diarios" /></label>
      {error && <p className="error">{error}</p>}
      <button className="btn btn-principal" onClick={guardar}>Guardar</button>
    </Hoja>
  )
}
