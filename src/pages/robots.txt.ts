import {config,href} from '../lib/content';
export function GET(){return new Response(`User-agent: *\nAllow: /\nSitemap: ${new URL(href('/sitemap.xml'),config.site.url).href}\n`);}
