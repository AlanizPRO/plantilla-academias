# Plantilla de academias

App para academias y profesores particulares: el profesor maneja alumnos, horarios, pagos, avisos y material; cada alumno entra con su cuenta de Google (por invitación) y ve solo lo suyo.

**No se edita a mano.** La Super App crea un repositorio por cliente desde esta plantilla y le escribe `src/cliente.json` (nombre, colores, profesor, cobro, módulos y datos públicos de Firebase).

## Funciona en Firebase Spark (gratis)

- Sin Cloud Functions ni Storage. Los permisos viven en `firestore.plantilla.rules`; `scripts/preparar.mjs` pone el correo del profesor y escribe `firestore.rules` al compilar.
- Material de estudio: enlaces de Google Drive.
- Recordatorios de pago: aviso en la app del alumno + botón de WhatsApp para el profesor.

## Lo que necesita el proyecto de Firebase del cliente

1. Authentication → Google habilitado.
2. Firestore creado (modo producción).
3. Una app web registrada (sus datos van en `cliente.json → firebase`).
4. La cuenta `publicador` de Carlos agregada como Editor.

## Publicar

En el repositorio del cliente: secreto `FIREBASE_SERVICE_ACCOUNT` y variable `PUBLICAR_APP = si`. Cada cambio en `main` se publica y a los usuarios les sale el aviso de "versión nueva".

## Datos (Firestore)

| Colección | Qué guarda | Quién lee |
| --- | --- | --- |
| `alumnos` | ficha, clases fijas, cuota | profesor; cada alumno la suya |
| `invitaciones/{código}` | enlace de un solo uso | quien tenga el código |
| `usuarios/{uid}` | qué alumno es esa cuenta | el mismo usuario y el profesor |
| `reservas` | fecha, hora, estado (sin nombres) | todos los usuarios |
| `pagos`, `avisos`, `materiales` | por alumno o para todos | profesor; alumno lo suyo |
| `ajustes/general`, `publico/agenda` | cuota, horario, horas ocupadas | todos los usuarios |
