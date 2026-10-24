export const env = {
  /** Base de la API. En desarrollo Vite redirige `/api/v1` al backend (ver vite.config.ts). */
  apiUrl: import.meta.env.VITE_API_URL ?? '/api/v1',
  timezone: import.meta.env.VITE_TIMEZONE ?? 'America/Guayaquil',
}
