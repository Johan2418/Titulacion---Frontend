import { UserManager, WebStorageStateStore } from 'oidc-client-ts'
import { env } from '@/lib/env'

let manager: UserManager | null = null

/** RNF-01 / RNF-18: OIDC institucional con PKCE; el backend valida el JWT con JWKS. */
export function oidcManager() {
  if (!manager) {
    manager = new UserManager({
      authority: env.oidc.authority,
      client_id: env.oidc.clientId,
      redirect_uri: `${window.location.origin}/auth/callback`,
      post_logout_redirect_uri: `${window.location.origin}/login`,
      response_type: 'code',
      scope: env.oidc.scope,
      automaticSilentRenew: true,
      userStore: new WebStorageStateStore({ store: window.sessionStorage }),
    })
  }
  return manager
}
