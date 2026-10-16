import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, relative, sep } from 'node:path';
import { parse } from 'yaml';
import matter from 'gray-matter';
import bibtex from 'bibtex-parse-js';
import { z } from 'zod';

export const modes = ['academic', 'casual'] as const;
export type Mode = typeof modes[number];
const sectionIds = ['research', 'news', 'publications', 'projects', 'cv', 'writing', 'interests', 'about', 'contact'] as const;
const localOrExternal = z.string().min(1).refine(v => v.startsWith('/') || /^(https?:|mailto:)/.test(v), 'Use an absolute site path or URL');
const modeConfig = z.object({ sections: z.array(z.enum(sectionIds)), featuredProjects: z.array(z.string()).default([]) });
export const configSchema = z.object({
  schemaVersion: z.literal(1),
  site: z.object({ title: z.string().min(1), description: z.string().min(1), url: z.url(), base: z.string().default('/'), language: z.string().default('en'), availableLanguages: z.array(z.string()).default(['en']), copyrightStartYear: z.number().int().min(1900).max(new Date().getUTCFullYear()).optional() }),
  identity: z.object({ name: z.string().min(1), handle: z.string().min(1), initials: z.string().min(1), role: z.string().min(1), institution: z.string().min(1), location: z.string(), address: z.string().optional(), contactNote: z.string().optional(), email: z.email(), photo: z.string().optional(), cv: z.string().optional() }),
  socials: z.array(z.object({ label: z.string(), href: localOrExternal, icon: z.string().regex(/^(brands|solid):[a-z0-9-]+$/).optional(), modes: z.array(z.enum(modes)).default(['academic','casual']) })),
  theme: z.object({ academic: z.string().regex(/^#[0-9a-f]{6}$/i), casual: z.string().regex(/^#[0-9a-f]{6}$/i) }),
  hero: z.object({ enabled: z.boolean().default(true), label: z.string(), intensity: z.number().min(0).max(2).default(1) }),
  modes: z.object({ academic: modeConfig, casual: modeConfig }),
  blog: z.object({ href: localOrExternal, feedUrl: z.url().optional(), snapshot: z.string().optional() }),
  comments: z.object({ repo: z.string(), repoId: z.string(), category: z.string(), categoryId: z.string(), mapping: z.literal('pathname') }).optional(),
});
export const entrySchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]+$/), title: z.string().min(1), description: z.string().min(1),
  legacyPath: z.string().regex(/^\/[\w/-]+\/$/),
  image: z.string().optional(), category: z.string().default('work'), categories: z.array(z.string()).default([]), tags: z.array(z.string()).default([]),
  modes: z.array(z.enum(modes)).default(['academic', 'casual']), order: z.number().default(100),
  date: z.preprocess(v=>v instanceof Date?v.toISOString():v,z.string().optional()), comments: z.boolean().default(false), featured: z.boolean().default(false),
  status: z.string().optional(), links: z.array(z.object({label:z.string(),href:localOrExternal,icon:z.string().regex(/^(brands|solid):[a-z0-9-]+$/).optional()})).default([]),
});
export type Entry = z.infer<typeof entrySchema> & { body: string; kind: string };
export type Publication = { id: string; title: string; author: string; year: string; venue: string; abstract: string; doi?: string; pdf?: string; preview?: string; bibtex: string; volume?:string; number?:string; pages?:string; url?:string; cnki?:string; gbt?:string; date?:string; venueUrl?:string; abbr?:string };
export type Route = { path: string; title: string; kind: string; entry?: Entry; entries?: Entry[]; description?: string };
export const contentRoot = resolve(process.env.SITE_CONTENT_ROOT || './examples/minimal');

