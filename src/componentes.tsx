import { useEffect, type ReactNode } from 'react'
import { cliente, logo } from './cliente'
import { iniciales } from './datos'
import { ICONOS } from './iconos'

export function Logo() {
  if (logo) return <img className="logo logo-img" src={logo} alt="" aria-hidden="true" />
  return <div className="logo" aria-hidden="true">{iniciales(cliente.nombreApp)}</div>
}

export function Encabezado({ subtitulo, derecha }: { subtitulo: string; derecha: ReactNode }) {
  return (
    <header className="top">
      <div className="marca">
        <Logo />
        <div style={{ minWidth: 0 }}><h3>{cliente.nombreApp}</h3><small className="suave">{subtitulo}</small></div>
      </div>
      <div className="fila" style={{ flexWrap: 'nowrap' }}>{derecha}</div>
    </header>
  )
}

export type Pestana = { id: string; nombre: string; icono: string; punto?: boolean }

export function Barra({ pestanas, actual, onIr }: { pestanas: Pestana[]; actual: string; onIr: (id: string) => void }) {
  return (
    <nav className="nav" aria-label="Secciones">
      <div className="nav-in">
        {pestanas.map((p) => (
          <button key={p.id} onClick={() => onIr(p.id)} aria-current={actual === p.id ? 'page' : undefined}>
            {ICONOS[p.icono]}{p.nombre}{p.punto && <span className="punto" aria-label="pendiente" />}
          </button>
        ))}
      </div>
    </nav>
  )
}

// Ventana que sube desde abajo, cómoda en el celular.
export function Hoja({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: ReactNode }) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    addEventListener('keydown', tecla)
    document.body.style.overflow = 'hidden'
    return () => { removeEventListener('keydown', tecla); document.body.style.overflow = '' }
  }, [onCerrar])
  return (
    <div className="fondo-hoja" onClick={onCerrar}>
      <div className="hoja" role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <div className="cabeza"><h2>{titulo}</h2><button className="btn btn-borde btn-chico" onClick={onCerrar}>Cerrar</button></div>
        {children}
      </div>
    </div>
  )
}

export function Vacio({ children }: { children: ReactNode }) {
  return <div className="panel vacio">{children}</div>
}

// Foto ampliada (comprobantes de pago).
export function VerFoto({ src, onCerrar }: { src: string; onCerrar: () => void }) {
  return (
    <div className="fondo-hoja" style={{ alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onCerrar}>
      <img src={src} alt="Comprobante" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 12 }} />
    </div>
  )
}

export function Progreso({ valor, total }: { valor: number; total: number }) {
  const pct = total ? Math.round((valor / total) * 100) : 0
  return (
    <div className="progreso" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${pct}%` }} />
    </div>
  )
}
