const EXPLICIT_LOGOUT_KEY = 'axon_explicit_logout_pending'

export function markExplicitLogout() {
  localStorage.setItem(EXPLICIT_LOGOUT_KEY, 'true')
}

export function consumeExplicitLogout() {
  const wasExplicit = localStorage.getItem(EXPLICIT_LOGOUT_KEY) === 'true'
  localStorage.removeItem(EXPLICIT_LOGOUT_KEY)
  return wasExplicit
}
