import type { ReactNode } from 'react'

const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export const ICONOS: Record<string, ReactNode> = {
  inicio: <svg {...base}><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h14V10" /></svg>,
  alumnos: <svg {...base}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.7c1.8.8 3 2.6 3.5 5.3" /></svg>,
  horario: <svg {...base}><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /><path d="M12 13v3l2 1" /></svg>,
  pagos: <svg {...base}><rect x="2.5" y="6" width="19" height="13" rx="2" /><path d="M2.5 10h19M6 15h4" /></svg>,
  avisos: <svg {...base}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>,
  materiales: <svg {...base}><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></svg>,
  mas: <svg {...base}><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></svg>,
  ajustes: <svg {...base}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" /></svg>,
  whatsapp: <svg {...base}><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z" /><path d="M9 9.5c.3 2 2.5 4.2 4.5 4.5l1-1 1.8.8c-.2 1-1 1.7-2 1.7C11 15.5 8.5 13 8.5 10.2c0-1 .7-1.8 1.7-2l.8 1.8z" /></svg>,
  sol: <svg {...base}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>,
  luna: <svg {...base}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></svg>,
  tareas: <svg {...base}><path d="M9 5h10M9 12h10M9 19h10" /><path d="m3.5 5 1.5 1.5L7.5 4M3.5 12l1.5 1.5L7.5 11M3.5 19l1.5 1.5L7.5 18" /></svg>,
  programa: <svg {...base}><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M4 21.5V4.5M9 7h7M9 11h5" /></svg>,
  calendario: <svg {...base}><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /><path d="M8 14h2M14 14h2M8 17h2" /></svg>,
  estudio: <svg {...base}><path d="M2 8.5 12 4l10 4.5-10 4.5z" /><path d="M6 10.5V16c2 2 10 2 12 0v-5.5M22 8.5V14" /></svg>,
  enlace: <svg {...base}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>,
}
