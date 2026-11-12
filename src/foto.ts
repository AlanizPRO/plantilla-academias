// Achica una foto (ej. comprobante de transferencia) para guardarla dentro de Firestore en el plan gratis (Spark).
export async function fotoChica(archivo: File, maxLado = 1280, maxLetras = 350_000): Promise<string> {
  const url = URL.createObjectURL(archivo)
  try {
    const img = await new Promise<HTMLImageElement>((ok, mal) => {
      const i = new Image(); i.onload = () => ok(i); i.onerror = () => mal(new Error('No se pudo leer la foto.')); i.src = url
    })
    let lado = maxLado
    for (let intento = 0; intento < 6; intento++) {
      const escala = Math.min(1, lado / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * escala); c.height = Math.round(img.height * escala)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      const datos = c.toDataURL('image/jpeg', intento < 3 ? 0.7 : 0.55)
      if (datos.length <= maxLetras) return datos
      lado = Math.round(lado * 0.8)
    }
    throw new Error('La foto es muy grande. Toma una captura de pantalla del comprobante.')
  } finally { URL.revokeObjectURL(url) }
}
