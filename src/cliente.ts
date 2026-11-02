// Datos de esta academia. Los escribe la Super App en src/cliente.json.
import datos from './cliente.json'

export type Modulo = 'alumnos' | 'horarios' | 'pagos' | 'avisos' | 'reservas' | 'materiales'

export const cliente = datos
export const correoAdmin = datos.correoAdmin.trim().toLowerCase()
export const tiene = (m: Modulo) => (datos.modulos as string[]).includes(m)
