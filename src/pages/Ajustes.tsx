import { doc, setDoc } from 'firebase/firestore'
import { useState } from 'react'
import { cliente } from '../cliente'
import { DIAS, mensajeError, type Ajustes as TAjustes, type Disponible } from '../datos'
import { db } from '../firebase'

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
  async function guardar() {
    setEstado('guardando')
    try {
      await setDoc(doc(db, 'ajustes', 'general'), {
        ...f, cuotaMensual: Number(f.cuotaMensual) || 0, diaPago: Math.min(28, Math.max(1, Number(f.diaPago) || 1)),
        diasAvisoAntes: Number(f.diasAvisoAntes) || 0, duracion: Math.max(15, Number(f.duracion) || 60),
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
        <label className="campo" htmlFor="aj-tel">Tu WhatsApp (para que los alumnos te escriban)
          <input id="aj-tel" type="tel" inputMode="tel" value={f.telefonoProfesor} onChange={(e) => poner('telefonoProfesor', e.target.value)} placeholder="8888 8888" />
        </label>
      </div>
      <div className="panel">
        <h3>Horario disponible</h3>
        <label className="campo" htmlFor="aj-dur">Duración de cada clase (minutos)<input id="aj-dur" type="number" min={15} step={15} value={f.duracion} onChange={(e) => poner('duracion', e.target.value)} /></label>
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
      <div className="panel">
        <p className="suave chico">Entraste como <b>{correo}</b> (profesor).</p>
        <button className="btn btn-borde" onClick={onSalir}>Cerrar sesión</button>
      </div>
    </section>
  )
}
