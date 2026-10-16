import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { initContent } from '../scripts/init-content.mjs';

const options = { templateRoot: resolve('.'), repository: 'example/template', revision: 'a'.repeat(40) };
function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'academic-casual-init-'));
  try { run(root); }
  finally {
    assert.ok(resolve(root).startsWith(resolve(tmpdir()) + sep + 'academic-casual-init-'));
    rmSync(root, { recursive: true, force: true });
  }
}
test('initialization copies only starter content and records the exact template pin', () => fixture(root => {
  const target = join(root, 'my-site');
  initContent(target, options);
  const lock = JSON.parse(readFileSync(join(target, 'template.lock.json'), 'utf8'));
  assert.deepEqual(lock, { schemaVersion: 1, repository: options.repository, revision: options.revision });
  assert.equal(readFileSync(join(target, 'content/about.md'), 'utf8'), readFileSync('examples/einstein/content/about.md', 'utf8'));
  assert.match(readFileSync(join(target, 'README.md'), 'utf8'), /historical Einstein/);
}));
test('initialization refuses to overwrite existing content or copy into its source', () => fixture(root => {
  writeFileSync(join(root, 'notes.txt'), 'Keep this');
  assert.throws(() => initContent(root, options), /must be empty/);
  assert.equal(readFileSync(join(root, 'notes.txt'), 'utf8'), 'Keep this');
  assert.throws(() => initContent(join(options.templateRoot, 'examples/einstein/nested'), options), /outside examples/);
}));
