import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {parse} from 'yaml';
import matter from 'gray-matter';
import ts from 'typescript';
import bibtex from 'bibtex-parse-js';

const root=resolve(process.argv[2]||'.');
const manifest=JSON.parse(readFileSync(join(root,'migration-manifest.json'),'utf8'));
const git=(...args)=>execFileSync('git',['-C',root,...args],{maxBuffer:32*1024*1024});
const source=path=>git('show',`${manifest.sourceCommit}:${path}`).toString('utf8');
const paths=git('ls-tree','-r','--name-only',manifest.sourceCommit).toString('utf8').trim().split('\n');
const replacements=manifest.textReplacements||{};
const canonical=text=>{
  for(const [from,to]of Object.entries(replacements))text=text.replaceAll(from,to);
  return text.replace(/\[!\[[^\]]*\]\(https:\/\/gh-card\.dev\/[^)]+\)\]\(([^)]+)\)/g,'[View repository ↗]($1)')
    .replace(/\s+(title|loading)="[^"]*"/g,'').replace(/!\[([^\]]*)\]\([^)]+\)/g,'![$1](image)')
    .replace(/\s+/g,' ').trim();
};
const records=[];const failures=[];
for(const [oldFolder,newFolder]of [['_projects','projects'],['_posts','posts'],['_news','news']]){
  for(const path of paths.filter(p=>p.startsWith(oldFolder+'/')&&p.endsWith('.md'))){
    const id=path.split('/').at(-1).replace(/\.md$/,'').replace(/^\d{4}-\d{2}-\d{2}-/,'');
    const old=matter(source(path)),file=join(root,'content',newFolder,id+'.md');
    if(!existsSync(file)){failures.push(`Missing record: ${id}`);continue;}
    const current=matter(readFileSync(file,'utf8'));
    const expected=newFolder==='posts'?`/featured-posts/${new Date(old.data.date).getUTCFullYear()}/${id}/`:`/${newFolder}/${id}/`;
    const refreshed=manifest.refreshedRecords?.find(r=>r.id===id);
    const sameBody=canonical(old.content)===canonical(current.content);
    const samePath=current.data.legacyPath===expected;
    const sameDate=!old.data.date||new Date(old.data.date).getTime()===new Date(current.data.date).getTime();
    const sameComments=!!old.data.giscus_comments===!!current.data.comments;
    if(!sameBody&&!refreshed)failures.push(`Unexplained body change: ${id}`);
    if(!samePath||!sameDate||!sameComments)failures.push(`Metadata loss: ${id}`);
    records.push({id,kind:newFolder,path:expected,body:sameBody?'preserved':'refreshed from current sources',reason:refreshed?.reason,pathPreserved:samePath,datePreserved:sameDate,commentsPreserved:sameComments});
  }
}
const biographyPreserved=canonical(matter(source('_pages/about.md')).content)===canonical(readFileSync(join(root,'content/about.md'),'utf8'));
if(!biographyPreserved)failures.push('Biography differs from the original without a recorded replacement');
const assetRows=git('ls-tree','-r','-z',manifest.sourceCommit,'--','assets').toString('utf8').split('\0').filter(Boolean);
const assets={checked:assetRows.length,missing:[],changed:[],lineEndingsOnly:[],intentionalTextUpdates:[]};
const blobHash=bytes=>createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
for(const row of assetRows){
  const [metadata,path]=row.split('\t'),sha=metadata.split(' ').at(-1),current=join(root,'public',path);
  if(!existsSync(current)){assets.missing.push(path);continue;}
  const bytes=readFileSync(current);
  if(blobHash(bytes)===sha)continue;
  const text=bytes.toString('utf8').replaceAll('\r\n','\n');
  if(blobHash(Buffer.from(text))===sha){assets.lineEndingsOnly.push(path);continue;}
  if(manifest.assetTextReplacements?.[path]){
    let expected=source(path).replaceAll('\r\n','\n');
    for(const [from,to]of Object.entries(manifest.assetTextReplacements[path]))expected=expected.replaceAll(from,to);
    if(expected===text){assets.intentionalTextUpdates.push(path);continue;}
  }
  assets.changed.push(path);
}
if(assets.missing.length||assets.changed.length)failures.push('Legacy asset copies differ; inspect the audit');
const originalResume=ts.parseConfigFileTextToJson('resume.json',source('assets/json/resume.json')).config;
const cv=parse(readFileSync(join(root,'content/cv.yaml'),'utf8'));
const normalizedDate=value=>value==='Present'?value:/^\d{4}-\d{2}-\d{2}$/.test(value)&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value?value:value.slice(0,7);
const cvRecords=[];
for(const kind of ['education','work'])for(const [i,original]of originalResume[kind].entries()){
  const current=cv[kind][i];const checks={institution:current.institution===(original.institution||original.name),start:current.start===normalizedDate(original.startDate),end:current.end===normalizedDate(original.endDate),location:!original.location||current.location===original.location,url:!original.url||current.url===original.url,description:(!original.summary||current.description.includes(original.summary))&&(!original.score||current.description.includes(original.score))&&(original.courses||[]).every(c=>current.description.includes(c))};
  if(Object.values(checks).some(v=>!v))failures.push(`Incomplete CV record: ${kind}/${i}`);
  cvRecords.push({kind,index:i,checks});
}
const contact={phone:cv.basics?.phone===originalResume.basics.phone,url:cv.basics?.url===originalResume.basics.url,label:cv.basics?.label===originalResume.basics.label,summary:cv.basics?.summary===originalResume.basics.summary,address:Object.values(originalResume.basics.location).every(part=>cv.basics?.address?.includes(part))};
if(Object.values(contact).some(v=>!v))failures.push('Incomplete CV contact information');
const oldPapers=bibtex.toJSON(source('_bibliography/papers.bib').replace(/^---\s*\n---\s*\n/,''));
const newPapers=bibtex.toJSON(readFileSync(join(root,'content/publications.bib'),'utf8'));
const papers=oldPapers.filter(p=>p.citationKey).map(p=>{const current=newPapers.find(n=>n.citationKey===p.citationKey);const missing=Object.entries(p.entryTags).filter(([key,value])=>current?.entryTags[key]!==value).map(([key])=>key);if(missing.length)failures.push(`Bibliography fields changed: ${p.citationKey}: ${missing.join(', ')}`);return{id:p.citationKey,originalFieldsPreserved:missing.length===0,missing};});
const oldRepos=parse(source('_data/repositories.yml')).github_repos;
const newRepos=parse(readFileSync(join(root,'content/repositories.yaml'),'utf8'));
const repositories={original:oldRepos.length,current:newRepos.length,missing:oldRepos.filter(r=>!newRepos.includes(r))};
if(repositories.missing.length)failures.push('Original repository links are missing');
const sourceFile=join(root,'.cache/content-audit/readme-sources.json');
const report={reviewDate:manifest.reviewDate,sourceCommit:manifest.sourceCommit,records,biographyPreserved,assets,cvRecords,contact,papers,repositories,restored:manifest.restoredInformation||[],intentionalChanges:manifest.intentionalChanges||[],excludedTemplateContent:['_data/cv.yml (Einstein example)','_pages/about_einstein.md','commented people/teaching/books example pages'],githubSources:existsSync(sourceFile)?JSON.parse(readFileSync(sourceFile,'utf8')):[],failures};
writeFileSync(join(root,'migration-audit.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({records:records.length,assets:assets.checked,biographyPreserved,failures},null,2));
if(failures.length)process.exitCode=1;
