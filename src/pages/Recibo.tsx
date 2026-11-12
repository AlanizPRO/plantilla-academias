import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { cliente, logoAncho } from '../cliente'
import { Hoja, Logo } from '../componentes'
import { dinero, enlaceWhatsApp, nombreMes, numeroRecibo, textoRecibo, type Ajustes, type Alumno, type Pago } from '../datos'
import { db } from '../firebase'
import { ICONOS } from '../iconos'

type NuevoPago = { alumnoId: string; mes: string; monto: number; metodo: string; nota?: string; cuenta?: string; avisoId?: string }

/** Guarda el pago con el siguiente número de recibo (y, si viene de un aviso del alumno, lo marca confirmado). */
export async function registrarPago(datos: NuevoPago): Promise<{ id: string; numero: number }> {
  const contador = doc(db, 'contadores', 'recibos')
  const nuevo = doc(collection(db, 'pagos'))
  const numero = await runTransaction(db, async (t) => {
    const c = await t.get(contador)
    const n = ((c.data()?.ultimo as number) ?? 0) + 1
    t.set(contador, { ultimo: n })
    const limpio = Object.fromEntries(Object.entries(datos).filter(([, v]) => v !== undefined && v !== ''))
    t.set(nuevo, { ...limpio, numero: n, fecha: serverTimestamp() })
    if (datos.avisoId) t.update(doc(db, 'avisosPago', datos.avisoId), { estado: 'confirmado', pagoId: nuevo.id })
    return n
  })
  return { id: nuevo.id, numero }
}

export function Recibo({ pago, alumno, ajustes, onCerrar, profesor }: { pago: Pago; alumno?: Alumno | null; ajustes: Ajustes; onCerrar: () => void; profesor?: boolean }) {
  const fecha = (pago.fecha?.toDate() ?? new Date()).toLocaleDateString('es-NI', { day: 'numeric', month: 'long', year: 'numeric' })
  const texto = textoRecibo(pago, alumno, ajustes)
  async function compartir() {
    try { await navigator.share({ title: `Recibo ${numeroRecibo(pago.numero)}`, text: texto }) } catch { /* cancelado */ }
  }
  return (
    <Hoja titulo={`Recibo ${numeroRecibo(pago.numero)}`} onCerrar={onCerrar}>
      <div className="recibo">
        {logoAncho && <img src={logoAncho} alt="" style={{ width: '100%', maxHeight: 140, objectFit: 'contain' }} />}
        <div className="cab">
          {!logoAncho && <Logo />}
          <div><h2>{cliente.nombreApp}</h2><small>{[cliente.descripcion, cliente.ciudad].filter(Boolean).join(' · ')}</small></div>
        </div>
        <div className="fila" style={{ justifyContent: 'space-between' }}><b>RECIBO DE PAGO</b><b>{numeroRecibo(pago.numero)}</b></div>
        <div className="linea"><span>Fecha</span><span>{fecha}</span></div>
        <div className="linea"><span>Recibimos de</span><span>{alumno?.encargado?.trim() ? `${alumno.encargado} (por ${alumno.nombre})` : alumno?.nombre ?? ''}</span></div>
        <div className="linea"><span>Concepto</span><span style={{ textTransform: 'none' }}>Mensualidad de {nombreMes(pago.mes)}</span></div>
        <div className="linea"><span>Forma de pago</span><span>{pago.metodo}{pago.cuenta ? ` · ${pago.cuenta}` : ''}</span></div>
        <div className="fila" style={{ justifyContent: 'space-between', marginTop: 6 }}><span>Total recibido</span><span className="total">{dinero(pago.monto, ajustes)}</span></div>
        <p style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{ajustes.firma?.trim() || cliente.nombreApp}</p>
      </div>
      <div className="fila no-imprimir">
        {profesor && alumno?.telefono && <a className="btn btn-whatsapp" href={enlaceWhatsApp(alumno.telefono, texto)} target="_blank" rel="noreferrer">{ICONOS.whatsapp}Enviar por WhatsApp</a>}
        {'share' in navigator && <button className="btn btn-acento" onClick={compartir}>Compartir</button>}
        <button className="btn btn-borde" onClick={() => print()}>Imprimir o PDF</button>
      </div>
    </Hoja>
  )
}
