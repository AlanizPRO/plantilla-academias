import { addDoc, deleteDoc, doc, query, serverTimestamp, where } from 'firebase/firestore'
import { useState } from 'react'
import { Hoja, Vacio } from '../componentes'
import {
  col, cuotaDe, dinero, enlaceWhatsApp, estadoPago, iniciales, isoMes, mensajeError, mesAnterior, mesSiguiente, nombreMes,
  TEXTO_PAGO, textoRecordatorio, useLista, type Ajustes, type Alumno, type Pago,
} from '../datos'
import { db } from '../firebase'
import { ICONOS } from '../iconos'

const METODOS = ['Efectivo', 'Transferencia', 'Tarjeta']

export default function Pagos({ alumnos, ajustes }: { alumnos: Alumno[]; ajustes: Ajustes }) {
  const [mes, setMes] = useState(isoMes(new Date()))
  const [filtro, setFiltro] = useState<'deben' | 'pagaron' | 'todos'>('deben')
  const [cobrar, setCobrar] = useState<Alumno | null>(null)
  const pagos = useLista<Pago>(query(col('pagos'), where('mes', '==', mes)), [mes]) ?? []
  const activos = alumnos.filter((a) => a.activo).sort((a, b) => a.nombre.localeCompare(b.nombre))
  const pagoDe = (id: string) => pagos.filter((p) => p.alumnoId === id)
  const cobrado = pagos.reduce((s, p) => s + (p.monto || 0), 0)
  const deben = activos.filter((a) => pagoDe(a.id).length === 0)
  const porCobrar = deben.reduce((s, a) => s + cuotaDe(a, ajustes), 0)
  const lista = filtro === 'deben' ? deben : filtro === 'pagaron' ? activos.filter((a) => pagoDe(a.id).length > 0) : activos

  return (
    <section className="pantalla">
      <div><h1>Pagos</h1><p className="suave">Se paga el día {ajustes.diaPago} de cada mes.</p></div>
      <div className="fila" style={{ justifyContent: 'space-between' }}>
        <button className="btn btn-borde btn-chico" onClick={() => setMes(mesAnterior(mes))} aria-label="Mes anterior">‹</button>
        <h2 style={{ textTransform: 'capitalize' }}>{nombreMes(mes)}</h2>
        <button className="btn btn-borde btn-chico" onClick={() => setMes(mesSiguiente(mes))} aria-label="Mes siguiente">›</button>
      </div>
      <div className="stats">
        <div className="stat"><b>{dinero(cobrado, ajustes)}</b><span>Cobrado</span></div>
        <div className="stat"><b>{dinero(porCobrar, ajustes)}</b><span>Por cobrar</span></div>
        <div className="stat"><b>{deben.length}</b><span>Deben</span></div>
      </div>
      <div className="tabs" role="tablist">
        {([['deben', 'Deben'], ['pagaron', 'Pagaron'], ['todos', 'Todos']] as const).map(([id, n]) => (
          <button key={id} className="tab" role="tab" aria-selected={filtro === id} onClick={() => setFiltro(id)}>{n}</button>
        ))}
      </div>
      {lista.length === 0 && <Vacio>{filtro === 'deben' ? '¡Todos pagaron este mes! 🎉' : 'Nadie por aquí.'}</Vacio>}
      <div className="lista">
        {lista.map((a) => {
          const ps = pagoDe(a.id)
          const [texto, pill] = TEXTO_PAGO[estadoPago(ps.length > 0, mes, ajustes)]
          return (
            <div key={a.id} className="fila-item">
              <span className="ini">{iniciales(a.nombre)}</span>
              <div>
                <b>{a.nombre}</b>
                <small>{ps.length ? ps.map((p) => `${dinero(p.monto, ajustes)} ${p.metodo ?? ''}`).join(' + ') : dinero(cuotaDe(a, ajustes), ajustes)}</small>
              </div>
              <span className={`pill ${pill}`}>{texto}</span>
              {ps.length === 0 ? <>
                {a.telefono && <a className="btn btn-whatsapp btn-chico" aria-label={`Recordar a ${a.nombre}`} href={enlaceWhatsApp(a.telefono, textoRecordatorio(a, mes, ajustes))} target="_blank" rel="noreferrer">{ICONOS.whatsapp}</a>}
                <button className="btn btn-principal btn-chico" onClick={() => setCobrar(a)}>Pagó</button>
              </> : <button className="btn btn-borde btn-chico" onClick={() => setCobrar(a)}>Ver</button>}
            </div>
          )
        })}
      </div>
      {cobrar && <HojaPago alumno={cobrar} mes={mes} ajustes={ajustes} pagos={pagoDe(cobrar.id)} onCerrar={() => setCobrar(null)} />}
    </section>
  )
}

function HojaPago({ alumno, mes, ajustes, pagos, onCerrar }: { alumno: Alumno; mes: string; ajustes: Ajustes; pagos: Pago[]; onCerrar: () => void }) {
  const [monto, setMonto] = useState(String(cuotaDe(alumno, ajustes)))
  const [metodo, setMetodo] = useState(METODOS[0])
  const [nota, setNota] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  async function guardar() {
    if (!(Number(monto) > 0)) { setError('Escribe el monto.'); return }
    setGuardando(true); setError('')
    try {
      await addDoc(col('pagos'), { alumnoId: alumno.id, mes, monto: Number(monto), metodo, nota: nota.trim(), fecha: serverTimestamp() })
      onCerrar()
    } catch (e) { setError(mensajeError(e)); setGuardando(false) }
  }
  const gracias = `Hola ${alumno.nombre.split(' ')[0]}, recibí tu pago de ${nombreMes(mes)}. ¡Muchas gracias!`
  return (
    <Hoja titulo={`Pago de ${alumno.nombre.split(' ')[0]}`} onCerrar={onCerrar}>
      <p className="suave" style={{ textTransform: 'capitalize' }}>{nombreMes(mes)}</p>
      {pagos.length > 0 && (
        <div className="panel">
          {pagos.map((p) => (
            <div key={p.id} className="fila" style={{ justifyContent: 'space-between' }}>
              <span><b>{dinero(p.monto, ajustes)}</b> · {p.metodo}{p.fecha ? ` · ${p.fecha.toDate().toLocaleDateString('es-NI')}` : ''}{p.nota ? ` · ${p.nota}` : ''}</span>
              <button className="btn btn-rosa btn-chico" onClick={() => deleteDoc(doc(db, 'pagos', p.id)).catch((e) => setError(mensajeError(e)))}>Borrar</button>
            </div>
          ))}
          {alumno.telefono && <a className="btn btn-whatsapp btn-chico" href={enlaceWhatsApp(alumno.telefono, gracias)} target="_blank" rel="noreferrer">{ICONOS.whatsapp}Enviar "recibido"</a>}
        </div>
      )}
      <h3>{pagos.length ? 'Agregar otro pago' : 'Registrar pago'}</h3>
      <div className="campos">
        <label className="campo" htmlFor="p-monto">Monto ({ajustes.moneda})<input id="p-monto" type="number" inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} /></label>
        <label className="campo" htmlFor="p-metodo">Cómo pagó
          <select id="p-metodo" value={metodo} onChange={(e) => setMetodo(e.target.value)}>{METODOS.map((m) => <option key={m}>{m}</option>)}</select>
        </label>
      </div>
      <label className="campo" htmlFor="p-nota">Nota (opcional)<input id="p-nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej. Transferencia BAC #1234" /></label>
      {error && <p className="error">{error}</p>}
      <button className="btn btn-principal" disabled={guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar pago'}</button>
    </Hoja>
  )
}
