import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { requireKioskSessionToken, requireMatchingKioskSession } from '../src/middleware/kioskSessionAuth.js';

test('kiosk session routes reject missing credentials', async () => {
  const app = express();

  app.get(
    '/sessions/:id',
    requireKioskSessionToken(req => req.params.id),
    (_req, res) => res.json({ ok: true })
  );

  const response = await request(app).get(
    '/sessions/6c5eb8de-2371-4f14-a875-2497d777d4a2'
  );

  assert.equal(response.status, 401);
  assert.equal(
    response.body.error,
    'Kiosk session authorization required'
  );
});

test('document extraction rejects a mismatched session ID', async () => {
  const app = express();
  app.use(express.json());

  app.post(
    '/documents/extract',
    (req, _res, next) => {
      req.kioskSession = { id: 'session-authorized' };
      next();
    },
    requireMatchingKioskSession,
    (_req, res) => res.json({ ok: true })
  );

  const mismatched = await request(app)
    .post('/documents/extract')
    .send({ session_id: 'different-session' });

  assert.equal(mismatched.status, 403);

  const missing = await request(app)
    .post('/documents/extract')
    .send({});

  assert.equal(missing.status, 400);

  const matching = await request(app)
    .post('/documents/extract')
    .send({ session_id: 'session-authorized' });

  assert.equal(matching.status, 200);
  assert.equal(matching.body.ok, true);
});
