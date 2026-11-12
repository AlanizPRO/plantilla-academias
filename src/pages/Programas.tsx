import { addDoc, deleteDoc, doc, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { useState } from 'react'
import { Hoja, Progreso, Vacio } from '../componentes'
import { col, iniciales, mensajeError, periodoActual, todos, useLista, type Alumno, type Programa, type Tema } from '../datos'
import { db } from '../firebase'
import { ICONOS } from '../iconos'
import { T } from '../textos'

const ordenar = (a: Programa, b: Programa) => b.periodo.localeCompare(a.periodo)
const hechos = (p: Programa) => p.temas.filter((t) => t.hecho).length

// Programa de cada alumno por semestre: temas, piezas o metas, con avance. El alumno lo ve en su app.
export default function Programas({ alumnos, alumnoId }: { alumnos?: Alumno[]; alumnoId?: string }) {
  const q = alumnoId ? query(col('programas'), where('alumnoId', '==', alumnoId)) : todos('programas')
  const programas = (useLista<Programa>(q, [alumnoId]) ?? []).sort(ordenar)
  const [editar, setEditar] = useState<{ alumno: Alumno; programa?: Programa } | null>(null)
  const profesor = !alumnoId

  if (!profesor) return (
    <section className="pantalla">
      <div><h1>Mi {T.programa}</h1><p className="suave">{T.programaDescripcion}.</p></div>
      {programas.length === 0 && <Vacio>{T.Admin} todavía no ha cargado tu {T.programa}.</Vacio>}
      {programas.map((p) => <VistaPrograma key={p.id} p={p} />)}
    </section>
  )

  const activos = (alumnos ?? []).filter((a) => a.activo).sort((a, b) => a.nombre.localeCompare(b.nombre))
  return (
    <section className="pantalla">
      <div><h1>{T.Programa}s</h1><p className="suave">{T.programaDescripcion}, para cada {T.persona}.</p></div>
      {activos.length === 0 && <Vacio>Primero agrega a {T.tusPersonas}.</Vacio>}
      <div className="lista">
        {activos.map((a) => {
          const suyos = programas.filter((p) => p.alumnoId === a.id)
          const p = suyos[0]
          return (
            <div key={a.id} className="fila-item" style={{ flexWrap: 'wrap' }}>
              <span className="ini">{iniciales(a.nombre)}</span>
              <div style={{ minWidth: 140 }}>
                <b>{a.nombre}</b>
                <small>{p ? `${p.periodo} · ${hechos(p)} de ${p.temas.length}` : `Sin ${T.programa}`}</small>
                {p && <Progreso valor={hechos(p)} total={p.temas.length} />}
              </div>
              <div className="fila">
                {p && <button className="btn btn-borde btn-chico" onClick={() => setEditar({ alumno: a, programa: p })}>Abrir</button>}
                <button className="btn btn-principal btn-chico" onClick={() => setEditar({ alumno: a })}>{p ? 'Nuevo semestre' : `Crear ${T.programa}`}</button>
              </div>
            </div>
          )
        })}
      </div>
      {editar && <EditarPrograma alumno={editar.alumno} programa={editar.programa} anterior={programas.find((p) => p.alumnoId === editar.alumno.id)} onCerrar={() => setEditar(null)} />}
    </section>
  )
}

function VistaPrograma({ p }: { p: Programa }) {
  return (
    <div className="panel" style={{ gap: 8 }}>
      <div className="fila" style={{ justifyContent: 'space-between' }}><h3>{p.periodo}</h3><span className="pill p-verde">{hechos(p)} de {p.temas.length}</span></div>
      <Progreso valor={hechos(p)} total={p.temas.length} />
      <div className="lista">
        {p.temas.map((t, i) => <div key={i} className="fila"><span aria-hidden="true">{t.hecho ? '✅' : '⬜'}</span><span className={t.hecho ? 'hecha' : ''}>{t.texto}</span></div>)}
      </div>
      {p.nota && <p className="suave" style={{ whiteSpace: 'pre-wrap' }}>{p.nota}</p>}
      {p.enlace && <a className="btn btn-acento btn-chico" style={{ alignSelf: 'flex-start' }} href={p.enlace} target="_blank" rel="noreferrer">{ICONOS.enlace}Ver documento</a>}
    </div>
  )
}

function EditarPrograma({ alumno, programa, anterior, onCerrar }: { alumno: Alumno; programa?: Programa; anterior?: Programa; onCerrar: () => void }) {
  const [periodo, setPeriodo] = useState(programa?.periodo ?? periodoActual())
  const [temas, setTemas] = useState<Tema[]>(programa?.temas ?? [])
  const [nuevo, setNuevo] = useState('')
  const [nota, setNota] = useState(programa?.nota ?? '')
  const [enlace, setEnlace] = useState(programa?.enlace ?? '')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  function agregar() {
    // Se pueden pegar varios temas a la vez, uno por línea.
    const lineas = nuevo.split('\n').map((l) => l.replace(/^[-•*\d.)\s]+/, '').trim()).filter(Boolean)
    if (lineas.length) setTemas([...temas, ...lineas.map((texto) => ({ texto, hecho: false }))])
    setNuevo('')
  }
  async function guardar() {
    if (!periodo.trim()) { setError('Escribe el semestre o periodo.'); return }
    if (enlace.trim() && !/^https?:\/\//.test(enlace.trim())) { setError('El enlace debe empezar con https://'); return }
    setGuardando(true); setError('')
    const datos = { alumnoId: alumno.id, periodo: periodo.trim(), temas, nota: nota.trim(), enlace: enlace.trim(), actualizado: serverTimestamp() }
    try {
      if (programa) await updateDoc(doc(db, 'programas', programa.id), datos)
      else await addDoc(col('programas'), datos)
      onCerrar()
    } catch (e) { setError(mensajeError(e)); setGuardando(false) }
  }
  return (
    <Hoja titulo={`${T.Programa} de ${alumno.nombre.split(' ')[0]}`} onCerrar={onCerrar}>
      <label className="campo" htmlFor="pr-periodo">Semestre o periodo<input id="pr-periodo" value={periodo} onChange={(e) => setPeriodo(e.target.value)} placeholder="Ej. 2026 · II semestre" /></label>
      {temas.length > 0 && <Progreso valor={temas.filter((t) => t.hecho).length} total={temas.length} />}
      <div className="lista">
        {temas.map((t, i) => (
          <div key={i} className="fila-item">
            <label className="check" htmlFor={`tema-${i}`} style={{ flex: 1 }}>
              <input id={`tema-${i}`} type="checkbox" checked={t.hecho} onChange={(e) => setTemas(temas.map((x, j) => (j === i ? { ...x, hecho: e.target.checked } : x)))} />
              <span className={t.hecho ? 'hecha' : ''}>{t.texto}</span>
            </label>
            <button className="btn btn-rosa btn-chico" aria-label="Quitar" onClick={() => setTemas(temas.filter((_, j) => j !== i))}>×</button>
          </div>
        ))}
        {temas.length === 0 && !programa && anterior && anterior.temas.some((t) => !t.hecho) && (
          <button className="btn btn-borde btn-chico" style={{ alignSelf: 'flex-start' }} onClick={() => setTemas(anterior.temas.filter((t) => !t.hecho).map((t) => ({ texto: t.texto, hecho: false })))}>
            Traer lo que quedó pendiente de {anterior.periodo} ({anterior.temas.filter((t) => !t.hecho).length})
          </button>
        )}
      </div>
      <label className="campo" htmlFor="pr-nuevo">Agregar temas, piezas o metas (uno por línea)
        <textarea id="pr-nuevo" value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder={'Ej.\nEscalas mayores con dos manos\nMinueto en Sol – Bach\nLectura en clave de fa'} />
      </label>
      <button className="btn btn-acento btn-chico" style={{ alignSelf: 'flex-start' }} disabled={!nuevo.trim()} onClick={agregar}>+ Agregar</button>
      <label className="campo" htmlFor="pr-nota">Comentario para {T.laPersona} (opcional)<textarea id="pr-nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej. Meta: tocar en el recital de diciembre" /></label>
      <label className="campo" htmlFor="pr-enlace">Documento del {T.programa} en Drive (opcional)<input id="pr-enlace" type="url" inputMode="url" value={enlace} onChange={(e) => setEnlace(e.target.value)} placeholder="https://drive.google.com/…" /></label>
      {error && <p className="error">{error}</p>}
      <div className="fila">
        <button className="btn btn-principal" disabled={guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar'}</button>
        {programa && <button className="btn btn-rosa" onClick={() => confirm(`¿Borrar el ${T.programa} ${programa.periodo}?`) && deleteDoc(doc(db, 'programas', programa.id)).then(onCerrar).catch((e) => setError(mensajeError(e)))}>Borrar</button>}
      </div>
    </Hoja>
  )
}
