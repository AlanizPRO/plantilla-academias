import { deleteDoc, doc, query, setDoc, updateDoc, where } from 'firebase/firestore'
import { useState } from 'react'
import { Hoja, Vacio, VerFoto } from '../componentes'
import {
  col, cuotaDe, dinero, enlaceWhatsApp, estadoPago, iniciales, isoDia, isoMes, mensajeError, mesAnterior, mesSiguiente, nombreMes,
  numeroRecibo, TEXTO_PAGO, textoRecordatorio, useLista, type Ajustes, type Alumno, type AvisoPago, type Pago,
} from '../datos'
import { db } from '../firebase'
import { ICONOS } from '../iconos'
import { Recibo, registrarPago } from './Recibo'

export const METODOS = ['Efectivo', 'Transferencia', 'Depósito', 'Tarjeta']
export const nombreCuenta = (c: { banco: string; moneda: string; numero: string }) => `${c.banco} ${c.moneda} ···${c.numero.replace(/\D/g, '').slice(-4)}`

/** Avisos de "ya pagué" que mandan los alumnos y el profesor todavía no revisa. */
export const usePorConfirmar = () =>
  useLista<AvisoPago>(query(col('avisosPago'), where('estado', '==', 'pendiente')), []) ?? []

export default function Pagos({ alumnos, ajustes }: { alumnos: Alumno[]; ajustes: Ajustes }) {
  const [mes, setMes] = useState(isoMes(new Date()))
  const [filtro, setFiltro] = useState<'deben' | 'pagaron' | 'todos'>('deben')
  const [cobrar, setCobrar] = useState<Alumno | null>(null)
  const [recordarTodos, setRecordarTodos] = useState(false)
  const [recibo, setRecibo] = useState<Pago | null>(null)
  const pagos = useLista<Pago>(query(col('pagos'), where('mes', '==', mes)), [mes]) ?? []
  const porConfirmar = usePorConfirmar()
  const recordados = useLista<{ id: string; dia: string }>(query(col('recordatorios'), where('mes', '==', mes)), [mes]) ?? []
  const recordadoEl = (id: string) => recordados.find((r) => r.id === `${mes}_${id}`)?.dia
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
      {porConfirmar.length > 0 && <PorConfirmar avisos={porConfirmar} alumnos={alumnos} ajustes={ajustes} onRecibo={setRecibo} />}
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
      {filtro === 'deben' && deben.some((a) => a.telefono) && (
        <button className="btn btn-whatsapp" onClick={() => setRecordarTodos(true)}>{ICONOS.whatsapp}Mandar recordatorio formal a los que deben ({deben.filter((a) => a.telefono).length})</button>
      )}
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
                <small>{ps.length ? ps.map((p) => `${dinero(p.monto, ajustes)} ${p.metodo ?? ''}`).join(' + ') : dinero(cuotaDe(a, ajustes), ajustes)}
                  {!ps.length && recordadoEl(a.id) ? ` · recordado ${recordadoEl(a.id)!.slice(8)}/${recordadoEl(a.id)!.slice(5, 7)}` : ''}</small>
              </div>
              <span className={`pill ${pill}`}>{texto}</span>
              {ps.length === 0 ? <>
                {a.telefono && <a className="btn btn-whatsapp btn-chico" aria-label={`Recordar a ${a.nombre}`} href={enlaceWhatsApp(a.telefono, textoRecordatorio(a, mes, ajustes))} target="_blank" rel="noreferrer" onClick={() => marcarRecordado(mes, a.id)}>{ICONOS.whatsapp}</a>}
                <button className="btn btn-principal btn-chico" onClick={() => setCobrar(a)}>Pagó</button>
              </> : <button className="btn btn-borde btn-chico" onClick={() => setCobrar(a)}>Ver</button>}
            </div>
          )
        })}
      </div>
      {cobrar && <HojaPago alumno={cobrar} mes={mes} ajustes={ajustes} pagos={pagoDe(cobrar.id)} onCerrar={() => setCobrar(null)} onRecibo={(p) => { setCobrar(null); setRecibo(p) }} />}
      {recordarTodos && <RecordarTodos deben={deben.filter((a) => a.telefono)} mes={mes} ajustes={ajustes} recordadoEl={recordadoEl} onCerrar={() => setRecordarTodos(false)} />}
      {recibo && <Recibo profesor pago={recibo} alumno={alumnos.find((a) => a.id === recibo.alumnoId)} ajustes={ajustes} onCerrar={() => setRecibo(null)} />}
    </section>
  )
}

