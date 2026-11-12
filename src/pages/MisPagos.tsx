import { addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { useState, type ReactNode } from 'react'
import { Hoja, Vacio } from '../componentes'
import {
  col, cuotaDe, dinero, enlaceWhatsApp, isoMes, mensajeError, nombreMes, numeroRecibo,
  type Ajustes, type Alumno, type AvisoPago, type Pago,
} from '../datos'
import { db } from '../firebase'
import { fotoChica } from '../foto'
import { ICONOS } from '../iconos'
import { T } from '../textos'
import { METODOS, nombreCuenta } from './Pagos'
import { Recibo } from './Recibo'

// Pantalla "Mis pagos" del alumno: cuentas para transferir, avisar que ya pagó (con foto) y sus recibos.
export default function MisPagos({ yo, pagos, avisosPago, ajustes, banner, abrirAviso }: { yo: Alumno | null; pagos: Pago[]; avisosPago: AvisoPago[]; ajustes: Ajustes; banner: ReactNode; abrirAviso?: boolean }) {
  const [avisar, setAvisar] = useState(!!abrirAviso)
  const [recibo, setRecibo] = useState<Pago | null>(null)
  const [copiado, setCopiado] = useState('')
  const avisos = avisosPago
    .filter((a) => a.estado !== 'confirmado')
    .sort((a, b) => (b.fecha?.toMillis() ?? Date.now()) - (a.fecha?.toMillis() ?? Date.now()))
  const cuentas = (ajustes.cuentas ?? []).filter((c) => c.numero.trim())
  async function copiar(n: string) {
    try { await navigator.clipboard.writeText(n.replace(/\s/g, '')); setCopiado(n) } catch { setCopiado('') }
  }
  return (
    <section className="pantalla">
      <h1>Mis pagos</h1>
      {banner}
      {avisos.map((a) => (
        <div key={a.id} className={a.estado === 'rechazado' ? 'error' : 'aviso'} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <b>{a.estado === 'pendiente' ? `Avisaste un pago de ${dinero(a.monto, ajustes)}: ${T.tuAdmin} lo va a revisar.` : `${T.Admin} no pudo confirmar tu pago de ${dinero(a.monto, ajustes)}.`}</b>
          {a.motivo && <span>{a.motivo}</span>}
          {a.estado !== 'confirmado' && <button className="btn btn-borde btn-chico" style={{ alignSelf: 'flex-start' }} onClick={() => deleteDoc(doc(db, 'avisosPago', a.id))}>{a.estado === 'pendiente' ? 'Cancelar aviso' : 'Quitar'}</button>}
        </div>
      ))}
      <button className="btn btn-principal" onClick={() => setAvisar(true)}>Ya pagué: enviar comprobante</button>
      {cuentas.length > 0 && (
        <div className="panel">
          <h3>Cuentas para transferir o depositar</h3>
          {cuentas.map((c) => (
            <div key={c.numero} className="fila-item">
              <div><b>{c.banco} · {c.moneda}</b><small>{c.numero}{c.titular ? ` · ${c.titular}` : ''}</small></div>
              <button className="btn btn-borde btn-chico" onClick={() => copiar(c.numero)}>{copiado === c.numero ? 'Copiado ✓' : 'Copiar'}</button>
            </div>
          ))}
        </div>
      )}
      <h3>Pagos recibidos</h3>
      {pagos.length === 0 && <Vacio>Todavía no hay pagos registrados.</Vacio>}
      <div className="lista">
        {pagos.map((p) => (
          <button key={p.id} className="fila-item" onClick={() => setRecibo(p)}>
            <div><b style={{ textTransform: 'capitalize' }}>{nombreMes(p.mes)}</b><small>{numeroRecibo(p.numero)} · {p.metodo}{p.fecha ? ` · ${p.fecha.toDate().toLocaleDateString('es-NI')}` : ''}</small></div>
            <span className="pill p-verde">{dinero(p.monto, ajustes)}</span>
            <span aria-hidden="true">›</span>
          </button>
        ))}
      </div>
      {avisar && yo && <HojaYaPague yo={yo} ajustes={ajustes} pagos={pagos} onCerrar={() => setAvisar(false)} />}
      {recibo && <Recibo pago={recibo} alumno={yo} ajustes={ajustes} onCerrar={() => setRecibo(null)} />}
    </section>
  )
}

function HojaYaPague({ yo, ajustes, pagos, onCerrar }: { yo: Alumno; ajustes: Ajustes; pagos: Pago[]; onCerrar: () => void }) {
  const actual = isoMes(new Date())
  // Sugiere el mes más antiguo sin pagar entre el anterior, el actual y el siguiente.
  const opciones = [-1, 0, 1].map((n) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + n); return isoMes(d) })
  const [mes, setMes] = useState(opciones.find((m) => m >= actual && !pagos.some((p) => p.mes === m)) ?? actual)
  const [monto, setMonto] = useState(String(cuotaDe(yo, ajustes)))
  const cuentas = (ajustes.cuentas ?? []).filter((c) => c.numero.trim()).map(nombreCuenta)
  const [metodo, setMetodo] = useState('Transferencia')
  const [cuenta, setCuenta] = useState(cuentas[0] ?? '')
  const [referencia, setReferencia] = useState('')
  const [nota, setNota] = useState('')
  const [foto, setFoto] = useState('')
  const [error, setError] = useState('')
  const [estado, setEstado] = useState<'' | 'foto' | 'enviando' | 'listo'>('')
  const conCuenta = metodo === 'Transferencia' || metodo === 'Depósito'

  async function elegirFoto(f?: File) {
    if (!f) return
    setEstado('foto'); setError('')
    try { setFoto(await fotoChica(f)) } catch (e) { setError((e as Error).message) } finally { setEstado('') }
  }
  async function enviar() {
    if (!(Number(monto) > 0)) { setError('Escribe el monto.'); return }
    if (conCuenta && !foto && !referencia.trim()) { setError('Agrega la foto del comprobante o el número de referencia.'); return }
    setEstado('enviando'); setError('')
    try {
      await addDoc(col('avisosPago'), {
        alumnoId: yo.id, mes, monto: Number(monto), metodo, cuenta: conCuenta ? cuenta : '', referencia: referencia.trim(),
        foto, nota: nota.trim(), estado: 'pendiente', fecha: serverTimestamp(),
      })
      setEstado('listo')
    } catch (e) { setError(mensajeError(e)); setEstado('') }
  }
  if (estado === 'listo') return (
    <Hoja titulo="¡Listo!" onCerrar={onCerrar}>
      <p className="ok">Tu aviso de pago llegó a {T.tuAdmin}. Cuando lo confirme, aquí verás tu recibo.</p>
      {ajustes.telefonoProfesor && <a className="btn btn-whatsapp" target="_blank" rel="noreferrer"
        href={enlaceWhatsApp(ajustes.telefonoProfesor, `Hola, soy ${yo.nombre}. Le envié por la app el comprobante de pago de ${nombreMes(mes)} (${dinero(Number(monto), ajustes)}).`)}>
        {ICONOS.whatsapp}Avisarle también por WhatsApp</a>}
      <button className="btn btn-principal" onClick={onCerrar}>Cerrar</button>
    </Hoja>
  )
  return (
    <Hoja titulo="Avisar mi pago" onCerrar={onCerrar}>
      <div className="campos">
        <label className="campo" htmlFor="yp-mes">Mes que pagas
          <select id="yp-mes" value={mes} onChange={(e) => setMes(e.target.value)}>{opciones.map((m) => <option key={m} value={m}>{nombreMes(m)}</option>)}</select>
        </label>
        <label className="campo" htmlFor="yp-monto">Monto ({ajustes.moneda})<input id="yp-monto" type="number" inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} /></label>
        <label className="campo" htmlFor="yp-metodo">Cómo pagaste
          <select id="yp-metodo" value={metodo} onChange={(e) => setMetodo(e.target.value)}>{METODOS.map((m) => <option key={m}>{m}</option>)}</select>
        </label>
        {conCuenta && cuentas.length > 0 && <label className="campo" htmlFor="yp-cuenta">A qué cuenta
          <select id="yp-cuenta" value={cuenta} onChange={(e) => setCuenta(e.target.value)}>{cuentas.map((c) => <option key={c}>{c}</option>)}</select>
        </label>}
      </div>
      {conCuenta && <>
        <label className="campo" htmlFor="yp-foto">Foto o captura del comprobante
          <input id="yp-foto" type="file" accept="image/*" onChange={(e) => elegirFoto(e.target.files?.[0])} />
        </label>
        {estado === 'foto' && <p className="suave">Preparando la foto…</p>}
        {foto && <img src={foto} alt="Comprobante" style={{ maxWidth: '100%', maxHeight: 240, objectFit: 'contain', borderRadius: 12 }} />}
        <label className="campo" htmlFor="yp-ref">Número de referencia (opcional)<input id="yp-ref" value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Ej. 123456789" /></label>
      </>}
      <label className="campo" htmlFor="yp-nota">Nota (opcional)<input id="yp-nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej. Pago de mis dos hijos" /></label>
      {error && <p className="error">{error}</p>}
      <button className="btn btn-principal" disabled={estado !== ''} onClick={enviar}>{estado === 'enviando' ? 'Enviando…' : 'Enviar aviso de pago'}</button>
    </Hoja>
  )
}
