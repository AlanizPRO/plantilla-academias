import { doc, setDoc } from 'firebase/firestore'
import { useState } from 'react'
import { cliente } from '../cliente'
import {
  DIAS, isoMes, mensajeError, PALABRAS_RECORDATORIO, RECORDATORIO_BASE, textoRecordatorio,
  type Ajustes as TAjustes, type Cuenta, type Disponible,
} from '../datos'
import { db } from '../firebase'
import { T } from '../textos'
import BotonRespaldo from './BotonRespaldo'

export default function Ajustes({ ajustes, correo, onSalir }: { ajustes: TAjustes; correo: string; onSalir: () => void }) {
  const [f, setF] = useState<TAjustes>(ajustes)
  const [estado, setEstado] = useState('')
  const poner = (campo: keyof TAjustes, valor: unknown) => { setF((x) => ({ ...x, [campo]: valor })); setEstado('') }
  const bloque = (dia: number) => f.disponibilidad.find((b) => b.dia === dia)
  function cambiarDia(dia: number, cambio: Partial<Disponible> | null) {
    const resto = f.disponibilidad.filter((b) => b.dia !== dia)
    const actual = bloque(dia) ?? { dia, desde: '14:00', hasta: '19:00' }
    poner('disponibilidad', cambio === null ? resto : [...resto, { ...actual, ...cambio }].sort((a, b) => a.dia - b.dia))
  }
  const cuentas = f.cuentas ?? []
  const ponerCuenta = (i: number, cambio: Partial<Cuenta>) => poner('cuentas', cuentas.map((c, j) => (j === i ? { ...c, ...cambio } : c)))
  const ejemplo = { id: 'x', nombre: 'Ana López', encargado: 'Sra. María López', activo: true, clases: [] }
  async function guardar() {
    setEstado('guardando')
    try {
      await setDoc(doc(db, 'ajustes', 'general'), {
        ...f, cuotaMensual: Number(f.cuotaMensual) || 0, diaPago: Math.min(28, Math.max(1, Number(f.diaPago) || 1)),
        diasAvisoAntes: Number(f.diasAvisoAntes) || 0, duracion: Math.max(15, Number(f.duracion) || 60),
        cuentas: cuentas.filter((c) => c.numero.trim()).map((c) => ({ banco: c.banco.trim(), titular: c.titular.trim(), numero: c.numero.trim(), moneda: c.moneda })),
      })
      setEstado('listo')
    } catch (e) { setEstado(mensajeError(e)) }
  }
  return (
    <section className="pantalla">
      <div><h1>Ajustes</h1><p className="suave">Cobros y horario de {cliente.nombreApp}.</p></div>
      <div className="panel">
        <h3>Cobros</h3>
        <div className="campos">
          <label className="campo" htmlFor="aj-cuota">Cuota mensual<input id="aj-cuota" type="number" inputMode="decimal" value={f.cuotaMensual} onChange={(e) => poner('cuotaMensual', e.target.value)} /></label>
          <label className="campo" htmlFor="aj-moneda">Moneda
            <select id="aj-moneda" value={f.moneda} onChange={(e) => poner('moneda', e.target.value)}><option value="C$">Córdobas (C$)</option><option value="US$">Dólares (US$)</option></select>
          </label>
          <label className="campo" htmlFor="aj-dia">Día de pago<input id="aj-dia" type="number" min={1} max={28} value={f.diaPago} onChange={(e) => poner('diaPago', e.target.value)} /></label>
          <label className="campo" htmlFor="aj-antes">Avisar días antes<input id="aj-antes" type="number" min={0} max={10} value={f.diasAvisoAntes} onChange={(e) => poner('diasAvisoAntes', e.target.value)} /></label>
        </div>
        <label className="campo" htmlFor="aj-tel">Tu WhatsApp (para que {T.tusPersonas} te escriban)
          <input id="aj-tel" type="tel" inputMode="tel" value={f.telefonoProfesor} onChange={(e) => poner('telefonoProfesor', e.target.value)} placeholder="8888 8888" />
        </label>
      </div>
      <div className="panel">
        <h3>Cuentas para transferencias y depósitos</h3>
        <p className="suave chico">{T.Personas} las ven en su app (con botón para copiar) y salen en el recordatorio de pago.</p>
        {cuentas.map((c, i) => (
          <div key={i} className="panel" style={{ gap: 8 }}>
            <div className="campos">
              <label className="campo" htmlFor={`cu-banco-${i}`}>Banco<input id={`cu-banco-${i}`} value={c.banco} onChange={(e) => ponerCuenta(i, { banco: e.target.value })} placeholder="Ej. BAC, Lafise, Banpro" /></label>
              <label className="campo" htmlFor={`cu-mon-${i}`}>Moneda
                <select id={`cu-mon-${i}`} value={c.moneda} onChange={(e) => ponerCuenta(i, { moneda: e.target.value })}><option value="C$">Córdobas (C$)</option><option value="US$">Dólares (US$)</option></select>
              </label>
              <label className="campo" htmlFor={`cu-num-${i}`}>Número de cuenta<input id={`cu-num-${i}`} inputMode="numeric" value={c.numero} onChange={(e) => ponerCuenta(i, { numero: e.target.value })} /></label>
              <label className="campo" htmlFor={`cu-tit-${i}`}>A nombre de<input id={`cu-tit-${i}`} value={c.titular} onChange={(e) => ponerCuenta(i, { titular: e.target.value })} /></label>
            </div>
            <button className="btn btn-rosa btn-chico" style={{ alignSelf: 'flex-start' }} onClick={() => poner('cuentas', cuentas.filter((_, j) => j !== i))}>Quitar cuenta</button>
          </div>
        ))}
        <button className="btn btn-acento btn-chico" style={{ alignSelf: 'flex-start' }} onClick={() => poner('cuentas', [...cuentas, { banco: '', titular: '', numero: '', moneda: f.moneda }])}>+ Agregar cuenta</button>
      </div>
      <div className="panel">
        <h3>Recordatorio de pago</h3>
        <p className="suave chico">Así sale el mensaje formal por WhatsApp. Las palabras entre llaves se cambian solas: {PALABRAS_RECORDATORIO.join(' ')}. Si {T.laPersona} es menor, {'{nombre}'} usa el nombre de su encargado.</p>
        <label className="campo" htmlFor="aj-msg">Mensaje
          <textarea id="aj-msg" rows={10} value={f.mensajeRecordatorio || RECORDATORIO_BASE} onChange={(e) => poner('mensajeRecordatorio', e.target.value)} />
        </label>
        <label className="campo" htmlFor="aj-firma">Firma (va al final del recordatorio y del recibo)
          <textarea id="aj-firma" rows={2} value={f.firma} onChange={(e) => poner('firma', e.target.value)} />
        </label>
        <div className="fila">
          <button className="btn btn-borde btn-chico" onClick={() => poner('mensajeRecordatorio', '')}>Volver al mensaje original</button>
        </div>
        <span className="etiqueta">Ejemplo</span>
        <p className="chico" style={{ whiteSpace: 'pre-wrap', background: 'var(--gris-suave)', padding: 10, borderRadius: 10 }}>{textoRecordatorio(ejemplo, isoMes(new Date()), { ...f, cuentas, cuotaMensual: Number(f.cuotaMensual) || 0, diaPago: Number(f.diaPago) || 1 })}</p>
      </div>
      <div className="panel">
        <h3>Horario disponible</h3>
        <label className="campo" htmlFor="aj-dur">Duración de cada {T.clase} (minutos)<input id="aj-dur" type="number" min={15} step={15} value={f.duracion} onChange={(e) => poner('duracion', e.target.value)} /></label>
        {DIAS.map((nombre, dia) => {
          const b = bloque(dia)
          return (
            <div key={nombre} className="fila-dia">
              <label className="check" htmlFor={`d-${dia}`}>
                <input id={`d-${dia}`} type="checkbox" checked={!!b} onChange={(e) => cambiarDia(dia, e.target.checked ? {} : null)} />{nombre}
              </label>
              {b && <>
                <input aria-label={`${nombre} desde`} className="hora-input" type="time" step={900} value={b.desde} onChange={(e) => cambiarDia(dia, { desde: e.target.value })} />
                <span className="suave">a</span>
                <input aria-label={`${nombre} hasta`} className="hora-input" type="time" step={900} value={b.hasta} onChange={(e) => cambiarDia(dia, { hasta: e.target.value })} />
              </>}
            </div>
          )
        })}
      </div>
      {estado === 'listo' && <p className="ok">Guardado.</p>}
      {estado && !['listo', 'guardando'].includes(estado) && <p className="error">{estado}</p>}
      <button className="btn btn-principal" disabled={estado === 'guardando'} onClick={guardar}>{estado === 'guardando' ? 'Guardando…' : 'Guardar ajustes'}</button>
      <BotonRespaldo hojas={[
        { coleccion: 'alumnos', nombre: T.Personas ?? 'Personas' }, { coleccion: 'pagos', nombre: 'Pagos' }, { coleccion: 'reservas', nombre: 'Reservas' },
        { coleccion: 'avisos', nombre: 'Avisos' }, { coleccion: 'materiales', nombre: 'Materiales' }, { coleccion: 'usuarios', nombre: 'Cuentas' },
        { coleccion: 'tareas', nombre: 'Tareas' }, { coleccion: 'programas', nombre: 'Programas' }, { coleccion: 'fechas', nombre: 'Calendario' },
      ]} />
      <div className="panel">
        <p className="suave chico">Entraste como <b>{correo}</b> ({T.admin}).</p>
        <button className="btn btn-borde" onClick={onSalir}>Cerrar sesión</button>
      </div>
    </section>
  )
}
