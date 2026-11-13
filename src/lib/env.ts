export const env = {
  /** Base de la API. En desarrollo Vite redirige `/api/v1` al backend (ver vite.config.ts). */
  apiUrl: import.meta.env.VITE_API_URL ?? '/api/v1',
  timezone: import.meta.env.VITE_TIMEZONE ?? 'America/Guayaquil',
  /** Orígenes permitidos para las URL de descarga (separados por coma). Vacío: cualquier https. */
  storageOrigins: (import.meta.env.VITE_STORAGE_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean),
}
