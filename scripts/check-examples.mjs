import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parse, stringify } from 'yaml';

const root = fileURLToPath(new URL('../', import.meta.url));
const cache = join(root, '.cache');
mkdirSync(cache, { recursive: true });
const runRoot = mkdtempSync(join(cache, 'examples-'));
const run = args => {
  const result = spawnSync(process.execPath, args, { cwd: root, env: { ...process.env, SITE_OFFLINE: '1' }, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`Example validation failed: ${args.join(' ')}`);
};
const outputs = [];
for (const [name, base, email] of [['root', '/', 'root-fixture@example.invalid'], ['subpath', '/portfolio/', 'subpath@example.org']]) {
  const content = join(runRoot, name, 'content'), out = join(runRoot, name, 'dist');
  cpSync(join(root, 'examples/einstein'), content, { recursive: true });
  const file = join(content, 'site.config.yaml'), config = parse(readFileSync(file, 'utf8'));
  config.site.base = base;
  config.identity.email = email;
  if (name === 'subpath') {
    config.identity.name = 'Taylor Quinn';
    config.identity.handle = 'TQ Notebook';
    config.identity.initials = 'TQ';
    config.theme.academic = '#6b3db8';
  }
  writeFileSync(file, stringify(config));
  run(['scripts/site.mjs', 'build', '--content', content, '--out', out]);
  run(['scripts/verify.mjs', out, content]);
  const pages = readdirSync(out, { recursive: true }).filter(path => path.endsWith('.html')).map(path => readFileSync(join(out, path), 'utf8')).join('\n');
  if (!pages.includes(email)) throw new Error(`Missing configured identity in ${name}`);
  outputs.push(pages);
}
if (outputs[0].includes('subpath@example.org') || outputs[1].includes('root-fixture@example.invalid')) throw new Error('Content leaked between independent builds');
console.log(`Root/subpath and content isolation checks passed. Output: ${runRoot}`);
