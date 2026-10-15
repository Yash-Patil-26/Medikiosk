import { getSession } from '../utils/sessionAccess.js';
import { matchesOpaqueToken } from '../utils/opaqueToken.js';

export function requireKioskSessionToken(resolveSessionId) {
  if (typeof resolveSessionId !== 'function') {
    throw new TypeError('A session ID resolver function is required');
  }

  return async function kioskSessionAuthorization(req, res, next) {
    const sessionId = resolveSessionId(req);
    const token = req.get('X-Kiosk-Token');

    if (typeof sessionId !== 'string' || !token) {
      return res.status(401).json({
        error: 'Kiosk session authorization required'
      });
    }

    try {
      const session = await getSession(sessionId);

      if (!session || !matchesOpaqueToken(token, session.kiosk_token_hash)) {
        return res.status(401).json({
          error: 'Invalid kiosk session authorization'
        });
      }

      req.kioskSession = {
        id: session.id,
        patient_id: session.patient_id,
        status: session.status
      };

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

export function requireMatchingKioskSession(req, res, next) {
  const authenticatedSessionId = req.kioskSession?.id;
  const submittedSessionId = req.body?.session_id;

  if (typeof submittedSessionId !== 'string' || !submittedSessionId) {
    return res.status(400).json({ error: 'session_id required' });
  }

  if (
    typeof authenticatedSessionId !== 'string' ||
    authenticatedSessionId !== submittedSessionId
  ) {
    return res.status(403).json({
      error: 'Session does not match kiosk authorization'
    });
  }

  return next();
}
