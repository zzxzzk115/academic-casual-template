import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, relative, sep } from 'node:path';
import { parse } from 'yaml';
import matter from 'gray-matter';
import bibtex from 'bibtex-parse-js';
import { z } from 'zod';
import { modes, configSchema, entrySchema, profileSchema, cvSchema, nowSchema, homeSchema, type Home, type Mode, type Entry, type Publication, type Route } from './schema';
export * from './schema';

export const contentRoot = resolve(process.env.SITE_CONTENT_ROOT || './examples/einstein');

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
    if ('featured' in parsed.data) throw new Error(`Replace featured with home metadata: ${file}`);
    return { ...entrySchema.parse(parsed.data), body: parsed.content, kind };
  }).sort((a,b) => a.order - b.order || a.id.localeCompare(b.id));
}
export const config = configSchema.parse(yaml('site.config.yaml'));
export const cvDownloads = typeof config.identity.cv==='string'?[{label:'CV',href:config.identity.cv,lang:undefined}]:config.identity.cv??[];
if (!/^\/(?:[\w-]+\/)*$/.test(config.site.base)) throw new Error('site.base must begin and end with /');
export const profile = profileSchema.parse(yaml('content/profile.yaml'));
export const biography = existsSync(safeFile(contentRoot,'content/about.md')) ? readFileSync(safeFile(contentRoot,'content/about.md'),'utf8') : '';
export const cv = cvSchema.parse(yaml('content/cv.yaml'));
export const repositories = z.array(z.string().regex(/^[\w.-]+\/[\w.-]+$/)).parse(yaml('content/repositories.yaml'));
export const projects = entriesIn('projects', 'project');
export const posts = entriesIn('posts', 'post').sort((a,b) => (b.date || '').localeCompare(a.date || ''));
export const news = entriesIn('news', 'news').sort((a,b) => (b.date || '').localeCompare(a.date || ''));
export const now = existsSync(safeFile(contentRoot, 'content/now.yaml')) ? nowSchema.parse(yaml('content/now.yaml')) : nowSchema.parse({});
export const nowGroupLabels = { workingOn: 'Working on', exploring: 'Exploring', upNext: 'Up next' } as const;
export function homePlacement(home: Home, mode: Mode) {
  const setting = typeof home === 'boolean' ? home : home[mode];
  return !setting ? undefined : typeof setting === 'boolean' ? {order:100,hero:false} : setting;
}
export function homeEntries<T extends {home:Home;modes?:Mode[]}>(entries: T[], mode: Mode): T[] {
  return entries.filter(entry => (!entry.modes || entry.modes.includes(mode)) && !!homePlacement(entry.home, mode))
    .sort((a,b) => homePlacement(a.home,mode)!.order - homePlacement(b.home,mode)!.order);
}
export function homeProjects(mode: Mode) {
  return homeEntries(projects, mode);
}
export function homeHero(mode: Mode) {
  const available = homeProjects(mode);
  return available.find(project => homePlacement(project.home,mode)?.hero) || available[0];
}
export function nowGroups(mode: Mode) {
  return (Object.keys(nowGroupLabels) as (keyof typeof nowGroupLabels)[]).map(key => ({
    key, label: nowGroupLabels[key], items: now[key].filter(item => item.modes.includes(mode)).map(item => {
      const project = projects.find(project => project.id === item.projectId);
      return {...item, title: item.title || project?.title, href: item.href || project?.legacyPath};
    }),
  })).filter(group => group.items.length);
}
export function homeSections(mode: Mode) {
  return config.modes[mode].sections.filter(section =>
    section === 'now' ? nowGroups(mode).length > 0 :
    section === 'news' ? homeEntries(news, mode).length > 0 :
    section === 'writing' ? homeEntries(posts, mode).length > 0 || !!config.blog :
    section === 'projects' ? homeProjects(mode).length > 0 :
    section === 'publications' ? homePublications(mode).length > 0 : true);
}
const bibFile = safeFile(contentRoot, 'content/publications.bib');
export const bibliography = existsSync(bibFile) ? readFileSync(bibFile, 'utf8').replace(/^---\s*\n---\s*\n/, '') : '';
const clean = (text = '') => text.replace(/[{}]/g, '');
export const publications: Publication[] = bibtex.toJSON(bibliography).filter(p => p.citationKey).map(p => {
  const t = p.entryTags;
  if ('selected' in t) throw new Error(`Replace selected with home metadata: ${p.citationKey}`);
  const pdf = t.pdf ? (t.pdf.startsWith('/') || /^https?:/.test(t.pdf) ? t.pdf : `/assets/pdf/${t.pdf}`) : undefined;
  return { home: homeSchema.parse(parse(t.home ?? 'false')), id: p.citationKey, title: clean(t.title), author: clean(t.author).split(' and ').map(name=>{const parts=name.split(', ');return parts.length===2?`${parts[1]} ${parts[0]}`:name;}).join(', '), year: t.year, venue: t.journal || t.booktitle || '', abstract: clean(t.abstract), doi: t.doi, pdf, preview: t.preview ? `/assets/img/publication_preview/${t.preview}` : undefined, venueUrl:t.journal_url,abbr:t.abbr,volume:t.volume,number:t.number,pages:t.pages,url:t.url,cnki:t.cnki,gbt:clean(t.gbt),date:t.date,bibtex: `@${p.entryType}{${p.citationKey},\n${Object.entries(t).filter(([k]) => !['home','preview','pdf','selected','bibtex_show','abbr','cnki','gbt','journal_url'].includes(k)).map(([k,v]) => `  ${k} = {${v}}`).join(',\n')}\n}` };
}).sort((a,b) => b.year.localeCompare(a.year));

