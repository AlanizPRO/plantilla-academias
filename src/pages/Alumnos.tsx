import { addDoc, doc, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { useState } from 'react'
import { cliente } from '../cliente'
import { T } from '../textos'
import { Hoja, Vacio } from '../componentes'
import {
  actualizarAgendaPublica, col, cuotaDe, dinero, DIAS, enlaceWhatsApp, estadoPago, hora12, iniciales, isoMes,
  mensajeError, TEXTO_PAGO, textoRecordatorio, useLista, type Ajustes, type Alumno, type Clase, type Pago,
} from '../datos'
import { db } from '../firebase'
import { ICONOS } from '../iconos'

export default function Alumnos({ alumnos, ajustes }: { alumnos: Alumno[]; ajustes: Ajustes }) {
  const [buscar, setBuscar] = useState('')
  const [verInactivos, setVerInactivos] = useState(false)
  const [abierto, setAbierto] = useState<string | null>(null)
  const [nuevo, setNuevo] = useState(false)
  const mes = isoMes(new Date())
  const pagos = useLista<Pago>(query(col('pagos'), where('mes', '==', mes)), [mes]) ?? []

  const lista = alumnos
    .filter((a) => a.activo !== verInactivos)
    .filter((a) => a.nombre.toLowerCase().includes(buscar.trim().toLowerCase()))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
  const alumno = alumnos.find((a) => a.id === abierto)

  return (
    <section className="pantalla">
      <div className="top">
        <div><h1>{T.Personas}</h1><p className="suave">{alumnos.filter((a) => a.activo).length} activos</p></div>
        <button className="btn btn-principal" onClick={() => setNuevo(true)}>+ Nuevo</button>
      </div>
      <label className="campo" htmlFor="buscar"><span hidden>Buscar</span>
        <input id="buscar" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar por nombre" />
      </label>
      <div className="tabs" role="tablist">
        <button className="tab" role="tab" aria-selected={!verInactivos} onClick={() => setVerInactivos(false)}>Activos</button>
        <button className="tab" role="tab" aria-selected={verInactivos} onClick={() => setVerInactivos(true)}>Ya no vienen</button>
      </div>
      {lista.length === 0 && <Vacio>{alumnos.length === 0 ? `Todavía no hay ${T.personas}. Toca "+ Nuevo" para agregar ${T.personaFemenino ? 'la primera' : 'el primero'}.` : `No hay ${T.personas} aquí.`}</Vacio>}
      <div className="lista">
        {lista.map((a) => {
          const [texto, pill] = TEXTO_PAGO[estadoPago(pagos.some((p) => p.alumnoId === a.id), mes, ajustes)]
          return (
            <button key={a.id} className="fila-item" onClick={() => setAbierto(a.id)}>
              <span className="ini">{iniciales(a.nombre)}</span>
              <div>
                <b>{a.nombre}</b>
                <small>{[a.instrumento, (a.clases ?? []).map((c) => `${DIAS[c.dia].slice(0, 3)} ${hora12(c.hora)}`).join(', ')].filter(Boolean).join(' · ') || `Sin ${T.clase} fij${T.c}`}</small>
              </div>
              {a.activo && <span className={`pill ${pill}`}>{texto}</span>}
            </button>
          )
        })}
      </div>
      {nuevo && <FormAlumno alumnos={alumnos} onCerrar={() => setNuevo(false)} />}
      {alumno && <Ficha alumno={alumno} alumnos={alumnos} ajustes={ajustes} pagado={pagos.some((p) => p.alumnoId === alumno.id)} mes={mes} onCerrar={() => setAbierto(null)} />}
    </section>
  )
}

function Ficha({ alumno: a, alumnos, ajustes, pagado, mes, onCerrar }: { alumno: Alumno; alumnos: Alumno[]; ajustes: Ajustes; pagado: boolean; mes: string; onCerrar: () => void }) {
  const [editando, setEditando] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')
  const [copiado, setCopiado] = useState(false)
  if (editando) return <FormAlumno alumno={a} alumnos={alumnos} onCerrar={() => setEditando(false)} />
  const [texto, pill] = TEXTO_PAGO[estadoPago(pagado, mes, ajustes)]
  const enlace = codigo ? `${location.origin}/?i=${codigo}` : ''

  async function invitar() {
    setError('')
    const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const nuevo = Array.from(crypto.getRandomValues(new Uint32Array(6)), (n) => letras[n % letras.length]).join('')
    try {
      await setDoc(doc(db, 'invitaciones', nuevo), { alumnoId: a.id, usada: false, creada: serverTimestamp() })
      setCodigo(nuevo)
    } catch (e) { setError(mensajeError(e)) }
  }
  async function copiar() {
    try { await navigator.clipboard.writeText(enlace); setCopiado(true) } catch { setCopiado(false) }
  }
  const textoInvitacion = `Hola ${a.nombre.split(' ')[0]}, te invito a la app de ${cliente.nombreApp}. Ahí verás tus ${T.clases}, tus pagos y el material. Ábrela aquí y entra con tu cuenta de Google: ${enlace}\n(Si te pide código: ${codigo})`

  return (
    <Hoja titulo={a.nombre} onCerrar={onCerrar}>
      <div className="fila">
        {a.activo ? <span className={`pill ${pill}`}>{texto} · {dinero(cuotaDe(a, ajustes), ajustes)}</span> : <span className="pill p-gris">Ya no viene</span>}
        {a.vinculado ? <span className="pill p-verde">Usa la app</span> : <span className="pill p-gris">Sin app todavía</span>}
      </div>
      <div className="panel">
        <p><b>{T.Clases} fij{T.c}s:</b> {(a.clases ?? []).map((c) => `${DIAS[c.dia]} ${hora12(c.hora)}`).join(', ') || (T.claseFemenino ? 'ninguna' : 'ninguno')}</p>
        {a.instrumento && <p><b>{T.detalle}:</b> {a.instrumento}{a.nivel ? ` · ${a.nivel}` : ''}</p>}
        {a.telefono && <p><b>Teléfono:</b> {a.telefono}</p>}
        {a.correo && <p><b>Correo:</b> {a.correo}</p>}
        {a.notas && <p className="suave">{a.notas}</p>}
      </div>
      {error && <p className="error">{error}</p>}
      {!a.vinculado && a.activo && (
        <div className="panel">
          <h3>Invitar a la app</h3>
          {!codigo ? <>
            <p className="suave chico">Se crea un enlace que sirve una sola vez. {T.laPersona[0].toUpperCase() + T.laPersona.slice(1)} lo abre y entra con su Google.</p>
            <button className="btn btn-principal" onClick={invitar}>{ICONOS.enlace}Crear invitación</button>
          </> : <>
            <p className="ok">Código: <b style={{ letterSpacing: '.12em' }}>{codigo}</b></p>
            <div className="fila">
              {a.telefono && <a className="btn btn-whatsapp" href={enlaceWhatsApp(a.telefono, textoInvitacion)} target="_blank" rel="noreferrer">{ICONOS.whatsapp}Enviar por WhatsApp</a>}
              <button className="btn btn-borde" onClick={copiar}>{copiado ? 'Copiado ✓' : 'Copiar enlace'}</button>
            </div>
          </>}
        </div>
      )}
      <div className="fila">
        {a.telefono && a.activo && !pagado && (
          <a className="btn btn-whatsapp" href={enlaceWhatsApp(a.telefono, textoRecordatorio(a, mes, ajustes))} target="_blank" rel="noreferrer">{ICONOS.whatsapp}Recordar pago</a>
        )}
        <button className="btn btn-borde" onClick={() => setEditando(true)}>Editar</button>
      </div>
    </Hoja>
  )
}

const VACIO: Omit<Alumno, 'id'> = { nombre: '', telefono: '', correo: '', instrumento: '', nivel: '', notas: '', activo: true, clases: [] }

function FormAlumno({ alumno, alumnos, onCerrar }: { alumno?: Alumno; alumnos: Alumno[]; onCerrar: () => void }) {
  const [f, setF] = useState<Omit<Alumno, 'id'>>(() => ({ ...VACIO, ...(alumno ?? {}) }))
  const [cuota, setCuota] = useState(alumno?.cuota ? String(alumno.cuota) : '')
  const [clase, setClase] = useState<Clase>({ dia: 1, hora: '16:00' })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const poner = (campo: keyof Omit<Alumno, 'id'>, valor: unknown) => setF((x) => ({ ...x, [campo]: valor }))

  async function guardar() {
    if (!f.nombre.trim()) { setError('Escribe el nombre.'); return }
    setGuardando(true); setError('')
    const datos = {
      nombre: f.nombre.trim(), telefono: f.telefono?.trim() ?? '', correo: f.correo?.trim() ?? '', instrumento: f.instrumento?.trim() ?? '',
      nivel: f.nivel?.trim() ?? '', notas: f.notas?.trim() ?? '', activo: f.activo, clases: f.clases ?? [], cuota: Number(cuota) || 0,
    }
    try {
      let id = alumno?.id
      if (id) await updateDoc(doc(db, 'alumnos', id), datos)
      else id = (await addDoc(col('alumnos'), { ...datos, creado: serverTimestamp() })).id
      const resto = alumnos.filter((a) => a.id !== id)
      await actualizarAgendaPublica([...resto, { id, ...datos }])
      onCerrar()
    } catch (e) { setError(mensajeError(e)); setGuardando(false) }
  }

  return (
    <Hoja titulo={alumno ? `Editar ${T.persona}` : T.nuevaPersona} onCerrar={onCerrar}>
      <div className="campos">
        <label className="campo" htmlFor="a-nombre">Nombre completo *<input id="a-nombre" value={f.nombre} onChange={(e) => poner('nombre', e.target.value)} /></label>
        <label className="campo" htmlFor="a-tel">WhatsApp<input id="a-tel" type="tel" inputMode="tel" value={f.telefono} onChange={(e) => poner('telefono', e.target.value)} placeholder="8888 8888" /></label>
        <label className="campo" htmlFor="a-inst">{T.detalle}<input id="a-inst" value={f.instrumento} onChange={(e) => poner('instrumento', e.target.value)} placeholder={cliente.ensena || T.detalleEjemplo} /></label>
        <label className="campo" htmlFor="a-nivel">Nivel<input id="a-nivel" value={f.nivel} onChange={(e) => poner('nivel', e.target.value)} placeholder="Ej. Principiante" /></label>
        <label className="campo" htmlFor="a-cuota">Cuota mensual<input id="a-cuota" type="number" inputMode="decimal" min={0} value={cuota} onChange={(e) => setCuota(e.target.value)} placeholder="La de siempre" /></label>
        <label className="campo" htmlFor="a-correo">Correo (opcional)<input id="a-correo" type="email" value={f.correo} onChange={(e) => poner('correo', e.target.value)} /></label>
      </div>
      <div className="panel">
        <h3>{T.Clases} fij{T.c}s cada semana</h3>
        <div className="fila">
          {(f.clases ?? []).map((c, i) => (
            <span key={`${c.dia}-${c.hora}`} className="pill p-principal">{DIAS[c.dia]} {hora12(c.hora)}{' '}
              <button aria-label="Quitar" style={{ border: 0, background: 'transparent', color: '#fff', fontWeight: 800 }}
                onClick={() => poner('clases', f.clases.filter((_, j) => j !== i))}>×</button>
            </span>
          ))}
          {(f.clases ?? []).length === 0 && <span className="suave chico">{T.claseFemenino ? 'Ninguna' : 'Ninguno'} todavía.</span>}
        </div>
        <div className="fila">
          <select aria-label="Día" className="btn btn-borde" value={clase.dia} onChange={(e) => setClase({ ...clase, dia: Number(e.target.value) })}>
            {DIAS.map((d, i) => <option key={d} value={i}>{d}</option>)}
          </select>
          <input aria-label="Hora" className="btn btn-borde" type="time" value={clase.hora} step={900} onChange={(e) => setClase({ ...clase, hora: e.target.value })} />
          <button className="btn btn-acento" onClick={() => !f.clases.some((c) => c.dia === clase.dia && c.hora === clase.hora) && poner('clases', [...f.clases, clase])}>Agregar</button>
        </div>
      </div>
      <label className="campo" htmlFor="a-notas">Notas<textarea id="a-notas" value={f.notas} onChange={(e) => poner('notas', e.target.value)} placeholder="Ej. Prepara el recital de diciembre" /></label>
      {alumno && <label className="check" htmlFor="a-activo"><input id="a-activo" type="checkbox" checked={f.activo} onChange={(e) => poner('activo', e.target.checked)} />Sigue viniendo a {T.clases}</label>}
      {error && <p className="error">{error}</p>}
      <button className="btn btn-principal" disabled={guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar'}</button>
    </Hoja>
  )
}