export function marcarRecordado(mes: string, alumnoId: string) {
  setDoc(doc(db, 'recordatorios', `${mes}_${alumnoId}`), { mes, alumnoId, dia: isoDia(new Date()) }).catch(() => { /* no es grave */ })
}

// Uno por uno: cada toque abre WhatsApp con el mensaje formal de esa persona y queda anotado que se le recordó.
function RecordarTodos({ deben, mes, ajustes, recordadoEl, onCerrar }: { deben: Alumno[]; mes: string; ajustes: Ajustes; recordadoEl: (id: string) => string | undefined; onCerrar: () => void }) {
  const [verTexto, setVerTexto] = useState(false)
  return (
    <Hoja titulo="Recordatorio formal" onCerrar={onCerrar}>
      <p className="suave">Toca <b>Enviar</b> en cada uno. Se abre WhatsApp con su mensaje personalizado; solo le das a enviar y vuelves aquí.</p>
      <button className="btn btn-borde btn-chico" style={{ alignSelf: 'flex-start' }} onClick={() => setVerTexto(!verTexto)}>{verTexto ? 'Ocultar' : 'Ver'} cómo se ve el mensaje</button>
      {verTexto && deben[0] && <p className="panel chico" style={{ whiteSpace: 'pre-wrap' }}>{textoRecordatorio(deben[0], mes, ajustes)}</p>}
      <div className="lista">
        {deben.map((a) => {
          const dia = recordadoEl(a.id)
          return (
            <div key={a.id} className="fila-item">
              <span className="ini">{iniciales(a.nombre)}</span>
              <div><b>{a.nombre}</b><small>{a.encargado ? `Para ${a.encargado} · ` : ''}{dinero(cuotaDe(a, ajustes), ajustes)}</small></div>
              {dia && <span className="pill p-verde">Enviado {dia.slice(8)}/{dia.slice(5, 7)}</span>}
              <a className={`btn btn-chico ${dia ? 'btn-borde' : 'btn-whatsapp'}`} href={enlaceWhatsApp(a.telefono, textoRecordatorio(a, mes, ajustes))} target="_blank" rel="noreferrer" onClick={() => marcarRecordado(mes, a.id)}>{dia ? 'Otra vez' : 'Enviar'}</a>
            </div>
          )
        })}
      </div>
      <p className="suave chico">Puedes cambiar el texto del mensaje y tus cuentas bancarias en Más → Ajustes.</p>
    </Hoja>
  )
}

