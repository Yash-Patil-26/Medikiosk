import axios from 'axios';
import {
  clearKioskCredentials,

  getKioskEnrollmentToken,
  getKioskSessionCredentials,
  setKioskEnrollmentToken,
  setKioskSessionCredentials
} from './kioskCredentials.js';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true
});

function isLocalApiRequest(config) {
  const baseURL = String(config.baseURL || '').trim();

  // Never attach or consume kiosk credentials if the API base is overridden.
  if (baseURL !== '/api') return false;

  const value = String(config.url || '').trim();

  // Reject absolute URLs and protocol-relative URLs.
  return value.startsWith('/') && !value.startsWith('//');
}

function normalizePath(url) {
  let path = String(url || '').split('?')[0];

  if (/^https?:\/\//i.test(path)) {
    try {
      path = new URL(path).pathname;
    } catch {
      return path;
    }
  }

  if (path === '/api') return '/';
  if (path.startsWith('/api/')) path = path.slice(4);

  return path;
}

function readBody(data) {
  if (data && typeof data === 'object') return data;

  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  return null;
}

function setHeader(config, name, value) {
  if (!config.headers) config.headers = {};

  if (typeof config.headers.set === 'function') {
    config.headers.set(name, value);
  } else {
    config.headers[name] = value;
  }
}

api.interceptors.request.use(config => {
  if (!isLocalApiRequest(config)) {
    return config;
  }

  const requestUrl = String(config.url || '').trim();
  const method = String(config.method || 'get').toLowerCase();
  const path = normalizePath(requestUrl);

  // Enrollment credentials are used only to create the next session.
  if (method === 'post' && path === '/sessions') {
    const token = getKioskEnrollmentToken();

    if (token) {
      setHeader(config, 'X-Kiosk-Enrollment-Token', token);
    }

    return config;
  }

  const credentials = getKioskSessionCredentials();
  if (!credentials) return config;

  const body = readBody(config.data);
  const sessionId = credentials.id;

  let authorized = false;
  let isDocumentExtraction = false;

  const sessionPath = path.match(/^\/sessions\/([^/]+)$/);
  if (
    sessionPath &&
    ['get', 'patch', 'delete'].includes(method) &&
    decodeURIComponent(sessionPath[1]) === sessionId
  ) {
    authorized = true;
  }

  const dialoguePath = path.match(/^\/dialogue\/([^/]+)\/(?:next|answer)$/);
  if (
    dialoguePath &&
    ['get', 'post'].includes(method) &&
    decodeURIComponent(dialoguePath[1]) === sessionId
  ) {
    authorized = true;
  }

  if (
    method === 'post' &&
    path === '/consents' &&
    body?.session_id === sessionId
  ) {
    authorized = true;
  }

  if (
    method === 'post' &&
    /^\/consents\/[^/]+\/revoke$/.test(path) &&
    body?.session_id === sessionId
  ) {
    authorized = true;
  }

  if (method === 'post' && path === '/documents/extract') {
    authorized = true;
    isDocumentExtraction = true;
  }

  if (
    method === 'post' &&
    /^\/documents\/[^/]+\/verify$/.test(path) &&
    body?.session_id === sessionId
  ) {
    authorized = true;
  }

  if (
    method === 'post' &&
    path === '/encounters' &&
    body?.session_id === sessionId
  ) {
    authorized = true;
  }

  if (authorized) {
    setHeader(config, 'X-Kiosk-Token', credentials.token);

    if (isDocumentExtraction) {
      setHeader(config, 'X-Kiosk-Session-Id', credentials.id);
    }
    
    console.log('API Request:', { method, path, authorized, hasToken: !!credentials.token, sessionId: credentials.id });
  }

  return config;
});

api.interceptors.response.use(response => {
  const config = response.config || {};
  if (!isLocalApiRequest(config)) {
    return response;
  }

  const responseUrl = String(config.url || '').trim();
  const method = String(config.method || 'get').toLowerCase();
  const path = normalizePath(responseUrl);
  const data = response.data;

  // The opaque enrollment token is never placed in React state or storage.
  if (method === 'post' && path === '/patients') {
    if (typeof data?.enrollmentToken === 'string') {
      setKioskEnrollmentToken(data.enrollmentToken);
    } else {
      clearKioskCredentials();
    }
  }

  if (method === 'post' && path === '/sessions') {
    if (data?.id && typeof data.kioskToken === 'string') {
      setKioskSessionCredentials(data.id, data.kioskToken);
    } else {
      clearKioskCredentials();
    }
  }



  return response;
});

export default api;
