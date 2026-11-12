// Datos de esta academia. Los escribe la Super App en src/cliente.json.
import datos from './cliente.json'

export type Modulo = 'alumnos' | 'horarios' | 'pagos' | 'avisos' | 'reservas' | 'materiales' | 'tareas' | 'programas' | 'calendario'

export const cliente = datos
export const correoAdmin = datos.correoAdmin.trim().toLowerCase()
export const tiene = (m: Modulo) => (datos.modulos as string[]).includes(m)
/** Logo propio (archivo en public/, ej. "/logo.png"). Si no hay, se usan las iniciales. */
export const logo = (datos as { logo?: string }).logo ?? ''
/** Logo completo, ancho (ej. "/logo-ancho.jpg"): sale en la pantalla de entrada y en los recibos. */
export const logoAncho = (datos as { logoAncho?: string }).logoAncho ?? ''
