// Palabras de cada negocio. Con esto la misma plantilla sirve para una academia (alumno, profesor, clase),
// un gimnasio (miembro, entrenador, sesión), un salón (cliente, estilista, cita), etc.
// Las escribe la Super App en src/cliente.json → "textos".
import { cliente } from './cliente'

const BASE = {
  admin: 'profesor',
  persona: 'alumno',
  personas: 'alumnos',
  personaFemenino: false,
  clase: 'clase',
  clases: 'clases',
  claseFemenino: true,
  detalle: 'Qué aprende',
  detalleEjemplo: 'Ej. Guitarra',
  material: 'Material de estudio',
  materialDescripcion: 'Documentos, audios y videos de Drive',
  tarea: 'tarea',
  tareas: 'tareas',
  programa: 'programa',
  programaDescripcion: 'Lo que va a aprender en el semestre',
}

const t = { ...BASE, ...((cliente as { textos?: Partial<typeof BASE> }).textos ?? {}) }
const may = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)
const oa = (f: boolean) => (f ? 'a' : 'o')

export const T = {
  ...t,
  Admin: may(t.admin),
  Persona: may(t.persona),
  Personas: may(t.personas),
  Clase: may(t.clase),
  Clases: may(t.clases),
  /** "Nuevo alumno" / "Nueva clienta" */
  nuevaPersona: `${t.personaFemenino ? 'Nueva' : 'Nuevo'} ${t.persona}`,
  /** "el alumno" / "la clienta" */
  laPersona: `${t.personaFemenino ? 'la' : 'el'} ${t.persona}`,
  /** "un alumno" / "una clienta" */
  unaPersona: `${t.personaFemenino ? 'una' : 'un'} ${t.persona}`,
  /** "a" para clase (femenino), "o" para turno (masculino) */
  c: oa(t.claseFemenino),
  /** "la clase" / "el turno" */
  laClase: `${t.claseFemenino ? 'la' : 'el'} ${t.clase}`,
  /** "una clase" / "un turno" */
  unaClase: `${t.claseFemenino ? 'una' : 'un'} ${t.clase}`,
  /** "esta clase" / "este turno" */
  estaClase: `${t.claseFemenino ? 'esta' : 'este'} ${t.clase}`,
  /** "Tu próxima clase" / "Tu próximo turno" */
  tuProxima: `Tu próxim${oa(t.claseFemenino)} ${t.clase}`,
  /** "tus alumnos" */
  tusPersonas: `tus ${t.personas}`,
  /** "tu profesor" */
  tuAdmin: `tu ${t.admin}`,
  Tarea: may(t.tarea),
  Tareas: may(t.tareas),
  Programa: may(t.programa),
}
