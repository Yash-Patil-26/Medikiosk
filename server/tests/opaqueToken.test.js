import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createOpaqueToken,
  hashOpaqueToken,
  matchesOpaqueToken
} from '../src/utils/opaqueToken.js';

test('opaque token generation returns a token and a SHA-256 hex hash', () => {
  const first = createOpaqueToken();
  const second = createOpaqueToken();

  assert.equal(typeof first.token, 'string');
  assert.ok(first.token.length >= 32);
  assert.match(first.tokenHash, /^[0-9a-f]{64}$/);
  assert.equal(first.tokenHash, hashOpaqueToken(first.token));
  assert.notEqual(first.token, second.token);
  assert.notEqual(first.tokenHash, second.tokenHash);
});

test('opaque token matching accepts only the matching token', () => {
  const { token, tokenHash } = createOpaqueToken();

  assert.equal(matchesOpaqueToken(token, tokenHash), true);
  assert.equal(matchesOpaqueToken('a-different-token-that-is-long-enough', tokenHash), false);
  assert.equal(matchesOpaqueToken('', tokenHash), false);
  assert.equal(matchesOpaqueToken(token, 'not-a-valid-hash'), false);
  assert.equal(matchesOpaqueToken(token, null), false);
});

test('opaque tokens cannot be hashed from malformed short input', () => {
  assert.throws(() => hashOpaqueToken('short'), TypeError);
});