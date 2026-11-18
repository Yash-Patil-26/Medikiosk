import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export function hashOpaqueToken(token) {
  if (typeof token !== 'string' || token.length < 32) {
    throw new TypeError('Opaque token must be a string of at least 32 characters');
  }

  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function createOpaqueToken() {
  const token = randomBytes(32).toString('base64url');

  return {
    token,
    tokenHash: hashOpaqueToken(token)
  };
}

export function matchesOpaqueToken(token, expectedHash) {
  if (
    typeof token !== 'string' ||
    token.length < 32 ||
    typeof expectedHash !== 'string' ||
    !/^[0-9a-f]{64}$/i.test(expectedHash)
  ) {
    return false;
  }

  const actual = Buffer.from(hashOpaqueToken(token), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');

  return timingSafeEqual(actual, expected);
}