import { addDoc, deleteDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { useState } from 'react'
import { Hoja, Vacio } from '../componentes'
import {
  col, feriadosNicaragua, hoy, isoDia, mensajeError, rangoFecha, TEXTO_FECHA, todos, useLista, type Fecha, type TipoFecha,
} from '../datos'
import { db } from '../firebase'
import { T } from '../textos'

export const useFechas = () => (useLista<Fecha>(todos('fechas')) ?? []).sort((a, b) => a.fecha.localeCompare(b.fecha))

// Feriados, días sin clases y actividades (recitales, exámenes). El alumno lo ve en su app.
export default function Calendario({ profesor }: { profesor?: boolean }) {
  const fechas = useFechas()
  const [nueva, setNueva] = useState(false)
  const [pasadas, setPasadas] = useState(false)
  const [estado, setEstado] = useState('')
  const desde = isoDia(hoy())
  const lista = fechas.filter((f) => (pasadas ? (f.hasta || f.fecha) < desde : (f.hasta || f.fecha) >= desde))
  if (pasadas) lista.reverse()
  const anio = new Date().getFullYear()

  async function cargarFeriados(a: number) {
    setEstado('')
    const ya = new Set(fechas.map((f) => `${f.fecha}|${f.titulo}`))
    const nuevos = feriadosNicaragua(a).filter((f) => !ya.has(`${f.fecha}|${f.titulo}`))
    if (nuevos.length === 0) { setEstado(`Los feriados de ${a} ya están.`); return }
    try {
      const lote = writeBatch(db)
      for (const f of nuevos) lote.set(doc(col('fechas')), { ...f, creada: serverTimestamp() })
      await lote.commit()
      setEstado(`Listo: se agregaron ${nuevos.length} feriados de ${a}.`)
    } catch (e) { setEstado(mensajeError(e)) }
  }

  return (
    <section className="pantalla">
      <div className="top">
        <div><h1>Calendario</h1><p className="suave">Feriados, días sin {T.clases} y actividades.</p></div>
        {profesor && <button className="btn btn-principal" onClick={() => setNueva(true)}>+ Fecha</button>}
      </div>
      {profesor && (
        <div className="fila">
          <button className="btn btn-acento btn-chico" onClick={() => cargarFeriados(anio)}>Cargar feriados de Nicaragua {anio}</button>
          <button className="btn btn-borde btn-chico" onClick={() => cargarFeriados(anio + 1)}>y de {anio + 1}</button>
        </div>
      )}
      {estado && <p className="ok">{estado}</p>}
      <div className="tabs" role="tablist">
        <button className="tab" role="tab" aria-selected={!pasadas} onClick={() => setPasadas(false)}>Próximas</button>
        <button className="tab" role="tab" aria-selected={pasadas} onClick={() => setPasadas(true)}>Pasadas</button>
      </div>
      {lista.length === 0 && <Vacio>{pasadas ? 'Nada todavía.' : 'No hay fechas próximas.'}</Vacio>}
      <div className="lista">
        {lista.map((f) => {
          const [texto, pill] = TEXTO_FECHA[f.tipo]
          return (
            <div key={f.id} className="fila-item">
              <div><b>{f.titulo}</b><small>{rangoFecha(f)}{f.nota ? ` · ${f.nota}` : ''}</small></div>
              <span className={`pill ${pill}`}>{texto}</span>
              {profesor && <button className="btn btn-rosa btn-chico" aria-label={`Borrar ${f.titulo}`} onClick={() => deleteDoc(doc(db, 'fechas', f.id))}>×</button>}
            </div>
          )
        })}
      </div>
      {nueva && <HojaFecha onCerrar={() => setNueva(false)} />}
    </section>
  )
}

function HojaFecha({ onCerrar }: { onCerrar: () => void }) {
  const [fecha, setFecha] = useState(isoDia(new Date()))
  const [hasta, setHasta] = useState('')
  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState<TipoFecha>('sinclase')
  const [nota, setNota] = useState('')
  const [avisar, setAvisar] = useState(true)
  const [error, setError] = useState('')
  async function guardar() {
    if (!titulo.trim() || !fecha) { setError('Escribe qué es y la fecha.'); return }
    if (hasta && hasta < fecha) { setError('La fecha final va después de la inicial.'); return }
    try {
      await addDoc(col('fechas'), { fecha, hasta: hasta || '', titulo: titulo.trim(), tipo, nota: nota.trim(), creada: serverTimestamp() })
      if (avisar) {
        const cuando = rangoFecha({ id: '', fecha, hasta, titulo, tipo })
        const texto = tipo === 'evento' ? `${cuando}. ${nota.trim()}`.trim() : `El ${cuando} no habrá ${T.clases}.${nota.trim() ? ` ${nota.trim()}` : ''}`
        await addDoc(col('avisos'), { titulo: titulo.trim(), texto, para: 'todos', fecha: serverTimestamp() })
      }
      onCerrar()
    } catch (e) { setError(mensajeError(e)) }
  }
  return (
    <Hoja titulo="Nueva fecha" onCerrar={onCerrar}>
      <label className="campo" htmlFor="f-tipo">Tipo
        <select id="f-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoFecha)}>
          <option value="sinclase">Día sin {T.clases} (vacaciones, permiso)</option>
          <option value="feriado">Feriado</option>
          <option value="evento">Actividad (recital, examen, reunión)</option>
        </select>
      </label>
      <label className="campo" htmlFor="f-titulo">Qué es<input id="f-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder={tipo === 'evento' ? 'Ej. Recital de fin de año' : 'Ej. Vacaciones de diciembre'} /></label>
      <div className="campos">
        <label className="campo" htmlFor="f-fecha">Fecha<input id="f-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></label>
        <label className="campo" htmlFor="f-hasta">Hasta (si son varios días)<input id="f-hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></label>
      </div>
      <label className="campo" htmlFor="f-nota">Detalle (opcional)<input id="f-nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej. 5:00 p. m. en el auditorio" /></label>
      <label className="check" htmlFor="f-avisar"><input id="f-avisar" type="checkbox" checked={avisar} onChange={(e) => setAvisar(e.target.checked)} />Publicarlo también como aviso para todos</label>
      {error && <p className="error">{error}</p>}
      <button className="btn btn-principal" onClick={guardar}>Guardar</button>
    </Hoja>
  )
}
