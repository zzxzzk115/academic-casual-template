import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const contentRoot = resolve(process.env.SITE_CONTENT_ROOT || './examples/minimal');
const config = parse(readFileSync(resolve(contentRoot, 'site.config.yaml'), 'utf8'));
export default defineConfig({
  site: config.site.url,
  base: config.site.base || '/',
  output: 'static',
  trailingSlash: 'always',
  publicDir: resolve(contentRoot, 'public'),
  outDir: resolve(process.env.SITE_OUTPUT_ROOT || './dist'),
  integrations: [vue()],
  vite: { server: { fs: { allow: [process.cwd(), contentRoot] } } },
});
