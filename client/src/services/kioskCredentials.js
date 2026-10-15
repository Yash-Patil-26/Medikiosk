let enrollmentToken = null;
let sessionCredentials = null;

export function setKioskEnrollmentToken(token) {
  enrollmentToken =
    typeof token === 'string' && token.length >= 32 ? token : null;

  // A newly issued enrollment token starts a new kiosk identity flow.
  sessionCredentials = null;
}

export function getKioskEnrollmentToken() {
  return enrollmentToken;
}

export function clearKioskEnrollmentToken() {
  enrollmentToken = null;
}

export function setKioskSessionCredentials(sessionId, token) {
  if (
    typeof sessionId !== 'string' ||
    !sessionId ||
    typeof token !== 'string' ||
    token.length < 32
  ) {
    sessionCredentials = null;
    enrollmentToken = null;
    return false;
  }

  sessionCredentials = { id: sessionId, token };
  enrollmentToken = null;
  return true;
}

export function getKioskSessionCredentials() {
  return sessionCredentials ? { ...sessionCredentials } : null;
}

export function clearKioskSessionCredentials() {
  sessionCredentials = null;
}

export function clearKioskCredentials() {
  enrollmentToken = null;
  sessionCredentials = null;
}
