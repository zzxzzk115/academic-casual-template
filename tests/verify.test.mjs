import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { stringify } from 'yaml';

for (const [href, valid] of [['https://example.com/education/', true], ['/education/', false]]) {
  test(`subpath verification ${valid ? 'accepts explicit same-host external URLs' : 'rejects unprefixed local paths'}`, () => {
    const root = mkdtempSync(join(tmpdir(), 'academic-casual-verify-'));
    try {
      const out = join(root, 'dist');
      mkdirSync(join(out, 'pagefind'), { recursive: true });
      writeFileSync(join(root, 'site.config.yaml'), stringify({ site: { url: 'https://example.com', base: '/portfolio/' }, blog: { href: 'https://blog.example.org/' } }));
      writeFileSync(join(out, 'index.html'), `<html><head><meta name="description" content="Example"></head><body><h1>Example</h1><a href="${href}">Education</a></body></html>`);
      for (const path of ['feed.xml', 'sitemap.xml', 'publications.bib', 'pagefind/pagefind.js']) writeFileSync(join(out, path), '');
      const result = spawnSync(process.execPath, ['scripts/verify.mjs', out, root], { encoding: 'utf8' });
      if (valid) assert.equal(result.status, 0, result.stderr);
      else { assert.notEqual(result.status, 0); assert.match(result.stderr, /Outside base/); }
    } finally {
      assert.ok(resolve(root).startsWith(resolve(tmpdir()) + sep + 'academic-casual-verify-'));
      rmSync(root, { recursive: true, force: true });
    }
  });
}
