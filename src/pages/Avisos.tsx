import { addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { useState } from 'react'
import { Hoja, Vacio } from '../componentes'
import { col, enlaceWhatsApp, mensajeError, useAvisos, type Alumno } from '../datos'
import { db } from '../firebase'
import { ICONOS } from '../iconos'


export default function Avisos({ alumnos, alumnoId }: { alumnos?: Alumno[]; alumnoId?: string }) {
  const avisos = useAvisos(alumnoId)
  const [nuevo, setNuevo] = useState(false)
  const profesor = !alumnoId
  const nombre = (id: string) => (id === 'todos' ? 'Todos' : alumnos?.find((a) => a.id === id)?.nombre ?? 'Alumno')
  return (
    <section className="pantalla">
      <div className="top">
        <div><h1>Avisos</h1><p className="suave">{profesor ? 'Mensajes que tus alumnos ven en la app.' : 'Mensajes de tu profesor.'}</p></div>
        {profesor && <button className="btn btn-principal" onClick={() => setNuevo(true)}>+ Aviso</button>}
      </div>
      {avisos.length === 0 && <Vacio>No hay avisos todavía.</Vacio>}
      <div className="lista">
        {avisos.map((a) => (
          <div key={a.id} className="panel" style={{ gap: 6 }}>
            <div className="fila" style={{ justifyContent: 'space-between' }}>
              <h3>{a.titulo}</h3>
              <small className="suave">{a.fecha?.toDate().toLocaleDateString('es-NI', { day: 'numeric', month: 'short' }) ?? 'ahora'}</small>
            </div>
            <p style={{ whiteSpace: 'pre-wrap' }}>{a.texto}</p>
            {profesor && (
              <div className="fila" style={{ justifyContent: 'space-between' }}>
                <span className="pill p-gris">Para: {nombre(a.para)}</span>
                <button className="btn btn-rosa btn-chico" onClick={() => deleteDoc(doc(db, 'avisos', a.id))}>Borrar</button>
              </div>
            )}
          </div>
        ))}
      </div>
      {nuevo && alumnos && <HojaAviso alumnos={alumnos} onCerrar={() => setNuevo(false)} />}
    </section>
  )
}

function HojaAviso({ alumnos, onCerrar }: { alumnos: Alumno[]; onCerrar: () => void }) {
  const [titulo, setTitulo] = useState('')
  const [texto, setTexto] = useState('')
  const [para, setPara] = useState('todos')
  const [listo, setListo] = useState(false)
  const [error, setError] = useState('')
  const alumno = alumnos.find((a) => a.id === para)
  async function enviar() {
    if (!titulo.trim() || !texto.trim()) { setError('Escribe el título y el mensaje.'); return }
    setError('')
    try {
      await addDoc(col('avisos'), { titulo: titulo.trim(), texto: texto.trim(), para, fecha: serverTimestamp() })
      setListo(true)
    } catch (e) { setError(mensajeError(e)) }
  }
  return (
    <Hoja titulo="Nuevo aviso" onCerrar={onCerrar}>
      {listo ? <>
        <p className="ok">Publicado. {para === 'todos' ? 'Todos tus alumnos' : alumno?.nombre} lo verán al abrir la app.</p>
        {alumno?.telefono && <a className="btn btn-whatsapp" href={enlaceWhatsApp(alumno.telefono, `${titulo}\n${texto}`)} target="_blank" rel="noreferrer">{ICONOS.whatsapp}Mandarlo también por WhatsApp</a>}
        <button className="btn btn-borde" onClick={onCerrar}>Cerrar</button>
      </> : <>
        <label className="campo" htmlFor="av-para">Para
          <select id="av-para" value={para} onChange={(e) => setPara(e.target.value)}>
            <option value="todos">Todos los alumnos</option>
            {alumnos.filter((a) => a.activo).sort((a, b) => a.nombre.localeCompare(b.nombre)).map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </label>
        <label className="campo" htmlFor="av-titulo">Título<input id="av-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. No hay clases el viernes" /></label>
        <label className="campo" htmlFor="av-texto">Mensaje<textarea id="av-texto" value={texto} onChange={(e) => setTexto(e.target.value)} /></label>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-principal" onClick={enviar}>Publicar aviso</button>
      </>}
    </Hoja>
  )
}
