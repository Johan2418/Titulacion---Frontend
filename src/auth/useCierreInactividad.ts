import { useEffect, useRef } from 'react'

/** Inactividad (sin puntero ni teclado en ninguna pestaña) tras la cual se cierra la sesión. */
export const INACTIVIDAD_MS = 30 * 60 * 1000

/** Como máximo una escritura/difusión de actividad cada tanto, para no saturar el almacenamiento. */
const ESCRITURA_MIN_MS = 5_000
/** Ventana en la que otra pestaña ya está cerrando la sesión por inactividad. */
const RECLAMO_MS = 10_000

const EVENTOS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const

const CANAL = 'titulacion-sesion'
const CLAVE_ACTIVIDAD = 'titulacion-ultima-actividad'
const CLAVE_CIERRE = 'titulacion-sesion-cerrada'
const CLAVE_RECLAMO = 'titulacion-cierre-en-curso'

/** Identifica a esta pestaña para ignorar sus propios avisos. */
const ORIGEN = Math.random().toString(36).slice(2)

type Mensaje = { tipo: 'actividad'; ts: number } | { tipo: 'cerrada'; origen: string }

// Solo se guardan marcas de tiempo e identificadores aleatorios: nunca tokens ni datos de usuario.
function leer(clave: string): string | null {
  try {
    return localStorage.getItem(clave)
  } catch {
    return null
  }
}

function escribir(clave: string, valor: string) {
  try {
    localStorage.setItem(clave, valor)
  } catch {
    /* modo privado o almacenamiento bloqueado: se sigue solo con el canal y la memoria */
  }
}

function abrirCanal(): BroadcastChannel | null {
  try {
    return typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CANAL)
  } catch {
    return null
  }
}

/**
 * Avisa a las demás pestañas que la sesión se cerró (cierre explícito o por inactividad) para que
 * limpien su estado local sin llamar al servidor. `origen` solo se cambia en pruebas.
 */
export function avisarSesionCerrada(origen = ORIGEN) {
  const canal = abrirCanal()
  try {
    canal?.postMessage({ tipo: 'cerrada', origen } satisfies Mensaje)
  } catch {
    /* canal cerrado */
  }
  canal?.close()
  // respaldo cuando no hay BroadcastChannel: el evento `storage` llega a las otras pestañas
  escribir(CLAVE_CIERRE, `${origen}|${Date.now()}`)
}

interface Opciones {
  ms?: number
  /** Origen de los eventos de entrada (por defecto `window`; las pruebas simulan pestañas). */
  destino?: EventTarget
}

/**
 * Cierra la sesión tras 30 minutos sin actividad en NINGUNA pestaña del navegador. La actividad se
 * comparte por BroadcastChannel (con una marca de tiempo en localStorage como respaldo y fuente al
 * arrancar). Al vencer el plazo, o al volver a ser visible la pestaña, se decide con la marca
 * compartida y no con una cuenta local, que el navegador puede atrasar en pestañas ocultas.
 * `alInactivo` cierra la sesión aquí; `alCerrarEnOtraPestana` solo limpia el estado local.
 */
export function useCierreInactividad(
  alInactivo: () => void,
  alCerrarEnOtraPestana: () => void,
  { ms = INACTIVIDAD_MS, destino }: Opciones = {},
) {
  const callbacks = useRef({ alInactivo, alCerrarEnOtraPestana })
  useEffect(() => {
    callbacks.current = { alInactivo, alCerrarEnOtraPestana }
  })

  useEffect(() => {
    const origenEventos: EventTarget = destino ?? window
    const canal = abrirCanal()
    let temporizador: ReturnType<typeof setTimeout> | undefined
    let cerrado = false
    let ultimaPropia = Date.now()
    let ultimaRecibida = 0
    let ultimaEscrita = 0

    const compartida = () => {
      const guardada = Number(leer(CLAVE_ACTIVIDAD))
      return Math.max(ultimaPropia, ultimaRecibida, Number.isFinite(guardada) ? guardada : 0)
    }

    const publicar = (ts: number) => {
      ultimaEscrita = ts
      escribir(CLAVE_ACTIVIDAD, String(ts))
      try {
        canal?.postMessage({ tipo: 'actividad', ts } satisfies Mensaje)
      } catch {
        /* canal cerrado */
      }
    }

    const detener = () => {
      cerrado = true
      clearTimeout(temporizador)
    }

    /** Evita que dos pestañas cierren a la vez: gana quien escribe el reclamo y lo lee de vuelta. */
    const miReclamo = Math.random().toString(36).slice(2)
    const reclamarCierre = () => {
      const ahora = Date.now()
      const [duenio, desde] = (leer(CLAVE_RECLAMO) ?? '').split('|')
      if (duenio && duenio !== miReclamo && ahora - Number(desde) < RECLAMO_MS) return false
      escribir(CLAVE_RECLAMO, `${miReclamo}|${ahora}`)
      const leido = leer(CLAVE_RECLAMO)
      return leido === null || leido.startsWith(`${miReclamo}|`)
    }

    const evaluar = () => {
      if (cerrado) return
      clearTimeout(temporizador)
      const restante = compartida() + ms - Date.now()
      if (restante > 0) {
        temporizador = setTimeout(evaluar, restante)
        return
      }
      if (!reclamarCierre()) {
        // otra pestaña ya está cerrando: se espera su aviso (y, si no llega, se reevalúa)
        temporizador = setTimeout(evaluar, RECLAMO_MS)
        return
      }
      detener()
      callbacks.current.alInactivo()
    }

    const alActividad = () => {
      if (cerrado) return
      const ahora = Date.now()
      ultimaPropia = ahora
      if (ahora - ultimaEscrita >= ESCRITURA_MIN_MS) publicar(ahora)
    }

    const alRecibir = (m: Mensaje) => {
      if (cerrado) return
      if (m.tipo === 'actividad') {
        if (Number.isFinite(m.ts)) ultimaRecibida = Math.max(ultimaRecibida, m.ts)
      } else if (m.origen !== ORIGEN) {
        detener()
        callbacks.current.alCerrarEnOtraPestana()
      }
    }

    const alAlmacenar = (e: StorageEvent) => {
      if (e.key === CLAVE_ACTIVIDAD) {
        const ts = Number(e.newValue)
        if (Number.isFinite(ts)) ultimaRecibida = Math.max(ultimaRecibida, ts)
      } else if (e.key === CLAVE_CIERRE && e.newValue) {
        alRecibir({ tipo: 'cerrada', origen: e.newValue.split('|')[0] })
      }
    }

    const alVolverVisible = () => {
      if (document.visibilityState !== 'hidden') evaluar()
    }

    if (canal) canal.onmessage = (e: MessageEvent<Mensaje>) => alRecibir(e.data)
    for (const e of EVENTOS) origenEventos.addEventListener(e, alActividad, { passive: true })
    window.addEventListener('storage', alAlmacenar)
    document.addEventListener('visibilitychange', alVolverVisible)

    publicar(ultimaPropia) // abrir la aplicación cuenta como actividad
    evaluar()

    return () => {
      clearTimeout(temporizador)
      for (const e of EVENTOS) origenEventos.removeEventListener(e, alActividad)
      window.removeEventListener('storage', alAlmacenar)
      document.removeEventListener('visibilitychange', alVolverVisible)
      if (canal) canal.onmessage = null
      canal?.close()
    }
  }, [ms, destino])
}
