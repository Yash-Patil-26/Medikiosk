export const CONSENT_PURPOSES = Object.freeze(['voice', 'document', 'his', 'dashboard']);
export const CONSENT_NOTICE_VERSION = '1.0';
export const ALLOWED_LANGUAGES = Object.freeze(['en', 'hi', 'mr']);
export const ALLOWED_SEX_VALUES = Object.freeze(['male', 'female', 'other', 'prefer_not_to_say']);
export const ALLOWED_IDENTIFIER_TYPES = Object.freeze(['abha', 'mobile', 'email']);

export function normalizePatientIdentifier(type, value) {
  if (typeof type !== 'string' || typeof value !== 'string') {
    return { valid: false, error: 'Enter a login identifier.' };
  }

  const clean = value.trim();
  if (!clean || clean.length > 254) {
    return { valid: false, error: 'Enter a valid login identifier.' };
  }

  if (type === 'abha') {
    const normalized = clean.replace(/[\s-]/g, '');
    if (!/^\d{14}$/.test(normalized)) {
      return { valid: false, error: 'Enter a 14-digit ABHA number.' };
    }
    return { valid: true, value: normalized };
  }

  if (type === 'mobile') {
    if (!/^[+()\d\s-]+$/.test(clean)) {
      return { valid: false, error: 'Enter a valid 10-digit Indian mobile number.' };
    }
    let digits = clean.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    if (!/^[6-9]\d{9}$/.test(digits)) {
      return { valid: false, error: 'Enter a valid 10-digit Indian mobile number.' };
    }
    return { valid: true, value: digits };
  }

  if (type === 'email') {
    const normalized = clean.toLowerCase();
    if (
      normalized.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
    ) {
      return { valid: false, error: 'Enter a valid email address.' };
    }
    return { valid: true, value: normalized };
  }

  return { valid: false, error: 'Choose ABHA number, mobile number or email as your login ID.' };
}

function isValidPastOrTodayDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return false;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return date.getTime() <= today.getTime();
}

export function validatePatientRegistration(body = {}) {
  const role = body.role || 'patient';
  
  if (role === 'patient') {
    const allowed = new Set([
      'role', 'display_name', 'date_of_birth', 'sex', 'preferred_language',
      'identifier_type', 'identifier', 'password'
    ]);
    const unsupported = Object.keys(body).filter(key => !allowed.has(key));
    if (unsupported.length) {
      return { valid: false, error: 'Unsupported registration fields.', fields: unsupported };
    }

    const displayName = typeof body.display_name === 'string' ? body.display_name.trim() : '';
    if (displayName.length < 2 || displayName.length > 100) {
      return { valid: false, error: 'Enter your full name (2 to 100 characters).' };
    }

    if (!isValidPastOrTodayDate(body.date_of_birth)) {
      return { valid: false, error: 'Enter a valid date of birth that is not in the future.' };
    }

    if (!ALLOWED_SEX_VALUES.includes(body.sex)) {
      return { valid: false, error: 'Choose a valid sex option.' };
    }

    if (!ALLOWED_LANGUAGES.includes(body.preferred_language)) {
      return { valid: false, error: 'Choose English, Hindi or Marathi.' };
    }

    const identifier = normalizePatientIdentifier(body.identifier_type, body.identifier);
    if (!identifier.valid) return identifier;

    if (typeof body.password !== 'string' || body.password.length < 10 || body.password.length > 128) {
      return { valid: false, error: 'Use a password between 10 and 128 characters.' };
    }

    return {
      valid: true,
      value: {
        display_name: displayName,
        date_of_birth: body.date_of_birth,
        sex: body.sex,
        preferred_language: body.preferred_language,
        identifier_type: body.identifier_type,
        identifier: identifier.value,
        password: body.password
      }
    };
  } else if (role === 'doctor') {
    const allowed = new Set(['role', 'display_name', 'password']);
    const unsupported = Object.keys(body).filter(key => !allowed.has(key));
    if (unsupported.length) {
      return { valid: false, error: 'Unsupported registration fields.', fields: unsupported };
    }

    const displayName = typeof body.display_name === 'string' ? body.display_name.trim() : '';
    if (displayName.length < 2 || displayName.length > 100) {
      return { valid: false, error: 'Enter your full name (2 to 100 characters).' };
    }

    if (typeof body.password !== 'string' || body.password.length < 10 || body.password.length > 128) {
      return { valid: false, error: 'Use a password between 10 and 128 characters.' };
    }

    return {
      valid: true,
      value: {
        display_name: displayName,
        password: body.password
      }
    };
  } else {
    return { valid: false, error: 'Invalid role. Allowed roles: patient, doctor' };
  }
}

export function validateConsentPreferences(body = {}) {
  if (body.understood !== true) {
    return { valid: false, error: 'Please confirm that you understand the consent information.' };
  }
  if (!ALLOWED_LANGUAGES.includes(body.language)) {
    return { valid: false, error: 'Choose English, Hindi or Marathi for the consent record.' };
  }
  if (!body.preferences || typeof body.preferences !== 'object' || Array.isArray(body.preferences)) {
    return { valid: false, error: 'Consent preferences are required.' };
  }
  const keys = Object.keys(body.preferences);
  if (keys.length !== CONSENT_PURPOSES.length || keys.some(key => !CONSENT_PURPOSES.includes(key))) {
    return { valid: false, error: 'All four consent choices must be provided.' };
  }
  for (const purpose of CONSENT_PURPOSES) {
    if (typeof body.preferences[purpose] !== 'boolean') {
      return { valid: false, error: `Consent choice '${purpose}' must be true or false.` };
    }
  }
  return { valid: true, value: { preferences: body.preferences, language: body.language } };
}
