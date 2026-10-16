// One-time importer. Both inputs must be explicit; the source remains untouched.
import {readFileSync,readdirSync,mkdirSync,writeFileSync,cpSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import matter from 'gray-matter';
import {stringify,parse} from 'yaml';
import ts from 'typescript';
const [sourceArg,destinationArg,blogArg]=process.argv.slice(2);
if(!sourceArg||!destinationArg)throw new Error('Use import-jekyll.mjs <source> <destination> [blog-source]');
const source=resolve(sourceArg),destination=resolve(destinationArg);
const write=(file,text)=>{const target=join(destination,file);mkdirSync(resolve(target,'..'),{recursive:true});writeFileSync(target,text);};
const date=value=>new Date(value).toISOString();
const summary=text=>text.replace(/<[^>]+>/g,'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/\s+/g,' ').trim();
const counts={};
for(const [folder,kind] of [['_projects','projects'],['_posts','posts'],['_news','news']]) {
  counts[kind]=0;
  for(const file of readdirSync(join(source,folder)).filter(f=>f.endsWith('.md'))) {
    const {data,content}=matter(readFileSync(join(source,folder,file),'utf8'));
    const id=file.replace(/\.md$/,'').replace(/^\d{4}-\d{2}-\d{2}-/,'');
    const categories=Array.isArray(data.categories)?data.categories:(data.categories||data.category||'updates').split(' ');
    const title=data.title || summary(content);
    const legacyPath=kind==='posts'?`/featured-posts/${new Date(data.date).getUTCFullYear()}/${id}/`:`/${kind}/${id}/`;
    let image=data.img?`/${data.img.replace(/^\//,'')}`:undefined;
    if(image && !existsSync(join(source,image)))image=image.replace(/\.jpg$/,'.png');
    const meta={id,title,description:data.description||summary(content),legacyPath,...(image?{image}:{}),category:data.category||categories[0],tags:Array.isArray(data.tags)?data.tags:(data.tags||'').split(' ').filter(Boolean),modes:kind==='projects'&&data.category!=='work'?['casual']:['academic','casual'],order:data.importance||100,...(data.date?{date:date(data.date)}:{}),comments:!!data.giscus_comments};
    let body=content.replace(/\[!\[[^\]]*\]\(https:\/\/gh-card\.dev\/[^)]+\)\]\(([^)]+)\)/g,'[View repository ↗]($1)');
    body=body.replace(/<iframe\b([^>]*?)>/g,(_,attrs)=>`<iframe${attrs}${/\btitle=/.test(attrs)?'':` title="${title.replace(/"/g,'&quot;')} preview"`} loading="lazy">`);
    if(image)body=body.replace(/https:\/\/raw\.githubusercontent\.com\/[^\s)]+\/showcase\.gif/g,image);
    write(`content/${kind}/${id}.md`,`---\n${stringify(meta)}---\n${body.trim()}\n`);
    counts[kind]++;
  }
}
const raw=readFileSync(join(source,'assets/json/resume.json'),'utf8');
const parsed=ts.parseConfigFileTextToJson('resume.json',raw);if(parsed.error)throw new Error('Invalid JSONC resume');
const resume=parsed.config;
const normalize=value=>value==='Present'?value:/^\d{4}-\d{2}-\d{2}$/.test(value)&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value?value:value.slice(0,7);
const about=matter(readFileSync(join(source,'_pages/about.md'),'utf8'));
const profileFacts=[...(about.data.profile?.more_info||'').matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)].map(m=>summary(m[1]));
write('content/about.md',about.content.trim()+'\n');
const details=r=>({...(r.url?{url:r.url}:{}),...(r.location?{location:r.location}:{})});
const cv={education:resume.education.map(r=>({title:`${r.studyType} — ${r.area}`,institution:r.institution,start:normalize(r.startDate),end:normalize(r.endDate),description:[r.score&&`Result: ${r.score}`,r.courses?.length&&`Courses: ${r.courses.join(', ')}`].filter(Boolean).join('. '),...details(r)})),work:resume.work.map(r=>({title:r.position,institution:r.name,start:normalize(r.startDate),end:normalize(r.endDate),description:r.summary||'',...details(r)})),languages:resume.languages.map(r=>`${r.language} — ${r.fluency}`),skills:profileFacts,basics:{label:resume.basics.label,summary:resume.basics.summary,phone:resume.basics.phone,url:resume.basics.url,address:Object.values(resume.basics.location||{}).join(', ')}};
write('content/cv.yaml',stringify(cv));
write('content/publications.bib',readFileSync(join(source,'_bibliography/papers.bib'),'utf8').replace(/^---\s*\n---\s*\n/,''));
const repositories=parse(readFileSync(join(source,'_data/repositories.yml'),'utf8')).github_repos;
write('content/repositories.yaml',stringify(repositories));
mkdirSync(join(destination,'public'),{recursive:true});cpSync(join(source,'assets'),join(destination,'public/assets'),{recursive:true});
if(blogArg){const blog=resolve(blogArg),items=[];
  const legacyConfig=parse(readFileSync(join(source,'_config.yml'),'utf8'));
  const blogBase=new URL('blog/',legacyConfig.url.replace(/\/$/,'')+'/').href;
  const walk=dir=>{for(const f of readdirSync(dir,{withFileTypes:true})){const path=join(dir,f.name);if(f.isDirectory())walk(path);else if(f.name.endsWith('.md')&&f.name!=='README.md'){const {data}=matter(readFileSync(path,'utf8'));if(data.article===false||data.draft||!data.date)continue;const pathPart=path.slice(join(blog,'src').length).replaceAll('\\','/').replace(/\.md$/,'.html').replace(/^\//,'');const url=new URL(data.permalink||pathPart,blogBase).href;items.push({id:url,url,title:data.title,summary:data.description||'',date_published:date(data.date)});}}};
  walk(join(blog,'src/posts'));write('content/blog-feed.json',JSON.stringify({version:'https://jsonfeed.org/version/1.1',items:items.sort((a,b)=>b.date_published.localeCompare(a.date_published))},null,2)+'\n');
}
write('migration-manifest.json',JSON.stringify({sourceCommit:process.env.MIGRATION_SOURCE_COMMIT||null,counts,notes:['Legacy day values outside the calendar were normalized to month precision.','Missing project .jpg thumbnails were matched to existing .png files.','BibTeX remains the single publication source.']},null,2)+'\n');
console.log(JSON.stringify(counts));