export function homePublications(mode: Mode='academic') {
  return homeEntries(publications,mode);
}

export function href(path: string, mode?: Mode): string {
  if (!path.startsWith('/') || path.startsWith('//')) return path;
  const withBase = `${config.site.base.replace(/\/$/, '')}${path}`;
  const pathname=path.split(/[?#]/,1)[0];
  if(mode!=='casual'||pathname.startsWith('/casual/')||pathname.startsWith('/assets/')||pathname.startsWith('/blog/')||pathname==='/')return withBase;
  const url=new URL(withBase,'https://local.invalid');
  url.searchParams.set('mode','casual');
  return `${url.pathname}${url.search}${url.hash}`;
}
export const dateLabel = (date?: string) => date ? new Intl.DateTimeFormat('en-GB', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Europe/London' }).format(new Date(date)) : '';
export const yearLabel = (date: string) => new Date(date).getUTCFullYear().toString();
export const sectionLabels: Record<string,string> = { research:'Research', now:'Now', news:'News', publications:'Publications', projects:'Projects', cv:'Experience', writing:'Posts', interests:'Interests', about:'About', contact:'Contact', ...config.sectionLabels };

export const routes: Route[] = [
  { path:'/projects/', title:config.sectionLabels.projects||'Projects', kind:'projects', description:'Selected work and research.' },
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
  for (const entry of [...projects,...posts,...news,...publications]) {
    for (const mode of modes) {
      const placement=homePlacement(entry.home,mode);
      if (!placement) continue;
      if (typeof entry.home !== 'boolean' && 'modes' in entry && !entry.modes.includes(mode)) throw new Error(`Home metadata for ${entry.id} is unavailable in ${mode}`);
      if (placement.hero && !('kind' in entry && entry.kind==='project')) throw new Error(`Only projects can be home heroes: ${entry.id}`);
    }
  }
  for (const mode of modes) {
    if (mode==='academic' && homeProjects(mode).some(project=>homePlacement(project.home,mode)?.hero)) throw new Error('Home heroes are only supported in casual');
    if (homeProjects(mode).filter(project=>homePlacement(project.home,mode)?.hero).length>1) throw new Error(`Multiple home heroes in ${mode}`);
  }
  for (const key of Object.keys(nowGroupLabels) as (keyof typeof nowGroupLabels)[]) for (const item of now[key]) {
    if (!item.projectId) continue;
    const project = projects.find(project => project.id === item.projectId);
    if (!project) throw new Error(`Unknown now project: ${item.projectId}`);
    if (item.modes.some(mode => !project.modes.includes(mode))) throw new Error(`Now project ${item.projectId} is unavailable in a requested mode`);
  }
  const resources = [config.site.favicon,config.banner?.image,config.identity.photo,...modes.map(mode=>config.modes[mode].photo),...cvDownloads.map(doc=>doc.href),...projects.map(p=>p.image),...publications.flatMap(p=>[p.pdf,p.preview])].filter(Boolean) as string[];
  for (const resource of resources) if (resource.startsWith('/') && !existsSync(safeFile(contentRoot, `public${resource}`))) throw new Error(`Missing resource: ${resource}`);
  for (const pub of publications) if (!pub.title || !pub.author || !pub.year) throw new Error(`Incomplete publication: ${pub.id}`);
}
validateContent();

export type FeedItem = { id:string; url:string; title:string; summary?:string; date_published?:string };
export async function loadBlog(): Promise<FeedItem[]> {
  if(!config.blog) return [];
  const feedSchema = z.object({ items:z.array(z.object({ id:z.string(),url:z.url(),title:z.string(),summary:z.string().optional(),date_published:z.string().optional() })) });
  if(config.blog.feedUrl && !process.env.SITE_OFFLINE) {
    try { const response=await fetch(config.blog.feedUrl,{signal:AbortSignal.timeout(5000)}); if(!response.ok)throw new Error(String(response.status));return feedSchema.parse(await response.json()).items; }
    catch { console.warn('Blog feed unavailable; using the saved content snapshot.'); }
  }
  if(config.blog.snapshot) return feedSchema.parse(JSON.parse(readFileSync(safeFile(contentRoot,config.blog.snapshot),'utf8'))).items;
  return [];
}