export function safeFile(root: string, file: string) {
  const target = resolve(root, file);
  const rel = relative(root, target);
  if (rel === '..' || rel.startsWith(`..${sep}`) || resolve(target) === resolve(root)) throw new Error(`Path escapes content directory: ${file}`);
  return target;
}
function yaml(file: string) { return parse(readFileSync(safeFile(contentRoot, file), 'utf8')); }
export function entriesIn(folder: string, kind: string): Entry[] {
  const dir = safeFile(contentRoot, `content/${folder}`);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith('.md')).map(file => {
    const parsed = matter(readFileSync(join(dir, file), 'utf8'));
    return { ...entrySchema.parse(parsed.data), body: parsed.content, kind };
  }).sort((a,b) => a.order - b.order || a.id.localeCompare(b.id));
}
export const config = configSchema.parse(yaml('site.config.yaml'));
if (!/^\/(?:[\w-]+\/)*$/.test(config.site.base)) throw new Error('site.base must begin and end with /');
const profileSchema = z.object({
  headline: z.string().optional(), casualHeadline: z.string().optional(), summary: z.string(), casualSummary: z.string(), background: z.string().default(''),
  research: z.array(z.object({ title: z.string(), description: z.string() })),
  interests: z.array(z.object({ title: z.string(), description: z.string(), href: localOrExternal.optional() })),
  toolkit: z.array(z.object({label:z.string(),items:z.array(z.string())})).default([]),
});
export const profile = profileSchema.parse(yaml('content/profile.yaml'));
export const biography = existsSync(safeFile(contentRoot,'content/about.md')) ? readFileSync(safeFile(contentRoot,'content/about.md'),'utf8') : '';
const timelineSchema = z.object({ title: z.string(), institution: z.string(), start: z.string(), end: z.string(), description: z.string().default(''),url:localOrExternal.optional(),location:z.string().optional() });
export const cv = z.object({ education: z.array(timelineSchema), work: z.array(timelineSchema), languages: z.array(z.string()), skills: z.array(z.string()), basics:z.object({label:z.string(),summary:z.string(),phone:z.string().optional(),url:localOrExternal.optional(),address:z.string().optional()}).optional() }).parse(yaml('content/cv.yaml'));
export const repositories = z.array(z.string().regex(/^[\w.-]+\/[\w.-]+$/)).parse(yaml('content/repositories.yaml'));
export const projects = entriesIn('projects', 'project');
export const posts = entriesIn('posts', 'post').sort((a,b) => (b.date || '').localeCompare(a.date || ''));
export const news = entriesIn('news', 'news').sort((a,b) => (b.date || '').localeCompare(a.date || ''));
const bibFile = safeFile(contentRoot, 'content/publications.bib');
export const bibliography = existsSync(bibFile) ? readFileSync(bibFile, 'utf8').replace(/^---\s*\n---\s*\n/, '') : '';
const clean = (text = '') => text.replace(/[{}]/g, '');
export const publications: Publication[] = bibtex.toJSON(bibliography).filter(p => p.citationKey).map(p => {
  const t = p.entryTags;
  const pdf = t.pdf ? (t.pdf.startsWith('/') || /^https?:/.test(t.pdf) ? t.pdf : `/assets/pdf/${t.pdf}`) : undefined;
  return { id: p.citationKey, title: clean(t.title), author: clean(t.author).split(' and ').map(name=>{const parts=name.split(', ');return parts.length===2?`${parts[1]} ${parts[0]}`:name;}).join(', '), year: t.year, venue: t.journal || t.booktitle || '', abstract: clean(t.abstract), doi: t.doi, pdf, preview: t.preview ? `/assets/img/publication_preview/${t.preview}` : undefined, venueUrl:t.journal_url,abbr:t.abbr,volume:t.volume,number:t.number,pages:t.pages,url:t.url,cnki:t.cnki,gbt:clean(t.gbt),date:t.date,bibtex: `@${p.entryType}{${p.citationKey},\n${Object.entries(t).filter(([k]) => !['preview','pdf','selected','bibtex_show','abbr','cnki','gbt','journal_url'].includes(k)).map(([k,v]) => `  ${k} = {${v}}`).join(',\n')}\n}` };
}).sort((a,b) => b.year.localeCompare(a.year));

