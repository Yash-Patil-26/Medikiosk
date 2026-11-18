// Kiosk session tokens stay in memory and are scoped to their exact session ID.
// Patient account authentication uses the HttpOnly server cookie instead.
let sessionCredentials = null;

export function setKioskSessionCredentials(sessionId, token) {
  if (
    typeof sessionId !== 'string' ||
    !sessionId ||
    typeof token !== 'string' ||
    token.length < 32
  ) {
    sessionCredentials = null;
    return false;
  }
  sessionCredentials = { id: sessionId, token };
  return true;
}

export function getKioskSessionCredentials() {
  return sessionCredentials ? { ...sessionCredentials } : null;
}

export function clearKioskSessionCredentials() {
  sessionCredentials = null;
}

export function clearKioskCredentials() {
  clearKioskSessionCredentials();
}
