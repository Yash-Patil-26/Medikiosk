import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONSENT_PURPOSES,
  normalizePatientIdentifier,
  validateConsentPreferences,
  validatePatientRegistration
} from '../src/utils/patientRegistration.js';

const validRegistration = {
  display_name: 'Synthetic Patient',
  date_of_birth: '1998-02-11',
  sex: 'prefer_not_to_say',
  preferred_language: 'en',
  identifier_type: 'email',
  identifier: 'Patient.One@example.test',
  password: 'SyntheticPass123'
};

test('ABHA login identifier normalization removes spaces and separators', () => {
  assert.deepEqual(normalizePatientIdentifier('abha', '1234-5678 9012-34'), {
    valid: true,
    value: '12345678901234'
  });
  assert.equal(normalizePatientIdentifier('abha', '12345').valid, false);
});

test('mobile login identifier normalization accepts an optional Indian country code', () => {
  assert.deepEqual(normalizePatientIdentifier('mobile', '+91 98765-43210'), {
    valid: true,
    value: '9876543210'
  });
  assert.equal(normalizePatientIdentifier('mobile', '1234567890').valid, false);
});

test('email login identifier is trimmed and normalized to lowercase', () => {
  assert.deepEqual(normalizePatientIdentifier('email', '  Patient.One@Example.Test  '), {
    valid: true,
    value: 'patient.one@example.test'
  });
  assert.equal(normalizePatientIdentifier('email', 'not-an-email').valid, false);
});

test('patient registration accepts a valid profile and normalized login identifier', () => {
  const result = validatePatientRegistration(validRegistration);
  assert.equal(result.valid, true);
  assert.equal(result.value.display_name, 'Synthetic Patient');
  assert.equal(result.value.identifier, 'patient.one@example.test');
});

test('patient registration rejects future dates, weak passwords and unsupported fields', () => {
  assert.equal(validatePatientRegistration({ ...validRegistration, date_of_birth: '2999-01-01' }).valid, false);
  assert.equal(validatePatientRegistration({ ...validRegistration, password: 'short' }).valid, false);
  assert.equal(validatePatientRegistration({ ...validRegistration, admin: true }).valid, false);
});

test('consent requires explicit understanding and all four boolean choices', () => {
  const preferences = Object.fromEntries(CONSENT_PURPOSES.map(purpose => [purpose, purpose === 'voice']));
  assert.equal(validateConsentPreferences({ preferences, language: 'en', understood: true }).valid, true);
  assert.equal(validateConsentPreferences({ preferences, language: 'en', understood: false }).valid, false);
  assert.equal(validateConsentPreferences({ preferences: { voice: true }, language: 'en', understood: true }).valid, false);
  assert.equal(validateConsentPreferences({ preferences: { ...preferences, his: 'yes' }, language: 'en', understood: true }).valid, false);
});
