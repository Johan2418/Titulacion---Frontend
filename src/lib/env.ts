export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? '/api/v1',
  useMocks: import.meta.env.VITE_USE_MOCKS === 'true',
  timezone: import.meta.env.VITE_TIMEZONE ?? 'America/Guayaquil',
  oidc: {
    authority: import.meta.env.VITE_OIDC_AUTHORITY ?? '',
    clientId: import.meta.env.VITE_OIDC_CLIENT_ID ?? '',
    scope: import.meta.env.VITE_OIDC_SCOPE ?? 'openid profile email',
  },
}
