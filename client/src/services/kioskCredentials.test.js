import { afterEach, describe, expect, it } from 'vitest';
import api from './api.js';
import {
  clearKioskCredentials,
  getKioskEnrollmentToken,
  getKioskSessionCredentials,
  setKioskSessionCredentials
} from './kioskCredentials.js';

afterEach(() => {
  clearKioskCredentials();
});

function readHeader(headers, name) {
  if (typeof headers?.get === 'function') {
    return headers.get(name);
  }

  return headers?.[name] ?? headers?.[name.toLowerCase()];
}

function successfulAdapter(data, inspect) {
  return async config => {
    inspect?.(config);

    return {
      data,
      status: 200,
      statusText: 'OK',
      headers: {},
      config
    };
  };
}

describe('kiosk API credentials', () => {
  it('retains the session credential until the UI validates purge proof', async () => {
    const token = 'session-token-12345678901234567890123456789012';
    setKioskSessionCredentials('session-demo', token);

    await api.delete('/sessions/session-demo', {
      adapter: successfulAdapter(
        // Deliberately incomplete purge proof.
        { purged: true },
        config => {
          expect(readHeader(config.headers, 'X-Kiosk-Token')).toBe(token);
        }
      )
    });

    expect(getKioskSessionCredentials()).toEqual({
      id: 'session-demo',
      token
    });
  });

  it('does not attach the session credential to another session', async () => {
    const token = 'session-token-12345678901234567890123456789012';
    setKioskSessionCredentials('session-one', token);

    let observedHeader;

    await api.post(
      '/encounters',
      { session_id: 'session-two' },
      {
        adapter: successfulAdapter(
          { id: 1 },
          config => {
            observedHeader = readHeader(config.headers, 'X-Kiosk-Token');
          }
        )
      }
    );

    expect(observedHeader).toBeUndefined();
    expect(getKioskSessionCredentials()?.id).toBe('session-one');
  });

  it('attaches the token when the requested session matches', async () => {
    const token = 'session-token-12345678901234567890123456789012';
    setKioskSessionCredentials('session-one', token);

    let observedHeader;

    await api.post(
      '/encounters',
      { session_id: 'session-one' },
      {
        adapter: successfulAdapter(
          { id: 1 },
          config => {
            observedHeader = readHeader(config.headers, 'X-Kiosk-Token');
          }
        )
      }
    );

    expect(observedHeader).toBe(token);
  });

  it('does not send kiosk credentials to an external URL', async () => {
    const token = 'session-token-12345678901234567890123456789012';
    setKioskSessionCredentials('session-one', token);

    let observedHeader;

    await api.get(
      'https://external.example/sessions/session-one',
      {
        adapter: successfulAdapter(
          { ok: true },
          config => {
            observedHeader = readHeader(config.headers, 'X-Kiosk-Token');
          }
        )
      }
    );

    expect(observedHeader).toBeUndefined();
    expect(getKioskSessionCredentials()?.id).toBe('session-one');
  });

  it('ignores enrollment tokens returned by an external URL', async () => {
    await api.post(
      'https://external.example/patients',
      {},
      {
        adapter: successfulAdapter({
          id: 123,
          enrollmentToken: 'external-token-12345678901234567890123456789012'
        })
      }
    );

    expect(getKioskEnrollmentToken()).toBeNull();
  });

  it('does not send kiosk credentials when baseURL is external', async () => {
    const token = 'session-token-12345678901234567890123456789012';
    setKioskSessionCredentials('session-one', token);

    let observedHeader;

    await api.get('/sessions/session-one', {
      baseURL: 'https://external.example',
      adapter: successfulAdapter(
        { ok: true },
        config => {
          observedHeader = readHeader(config.headers, 'X-Kiosk-Token');
        }
      )
    });

    expect(observedHeader).toBeUndefined();
  });

  it('ignores enrollment tokens when baseURL is external', async () => {
    await api.post(
      '/patients',
      {},
      {
        baseURL: 'https://external.example',
        adapter: successfulAdapter({
          id: 123,
          enrollmentToken: 'external-token-12345678901234567890123456789012'
        })
      }
    );

    expect(getKioskEnrollmentToken()).toBeNull();
  });
});
