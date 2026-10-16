import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { readFileSync, mkdirSync, copyFileSync } from 'node:fs';

const root = fileURLToPath(new URL('../', import.meta.url));
const [command = 'dev', ...args] = process.argv.slice(2);
if (!['init', 'dev', 'build', 'preview', 'check'].includes(command)) throw new Error('Use site init|dev|build|preview|check --content <directory> --out <directory>');
const options = {};
for (let i = 0; i < args.length; i += 2) {
  if (!['--content', '--out', '--port'].includes(args[i]) || !args[i + 1]) throw new Error(`Invalid argument: ${args[i]}`);
  options[args[i].slice(2)] = args[i + 1];
}
if (command === 'init') {
  if (!options.content || options.out || options.port) throw new Error('Use site init --content <empty-directory>');
  const { initContent } = await import('./init-content.mjs');
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const repository = pkg.repository.url.match(/github\.com\/([^/]+\/[^/]+?)\.git$/)?.[1];
  const revision = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  console.log(`Created content site: ${initContent(options.content, { templateRoot: root, repository, revision })}`);
  process.exit(0);
}
const env = { ...process.env, SITE_CONTENT_ROOT: resolve(options.content || join(root, 'examples/minimal')), SITE_OUTPUT_ROOT: resolve(options.out || join(root, 'dist')) };
const astroRoot = join(root, 'node_modules/astro');
const astroPackage = JSON.parse(readFileSync(join(astroRoot, 'package.json'), 'utf8'));
const cli = join(astroRoot, typeof astroPackage.bin === 'string' ? astroPackage.bin : astroPackage.bin.astro);
const result = spawnSync(process.execPath, [cli, command, '--root', root, ...(options.port ? ['--port', options.port] : [])], { cwd: root, env, stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status || 1);
if (command === 'build') {
  const licenses = join(env.SITE_OUTPUT_ROOT, 'licenses');
  mkdirSync(licenses, { recursive: true });
  copyFileSync(join(root, 'node_modules/@fortawesome/fontawesome-free/LICENSE.txt'), join(licenses, 'fontawesome-free.txt'));
  const { createIndex } = await import('pagefind');
  const { index } = await createIndex();
  const added = await index.addDirectory({ path: env.SITE_OUTPUT_ROOT, glob: '{index.html,casual/**/*.html,projects/**/*.html,publications/**/*.html,cv/**/*.html,news/**/*.html,featured-posts/**/*.html,repositories/**/*.html}' });
  if (added.errors.length) throw new Error(JSON.stringify(added.errors));
  const written = await index.writeFiles({ outputPath: join(env.SITE_OUTPUT_ROOT, 'pagefind') });
  if (written.errors.length) throw new Error(JSON.stringify(written.errors));
  console.log(`Search index: ${added.page_count} pages`);
  await index.deleteIndex();
}
