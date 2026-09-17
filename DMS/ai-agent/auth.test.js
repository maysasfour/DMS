import test from 'node:test';
import assert from 'node:assert/strict';
import { requireUser } from './auth.js';

async function invoke(authorization, fetchImpl) {
  const result = { next: false };
  const res = { status(value) { result.status = value; return this; }, json(value) { result.body = value; } };
  await requireUser({ backendUrl: 'http://backend:9090', fetchImpl })(
    { headers: { authorization } }, res, () => { result.next = true; });
  return result;
}

test('missing token is rejected before calling the backend', async () => {
  const result = await invoke(undefined, () => assert.fail('must not call backend'));
  assert.equal(result.status, 401);
  assert.equal(result.next, false);
});
test('invalid token is rejected', async () => {
  const result = await invoke('Bearer invalid', async () => ({ ok: false, status: 401 }));
  assert.equal(result.status, 401);
  assert.equal(result.next, false);
});
test('backend failure fails closed', async () => {
  const result = await invoke('Bearer example', async () => { throw new Error('offline'); });
  assert.equal(result.status, 503);
  assert.equal(result.next, false);
});
test('validated token allows the request and follows no redirects', async () => {
  const result = await invoke('Bearer example', async (url, options) => {
    assert.equal(url, 'http://backend:9090/api/v1/users/profile');
    assert.equal(options.headers.Authorization, 'Bearer example');
    assert.equal(options.redirect, 'error');
    return { ok: true };
  });
  assert.equal(result.next, true);
});
