import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicFeedHandler } from '../server/public-feeds.ts';

function request(path, method = 'GET') {
  return new Promise(resolve => {
    const res = { status: 200, destroyed: false, writableEnded: false, setHeader() {}, writeHead(code) { this.status = code; }, end(body) { this.writableEnded = true; resolve({ status: this.status, body }); } };
    publicFeedHandler({ url: '/public-feeds/aircraft/' + path, method }, res, () => resolve({ status: 404 }));
  });
}

test('rejects invalid coordinates and methods without fetching upstream', async () => {
  assert.equal((await request('point/91/0/250')).status, 400);
  assert.equal((await request('hex/800001', 'POST')).status, 405);
  assert.equal((await request('https://example.com')).status, 400);
});

test('requires contact, identifies requests, and caches successful responses', async () => {
  const originalContact = process.env.FLIGHT_API_CONTACT;
  const originalFetch = globalThis.fetch;
  let calls = 0;
  try {
    delete process.env.FLIGHT_API_CONTACT;
    const missing = await request('hex/800001');
    assert.equal(missing.status, 503);
    assert.match(missing.body, /FLIGHT_API_CONTACT/);
    process.env.FLIGHT_API_CONTACT = 'test@example.invalid';
    globalThis.fetch = async (url, options) => {
      calls++;
      assert.equal(url, 'https://api.adsb.lol/v2/hex/800001');
      assert.match(options.headers['User-Agent'], /test@example.invalid/);
      return new Response(JSON.stringify({ ac: [{ hex: '800001', gs: 0 }], now: Date.now() }), { headers: { 'Content-Type': 'application/json' } });
    };
    const first = await request('hex/800001');
    const second = await request('hex/800001');
    assert.equal(first.status, 200);
    assert.equal(second.body, first.body);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalContact === undefined) delete process.env.FLIGHT_API_CONTACT;
    else process.env.FLIGHT_API_CONTACT = originalContact;
  }
});
