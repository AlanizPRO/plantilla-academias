import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './estilos.css'
import App from './App'
import { cliente } from './cliente'
import { guardarInvitacionDeLaUrl } from './sesion'

// Colores de esta academia (desde src/cliente.json).
const raiz = document.documentElement.style
raiz.setProperty('--principal', cliente.colorPrincipal)
raiz.setProperty('--acento', cliente.colorAcento)
raiz.setProperty('--fondo', cliente.colorFondo)

guardarInvitacionDeLaUrl()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
