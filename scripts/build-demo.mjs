import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parse, stringify } from 'yaml';

const root = fileURLToPath(new URL('../', import.meta.url));
const options = {};
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  if (!['--url', '--base', '--out'].includes(args[i]) || args[i + 1] === undefined) throw new Error('Use demo:build --url <origin> --base <path> [--out <directory>]');
  options[args[i].slice(2)] = args[i + 1];
}
if (!options.url || options.base === undefined) throw new Error('The demo requires --url and --base');
const url = new URL(options.url);
if (!['https:', 'http:'].includes(url.protocol) || url.pathname !== '/' || url.search || url.hash) throw new Error('--url must be an HTTP(S) origin');
const base = options.base === '' || options.base === '/' ? '/' : options.base.replace(/\/?$/, '/');
if (!/^\/(?:[\w-]+\/)*$/.test(base)) throw new Error('--base must be an absolute site path');

// Deliberately fixed to the bundled historical Einstein example, never an external content root.
const cache = join(root, '.cache');
mkdirSync(cache, { recursive: true });
const content = mkdtempSync(join(cache, 'demo-content-'));
cpSync(join(root, 'examples/einstein'), content, { recursive: true });
const file = join(content, 'site.config.yaml'), config = parse(readFileSync(file, 'utf8'));
config.site.url = url.origin;
config.site.base = base;
writeFileSync(file, stringify(config));
const out = resolve(options.out || join(cache, 'demo-dist'));
for (const command of [
  ['scripts/site.mjs', 'build', '--content', content, '--out', out],
  ['scripts/verify.mjs', out, content],
]) {
  const result = spawnSync(process.execPath, command, { cwd: root, env: { ...process.env, SITE_OFFLINE: '1' }, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`Historical Einstein demo built for ${url.origin}${base}`);
console.log(`Content: ${content}\nOutput: ${out}`);
