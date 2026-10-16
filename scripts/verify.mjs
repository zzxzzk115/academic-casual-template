import {readFileSync,readdirSync,statSync,existsSync} from 'node:fs';
import {resolve,join,extname,relative} from 'node:path';
import {parse} from 'yaml';
const [outArg='dist',contentArg='examples/minimal']=process.argv.slice(2);
const out=resolve(outArg),content=resolve(contentArg);
const config=parse(readFileSync(join(content,'site.config.yaml'),'utf8'));
const base=config.site.base.replace(/\/$/,'');
const origin=new URL(config.site.url).origin;
const html=[];
function walk(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory()){if(!['assets','pagefind','_astro'].includes(entry.name))walk(path);}else if(extname(path)==='.html')html.push(path);}}
walk(out);
const errors=[],external=new Set(),ids=new Map();
for(const file of html)ids.set(file,new Set([...readFileSync(file,'utf8').matchAll(/\bid="([^"]+)"/g)].map(m=>m[1])));
let checked=0;
for(const file of html){
  const text=readFileSync(file,'utf8');
  const pagePath=relative(out,file).replaceAll('\\','/').replace(/index\.html$/,'');
  const current=new URL(`${base}/${pagePath}`,origin);
  if(!text.includes('<h1'))errors.push(`${pagePath}: missing h1`);
  if(!text.includes('name="description"'))errors.push(`${pagePath}: missing description`);
  for(const match of text.matchAll(/\b(?:href|src)="([^"]+)"/g)){
    const raw=match[1].replaceAll('&amp;','&');
    if(!raw||/^(data:|mailto:|tel:|javascript:)/.test(raw))continue;
    const url=new URL(raw,current);
    if(url.origin!==origin){external.add(url.href);continue;}
    if(/^https?:/.test(config.blog.href)&&url.href.startsWith(config.blog.href)){external.add(url.href);continue;}
    if(config.blog.href.startsWith('/')&&url.pathname.startsWith(`${base}${config.blog.href}`)){external.add(url.href);continue;}
    if(!url.pathname.startsWith(base+'/')){errors.push(`Outside base: ${raw}`);continue;}
    const path=decodeURIComponent(url.pathname.slice(base.length));
    let target=join(out,path);
    if(existsSync(target)&&statSync(target).isDirectory())target=join(target,'index.html');
    if(!existsSync(target)){
      // Absolute links to independently hosted project Pages are external to this build.
      if(raw.startsWith(origin)&&!/^\/(projects|featured-posts|news|assets)\//.test(path)){external.add(raw);continue;}
      errors.push(`${pagePath}: missing ${raw}`);continue;
    }
    if(url.hash&&extname(target)==='.html'&&!ids.get(target)?.has(decodeURIComponent(url.hash.slice(1))))errors.push(`${pagePath}: missing anchor ${raw}`);
    checked++;
  }
}
for(const file of ['feed.xml','sitemap.xml','publications.bib','pagefind/pagefind.js'])if(!existsSync(join(out,file)))errors.push(`Missing output: ${file}`);
const manifest=join(content,'migration-manifest.json');
if(existsSync(manifest)){
  const migration=JSON.parse(readFileSync(manifest,'utf8'));
  const expected=migration.counts;
  for(const [kind,count]of Object.entries(expected)){const actual=readdirSync(join(content,'content',kind)).filter(f=>f.endsWith('.md')).length;if(actual!==count)errors.push(`Migration count mismatch: ${kind} ${actual}/${count}`);}
  for(const path of migration.legacyPaths||[]){
    const url=new URL(path,origin);let target=join(out,decodeURIComponent(url.pathname));if(existsSync(target)&&statSync(target).isDirectory())target=join(target,'index.html');
    if(!existsSync(target))errors.push(`Missing legacy path: ${path}`);
    else if(url.hash&&!ids.get(target)?.has(decodeURIComponent(url.hash.slice(1))))errors.push(`Missing legacy anchor: ${path}`);
  }
  for(const check of migration.contentChecks||[]){
    const url=new URL(check.path,origin),file=join(out,url.pathname,'index.html');
    if(!existsSync(file)){errors.push(`Missing content-check page: ${check.path}`);continue;}
    const source=readFileSync(file,'utf8').match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1]||'';
    const visible=source.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/g,' ').replace(/<[^>]+>/g,' ').replaceAll('&amp;','&').replaceAll('&#39;',"'").replace(/\s+/g,' ');
    for(const required of check.text)if(!visible.includes(required))errors.push(`${check.path}: missing migrated information: ${required}`);
  }
}
console.log(`${html.length} HTML files; ${checked} internal links/resources checked; ${external.size} distinct external references.`);
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log('No missing internal destinations or anchors.');
