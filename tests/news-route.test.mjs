import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicFeedHandler } from '../server/public-feeds.ts';

function requestNews(queryString = '', method = 'GET') {
  return new Promise(resolve => {
    const res = {
      status: 200,
      headers: {},
      destroyed: false,
      writableEnded: false,
      setHeader(k, v) { this.headers[k] = v; },
      writeHead(code) { this.status = code; },
      end(body) {
        this.writableEnded = true;
        resolve({ status: this.status, headers: this.headers, body: body ? JSON.parse(body) : null });
      }
    };
    publicFeedHandler({ url: '/public-feeds/news' + (queryString ? '?' + queryString : ''), method }, res, () => resolve({ status: 404 }));
  });
}

test('rejects non-GET requests with 405', async () => {
  const postRes = await requestNews('', 'POST');
  assert.equal(postRes.status, 405);
});

test('fetches live news articles with image URLs and multi-source attribution', async () => {
  const res = await requestNews();
  assert.equal(res.status, 200);
  assert(Array.isArray(res.body?.articles), 'articles must be an array');
  assert(res.body.articles.length > 0, 'articles should not be empty');

  // Verify articles have required fields
  const first = res.body.articles[0];
  assert(first.title, 'article must have title');
  assert(first.link, 'article must have link');
  assert(first.source, 'article must have source');
  assert(first.imageUrl, 'article must have imageUrl');

  // Verify high proportion of images
  const withImages = res.body.articles.filter(a => !!a.imageUrl);
  assert(withImages.length >= res.body.articles.length * 0.9, 'at least 90% of articles should have images');
});

test('supports country parameter (India desk)', async () => {
  const res = await requestNews('country=India');
  assert.equal(res.status, 200);
  assert(Array.isArray(res.body?.articles) && res.body.articles.length > 0);
  const indiaSources = res.body.articles.filter(a => a.source.includes('India') || a.source.includes('NDTV') || a.country === 'India');
  assert(indiaSources.length > 0, 'should include India sources');
});