export function href(path: string, mode?: Mode): string {
  if (!path.startsWith('/') || path.startsWith('//')) return path;
  const withBase = `${config.site.base.replace(/\/$/, '')}${path}`;
  return mode === 'casual' && !path.startsWith('/casual/') && !path.startsWith('/assets/') && !path.startsWith('/blog/') && path !== '/' ? `${withBase}${withBase.includes('?') ? '&' : '?'}mode=casual` : withBase;
}
export const dateLabel = (date?: string) => date ? new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Europe/London' }).format(new Date(date)) : '';
export const yearLabel = (date: string) => new Date(date).getUTCFullYear().toString();
export const sectionLabels: Record<string,string> = { research:'Research', news:'News', publications:'Publications', projects:'Projects', cv:'Experience', writing:'Writing', interests:'Off the clock', about:'About', contact:'Contact' };

export const routes: Route[] = [
  { path:'/projects/', title:'Projects', kind:'projects', description:'Graphics libraries, engines, games, and personal tools.' },
  { path:'/publications/', title:'Publications', kind:'publications' },
  { path:'/cv/', title:'Curriculum vitae', kind:'cv' },
  { path:'/news/', title:'News & milestones', kind:'list', entries:news },
  { path:'/featured-posts/', title:'Featured posts', kind:'list', entries:posts },
  { path:'/repositories/', title:'Open source', kind:'repositories' },
  ...[...projects,...posts,...news].map(entry => ({ path:entry.legacyPath, title:entry.title, description:entry.description, kind:'entry', entry })),
];
for (const year of new Set(posts.map(p => yearLabel(p.date!)))) routes.push({path:`/featured-posts/${year}/`, title:year, kind:'list',entries:posts.filter(p=>yearLabel(p.date!)===year)});
for (const [kind, values] of [['tag', new Set(posts.flatMap(p=>p.tags))], ['category',new Set(posts.flatMap(p=>p.categories.length?p.categories:[p.category]))]] as const) {
  for(const value of values) routes.push({path:`/featured-posts/${kind}/${value.toLowerCase().replace(/\s+/g,'-')}/`,title:value,kind:'list',entries:posts.filter(p=>kind==='tag'?p.tags.includes(value):(p.categories.length?p.categories:[p.category]).includes(value))});
}
export function validateContent() {
  const ids = new Set<string>(); const paths = new Set<string>();
  for (const entry of [...projects,...posts,...news]) {
    if (ids.has(entry.id)) throw new Error(`Duplicate content ID: ${entry.id}`);
    ids.add(entry.id);
    if (entry.date && !Number.isFinite(Date.parse(entry.date))) throw new Error(`Invalid date: ${entry.id}`);
  }
  for (const route of routes) { if (paths.has(route.path)) throw new Error(`Duplicate route: ${route.path}`); paths.add(route.path); }
  for (const mode of modes) for (const id of config.modes[mode].featuredProjects) {
    const project=projects.find(p=>p.id===id);
    if(!project)throw new Error(`Unknown featured project: ${id}`);
    if(!project.modes.includes(mode))throw new Error(`Featured project ${id} is unavailable in ${mode}`);
  }
  const resources = [config.identity.photo,config.identity.cv,...projects.map(p=>p.image),...publications.flatMap(p=>[p.pdf,p.preview])].filter(Boolean) as string[];
  for (const resource of resources) if (resource.startsWith('/') && !existsSync(safeFile(contentRoot, `public${resource}`))) throw new Error(`Missing resource: ${resource}`);
  for (const pub of publications) if (!pub.title || !pub.author || !pub.year) throw new Error(`Incomplete publication: ${pub.id}`);
}
validateContent();

export type FeedItem = { id:string; url:string; title:string; summary?:string; date_published?:string };
export async function loadBlog(): Promise<FeedItem[]> {
  const feedSchema = z.object({ items:z.array(z.object({ id:z.string(),url:z.url(),title:z.string(),summary:z.string().optional(),date_published:z.string().optional() })) });
  if(config.blog.feedUrl && !process.env.SITE_OFFLINE) {
    try { const response=await fetch(config.blog.feedUrl,{signal:AbortSignal.timeout(5000)}); if(!response.ok)throw new Error(String(response.status));return feedSchema.parse(await response.json()).items; }
    catch { console.warn('Blog feed unavailable; using the saved content snapshot.'); }
  }
  if(config.blog.snapshot) return feedSchema.parse(JSON.parse(readFileSync(safeFile(contentRoot,config.blog.snapshot),'utf8'))).items;
  return [];
}