// Pagos que avisaron los alumnos desde su app (con foto del comprobante). Al confirmar se registra el pago y sale el recibo.
function PorConfirmar({ avisos, alumnos, ajustes, onRecibo }: { avisos: AvisoPago[]; alumnos: Alumno[]; ajustes: Ajustes; onRecibo: (p: Pago) => void }) {
  const [foto, setFoto] = useState('')
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState('')
  async function confirmar(av: AvisoPago) {
    setOcupado(av.id); setError('')
    try {
      const { id, numero } = await registrarPago({ alumnoId: av.alumnoId, mes: av.mes, monto: av.monto, metodo: av.metodo, cuenta: av.cuenta, nota: av.referencia ? `Ref. ${av.referencia}` : '', avisoId: av.id })
      onRecibo({ id, numero, alumnoId: av.alumnoId, mes: av.mes, monto: av.monto, metodo: av.metodo, cuenta: av.cuenta })
    } catch (e) { setError(mensajeError(e)) } finally { setOcupado('') }
  }
  async function rechazar(av: AvisoPago) {
    const motivo = prompt('¿Por qué no se confirma? (lo verá en su app)', 'No encuentro la transferencia en mi cuenta.')
    if (motivo === null) return
    try { await updateDoc(doc(db, 'avisosPago', av.id), { estado: 'rechazado', motivo: motivo.trim() }) } catch (e) { setError(mensajeError(e)) }
  }
  return (
    <div className="panel" style={{ borderColor: 'var(--amarillo)' }}>
      <h3>Pagos por confirmar <span className="pill p-amarillo">{avisos.length}</span></h3>
      <p className="suave chico">Revisa en tu banco que el dinero llegó y confirma. Se guarda el pago y se crea el recibo.</p>
      {error && <p className="error">{error}</p>}
      <div className="lista">
        {avisos.map((av) => {
          const a = alumnos.find((x) => x.id === av.alumnoId)
          return (
            <div key={av.id} className="panel" style={{ gap: 8, padding: 12 }}>
              <div className="fila" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
              {av.foto ? <img className="foto-mini" src={av.foto} alt="Comprobante" onClick={() => setFoto(av.foto!)} /> : <span className="ini">{iniciales(a?.nombre ?? '?')}</span>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <b>{a?.nombre ?? 'Alguien'} · {dinero(av.monto, ajustes)}</b>
                <small className="suave">{nombreMes(av.mes)} · {av.metodo}{av.cuenta ? ` a ${av.cuenta}` : ''}{av.referencia ? ` · Ref. ${av.referencia}` : ''}{av.fecha ? ` · avisó ${av.fecha.toDate().toLocaleDateString('es-NI')}` : ''}</small>
                {av.nota && <small>“{av.nota}”</small>}
              </div>
              </div>
              <div className="fila">
                <button className="btn btn-principal btn-chico" disabled={ocupado === av.id} onClick={() => confirmar(av)}>{ocupado === av.id ? 'Guardando…' : 'Confirmar'}</button>
                <button className="btn btn-rosa btn-chico" onClick={() => rechazar(av)}>No llegó</button>
              </div>
            </div>
          )
        })}
      </div>
      {foto && <VerFoto src={foto} onCerrar={() => setFoto('')} />}
    </div>
  )
}

function HojaPago({ alumno, mes, ajustes, pagos, onCerrar, onRecibo }: { alumno: Alumno; mes: string; ajustes: Ajustes; pagos: Pago[]; onCerrar: () => void; onRecibo: (p: Pago) => void }) {
  const [monto, setMonto] = useState(String(cuotaDe(alumno, ajustes)))
  const [metodo, setMetodo] = useState(METODOS[0])
  const cuentas = (ajustes.cuentas ?? []).filter((c) => c.numero.trim()).map(nombreCuenta)
  const [cuenta, setCuenta] = useState(cuentas[0] ?? '')
  const conCuenta = metodo === 'Transferencia' || metodo === 'Depósito'
  const [nota, setNota] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  async function guardar() {
    if (!(Number(monto) > 0)) { setError('Escribe el monto.'); return }
    setGuardando(true); setError('')
    try {
      const datos = { alumnoId: alumno.id, mes, monto: Number(monto), metodo, nota: nota.trim(), cuenta: conCuenta ? cuenta : undefined }
      const { id, numero } = await registrarPago(datos)
      onRecibo({ ...datos, id, numero })
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
              <button className="btn btn-borde btn-chico" onClick={() => onRecibo(p)}>Recibo</button>
              <span style={{ flex: 1 }}><b>{dinero(p.monto, ajustes)}</b> · {numeroRecibo(p.numero)} · {p.metodo}{p.fecha ? ` · ${p.fecha.toDate().toLocaleDateString('es-NI')}` : ''}{p.nota ? ` · ${p.nota}` : ''}</span>
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
        {conCuenta && cuentas.length > 0 && <label className="campo" htmlFor="p-cuenta">A qué cuenta
          <select id="p-cuenta" value={cuenta} onChange={(e) => setCuenta(e.target.value)}>{cuentas.map((c) => <option key={c}>{c}</option>)}</select>
        </label>}
      </div>
      <label className="campo" htmlFor="p-nota">Nota (opcional)<input id="p-nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej. Transferencia BAC #1234" /></label>
      {error && <p className="error">{error}</p>}
      <button className="btn btn-principal" disabled={guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar pago y hacer recibo'}</button>
    </Hoja>
  )
}
