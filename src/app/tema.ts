import { useEffect, useState } from 'react'

const CLAVE = 'titulacion.temaOscuro'

function inicial() {
  try {
    const guardado = localStorage.getItem(CLAVE)
    if (guardado !== null) return guardado === 'true'
  } catch {
    // sin almacenamiento
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

export function useTema() {
  const [oscuro, setOscuro] = useState(inicial)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', oscuro)
    try {
      localStorage.setItem(CLAVE, String(oscuro))
    } catch {
      // sin almacenamiento
    }
  }, [oscuro])
  return { oscuro, alternar: () => setOscuro((v) => !v) }
}

export function aplicarTemaInicial() {
  document.documentElement.classList.toggle('dark', inicial())
}
