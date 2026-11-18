import { afterEach, describe, expect, it } from 'vitest';
import api from './api.js';
import {
  clearKioskCredentials,
  getKioskSessionCredentials,
  setKioskSessionCredentials
} from './kioskCredentials.js';

afterEach(() => clearKioskCredentials());

function readHeader(headers, name) {
  if (typeof headers?.get === 'function') return headers.get(name);
  return headers?.[name] ?? headers?.[name.toLowerCase()];
}

function successfulAdapter(data, inspect) {
  return async config => {
    inspect?.(config);
    return { data, status: 200, statusText: 'OK', headers: {}, config };
  };
}

describe('kiosk session credentials', () => {
  it('attaches a token only when the request belongs to the same session', async () => {
    const token = 'session-token-12345678901234567890123456789012';
    setKioskSessionCredentials('session-one', token);
    let observedHeader;
    await api.post('/encounters', { session_id: 'session-one' }, {
      adapter: successfulAdapter({ id: 1 }, config => {
        observedHeader = readHeader(config.headers, 'X-Kiosk-Token');
      })
    });
    expect(observedHeader).toBe(token);
  });

  it('does not attach a token to a different session', async () => {
    const token = 'session-token-12345678901234567890123456789012';
    setKioskSessionCredentials('session-one', token);
    let observedHeader;
    await api.post('/encounters', { session_id: 'session-two' }, {
      adapter: successfulAdapter({ id: 2 }, config => {
        observedHeader = readHeader(config.headers, 'X-Kiosk-Token');
      })
    });
    expect(observedHeader).toBeUndefined();
    expect(getKioskSessionCredentials()?.id).toBe('session-one');
  });

  it('does not send session credentials to an external URL', async () => {
    const token = 'session-token-12345678901234567890123456789012';
    setKioskSessionCredentials('session-one', token);
    let observedHeader;
    await api.get('https://external.example/sessions/session-one', {
      adapter: successfulAdapter({ ok: true }, config => {
        observedHeader = readHeader(config.headers, 'X-Kiosk-Token');
      })
    });
    expect(observedHeader).toBeUndefined();
    expect(getKioskSessionCredentials()?.id).toBe('session-one');
  });

  it('does not use kiosk session credentials to submit the removed per-session consent grant endpoint', async () => {
    const token = 'session-token-12345678901234567890123456789012';
    setKioskSessionCredentials('session-one', token);
    let observedHeader;
    await api.post('/consents', { session_id: 'session-one', purpose_key: 'voice', granted: true }, {
      adapter: successfulAdapter({ ok: true }, config => {
        observedHeader = readHeader(config.headers, 'X-Kiosk-Token');
      })
    });
    expect(observedHeader).toBeUndefined();
  });

  it('stores a valid session token returned by authenticated session creation', async () => {
    const token = 'session-token-12345678901234567890123456789012';
    await api.post('/sessions', {}, {
      adapter: successfulAdapter({ id: 'session-demo', kioskToken: token })
    });
    expect(getKioskSessionCredentials()).toEqual({ id: 'session-demo', token });
  });

  it('clears credentials when the session credential response is malformed', async () => {
    setKioskSessionCredentials('session-old', 'session-token-12345678901234567890123456789012');
    await api.post('/sessions', {}, {
      adapter: successfulAdapter({ id: 'session-new' })
    });
    expect(getKioskSessionCredentials()).toBeNull();
  });
});
