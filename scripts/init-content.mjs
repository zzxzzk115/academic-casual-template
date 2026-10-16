import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

export function initContent(destination, { templateRoot, repository, revision }) {
  const target = resolve(destination);
  const source = join(templateRoot, 'examples/einstein');
  const fromSource = relative(source, target);
  if (!fromSource || (!fromSource.startsWith(`..${sep}`) && fromSource !== '..' && !isAbsolute(fromSource))) {
    throw new Error('The content directory must be outside examples/einstein');
  }
  if (existsSync(target) && (!statSync(target).isDirectory() || readdirSync(target).length)) {
    throw new Error(`Content directory must be empty: ${target}`);
  }
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || !/^[a-f0-9]{40}$/.test(revision)) {
    throw new Error('Initialization requires a template repository and a full commit SHA');
  }
  mkdirSync(target, { recursive: true });
  cpSync(source, target, { recursive: true, force: false, errorOnExist: true });
  writeFileSync(join(target, 'template.lock.json'), JSON.stringify({ schemaVersion: 1, repository, revision }, null, 2) + '\n');
  writeFileSync(join(target, '.gitignore'), 'dist/\n.cache/\n.astro/\nnode_modules/\n**/.latex-build/\n');
  writeFileSync(join(target, 'README.md'), `# Site content

This directory owns the configuration, Markdown, BibTeX and public assets for one site.
The starter uses a sourced historical Einstein example. Replace it with your own profile and content before publishing a personal site; preserve any media credits that still apply.

Use a separate checkout of [the template](https://github.com/${repository}) at the commit in \`template.lock.json\`.
From that checkout, run:

\`\`\`sh
pnpm install --frozen-lockfile
pnpm site dev --content <path-to-this-directory>
pnpm site build --content <path-to-this-directory> --out <path-to-this-directory>/dist
\`\`\`

Deployment is opt-in. The template documentation includes a content repository validation workflow.
`);
  return target;
}
