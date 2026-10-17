import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,cpSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join,sep} from 'node:path';
import {spawnSync} from 'node:child_process';
import {parse,stringify} from 'yaml';
import matter from 'gray-matter';
import {safeFile,configSchema,entrySchema,nowSchema,href,homeEntries,nowGroups,homeProjects,homeHero} from '../src/lib/content';

function editRecord(file:string,patch:Record<string,unknown>){
  const parsed=matter(readFileSync(file,'utf8'));
  writeFileSync(file,matter.stringify(parsed.content,{...parsed.data,...patch}));
}

test('content paths reject traversal and absolute escapes',()=>{
  const root=resolve('examples/einstein');
  assert.throws(()=>safeFile(root,'../../private'));
  assert.throws(()=>safeFile(root,resolve(root,'../private')));
  assert.equal(safeFile(root,'content/profile.yaml'),join(root,'content/profile.yaml'));
});
test('configuration rejects unsafe colors, wrong versions, and unknown section IDs',()=>{
  const original=parse(readFileSync('examples/einstein/site.config.yaml','utf8'));
  assert.equal(configSchema.parse(original).schemaVersion,1);
  assert.throws(()=>configSchema.parse({...original,schemaVersion:2}));
  assert.throws(()=>configSchema.parse({...original,theme:{...original.theme,academic:'red;display:none'}}));
  assert.throws(()=>configSchema.parse({...original,modes:{...original.modes,academic:{sections:['unregistered']}}}));
});
test('CV downloads support independent language, region and script tags',()=>{
  const original=parse(readFileSync('examples/einstein/site.config.yaml','utf8'));
  const languages=['en','zh-Hans','zh-Hant-TW','pt-BR','sr-Latn','ar','ja','ko','de','hi'];
  const cv=languages.map(lang=>({label:lang,lang,href:`/assets/pdf/CV-${lang}.pdf`}));
  assert.equal(configSchema.parse({...original,identity:{...original.identity,cv}}).identity.cv?.length,languages.length);
  for(const lang of ['', 'en_US','not a language','zh--CN'])assert.throws(()=>configSchema.parse({...original,identity:{...original.identity,cv:[{label:'CV',href:'/cv.pdf',lang}]}}));
});
test('external navigation links require HTTP URLs and support independent mode visibility',()=>{
  const original=parse(readFileSync('examples/einstein/site.config.yaml','utf8'));
  assert.deepEqual(configSchema.parse(original).externalLinks,[]);
  const links=[{label:'Blog',href:'https://example.org/blog/',icon:'solid:book-open'},{label:'Games',href:'https://example.org/games/',modes:['casual']}];
  const configured=configSchema.parse({...original,externalLinks:links}).externalLinks;
  assert.deepEqual(configured[0].modes,['academic','casual']);
  assert.deepEqual(configured[1].modes,['casual']);
  for(const href of ['/blog/','//example.org','javascript:alert(1)','data:text/html,test','mailto:me@example.org'])assert.throws(()=>configSchema.parse({...original,externalLinks:[{label:'Blog',href}]}));
  for(const patch of [{label:''},{icon:'<svg>'},{modes:[]},{modes:['unknown']}])assert.throws(()=>configSchema.parse({...original,externalLinks:[{...links[0],...patch}]}));
});
test('QQ social links preserve the client contact URL and mode visibility',()=>{
  const original=parse(readFileSync('examples/einstein/site.config.yaml','utf8'));
  const link={label:'QQ',href:'tencent://AddContact/?fromId=45&uin=123456789',icon:'brands:qq',modes:['casual']};
  const configured=configSchema.parse({...original,socials:[link]}).socials[0];
  assert.equal(href(configured.href,'casual'),link.href);
  assert.deepEqual(configured.modes,['casual']);
  for(const href of ['tencent://AddContact/','tencent://AddContact/?uin=invalid','tencent://OtherAction/?uin=123','javascript:alert(1)','data:text/html,test'])assert.throws(()=>configSchema.parse({...original,socials:[{...link,href}]}));
});
test('mode profile overrides are optional and independent',()=>{
  const original=parse(readFileSync('examples/einstein/site.config.yaml','utf8'));
  const configured=configSchema.parse({...original,modes:{...original.modes,academic:{...original.modes.academic,sidebar:undefined},casual:{...original.modes.casual,sidebar:true,email:'casual@example.org',address:'',photo:'https://example.org/alternate-avatar.png'}}});
  assert.equal(configured.identity.photo,original.identity.photo);
  assert.equal(configured.modes.academic.sidebar,false);
  assert.equal(configured.modes.casual.sidebar,true);
  assert.equal(configured.modes.academic.photo,undefined);
  assert.equal(configured.modes.academic.email,undefined);
  assert.equal(configured.modes.academic.address,undefined);
  assert.equal(configured.modes.casual.address,'');
  assert.equal(configured.identity.email,original.identity.email);
  assert.equal(configured.modes.casual.email,'casual@example.org');
  assert.throws(()=>configSchema.parse({...original,modes:{...original.modes,casual:{...original.modes.casual,email:'invalid-email'}}}));
  assert.equal(configured.modes.casual.photo,'https://example.org/alternate-avatar.png');
  assert.throws(()=>configSchema.parse({...original,modes:{...original.modes,casual:{...original.modes.casual,photo:''}}}));
});
test('optional homepage banners validate dimensions, links and mode visibility',()=>{
  const original=parse(readFileSync('examples/einstein/site.config.yaml','utf8'));
  assert.deepEqual(configSchema.parse(original).banner?.modes,['academic']);
  assert.equal(configSchema.parse({...original,banner:undefined}).banner,undefined);
  const banner={image:'/assets/feature.svg',alt:'A rendering overview',width:1600,height:400};
  assert.deepEqual(configSchema.parse({...original,banner}).banner?.modes,['academic','casual']);
  assert.deepEqual(configSchema.parse({...original,banner:{...banner,modes:['academic']}}).banner?.modes,['academic']);
  for(const patch of [{width:0},{height:-1},{alt:''},{modes:[]},{href:'javascript:alert(1)'}]) assert.throws(()=>configSchema.parse({...original,banner:{...banner,...patch}}));
});
test('project thumbnail fill is optional and supports cover or contain',()=>{
  const entry={id:'demo',title:'Demo',description:'An application',legacyPath:'/projects/demo/'};
  assert.equal(entrySchema.parse(entry).imageFit,'cover');
  assert.equal(entrySchema.parse({...entry,imageFit:'contain'}).imageFit,'contain');
  assert.throws(()=>entrySchema.parse({...entry,imageFit:'stretch'}));
});
test('mode-aware links preserve query strings and publication fragments',()=>{
  assert.equal(href('/publications/#paper','casual'),'/publications/?mode=casual#paper');
  assert.equal(href('/projects/demo/?view=1#method','casual'),'/projects/demo/?view=1&mode=casual#method');
  assert.equal(href('/assets/paper.pdf#page=2','casual'),'/assets/paper.pdf#page=2');
});
test('YAML timestamp objects normalize without losing the instant',()=>{
  const entry={id:'note',title:'A note',description:'A real timestamp',legacyPath:'/notes/a/',date:new Date('2025-04-11T01:35:00Z')};
  assert.equal(entrySchema.parse(entry).date,'2025-04-11T01:35:00.000Z');
});

test('historical profiles do not require an email, handle or blog',()=>{
  const example=configSchema.parse(parse(readFileSync('examples/einstein/site.config.yaml','utf8')));
  assert.equal(example.identity.email,undefined);
  assert.equal(example.identity.handle,undefined);
  assert.equal(example.blog,undefined);
  assert.equal(example.hero.enabled,false);
  assert.equal(example.socials[0].primary,true);
});

test('mode navigation and display labels belong to site configuration',()=>{
  const original=parse(readFileSync('examples/einstein/site.config.yaml','utf8'));
  const configured=configSchema.parse({...original,projectCategories:{work:'Field studies'},sectionLabels:{interests:'Outside work'},modes:{...original.modes,casual:{...original.modes.casual,navigation:['projects','interests'],sectionTitles:{projects:'Selected work'}}}});
  assert.equal(configured.projectCategories.work,'Field studies');
  assert.equal(configured.modes.casual.sectionTitles.projects,'Selected work');
  assert.throws(()=>configSchema.parse({...original,modes:{...original.modes,casual:{sections:['projects'],navigation:['contact']}}}));
  assert.throws(()=>configSchema.parse({...original,modes:{...original.modes,casual:{sections:['projects','projects']}}}));
});
test('social links default to both modes and can be scoped to one mode',()=>{
  const original=parse(readFileSync('examples/einstein/site.config.yaml','utf8'));
  assert.deepEqual(configSchema.parse(original).socials[0].modes,['academic','casual']);
  const scoped={...original,socials:[{label:'Games',href:'https://example.com/games',icon:'brands:itch-io',modes:['casual']}]};
  assert.deepEqual(configSchema.parse(scoped).socials[0].modes,['casual']);
  assert.throws(()=>configSchema.parse({...scoped,socials:[{...scoped.socials[0],modes:['private']}]}));
});
test('project action links reject executable URLs',()=>{
  const entry={id:'demo',title:'Demo',description:'A browser project',legacyPath:'/projects/demo/',links:[{label:'Play',href:'javascript:alert(1)'}]};
  assert.throws(()=>entrySchema.parse(entry));
  assert.equal(entrySchema.parse({...entry,links:[{label:'Play',href:'https://example.com/demo/'}]}).links.length,1);
});
test('home is an explicit shared opt-in with mode-specific ordering',()=>{
  const entry={id:'note',title:'Note',description:'A note',legacyPath:'/notes/note/'};
  const records=[
    {...entrySchema.parse({...entry,home:true}),body:'',kind:'post'},
    {...entrySchema.parse({...entry,id:'unmarked'}),body:'',kind:'post'},
    {...entrySchema.parse({...entry,id:'ordered',home:{academic:{order:1},casual:false}}),body:'',kind:'post'},
    {...entrySchema.parse({...entry,id:'hidden',home:false}),body:'',kind:'post'},
    {...entrySchema.parse({...entry,id:'casual',modes:['casual'],home:true}),body:'',kind:'post'},
  ];
  assert.deepEqual(homeEntries(records,'academic').map(entry=>entry.id),['ordered','note']);
  assert.deepEqual(homeEntries(records,'casual').map(entry=>entry.id),['note','casual']);
  assert.throws(()=>entrySchema.parse({...entry,home:'false'}));
  assert.throws(()=>entrySchema.parse({...entry,home:{casul:true}}));
  assert.throws(()=>entrySchema.parse({...entry,home:{casual:{order:'1'}}}));
});
test('optional now content validates dates, links and item identity',()=>{
  assert.deepEqual(nowGroups('academic'),[]);
  assert.deepEqual(nowSchema.parse({}),{workingOn:[],exploring:[],upNext:[]});
  assert.throws(()=>nowSchema.parse({updated:'2026-02-30'}));
  assert.throws(()=>nowSchema.parse({workingOn:[{description:'No identity'}]}));
  assert.throws(()=>nowSchema.parse({exploring:[{title:'Unsafe',description:'A topic',href:'javascript:alert(1)'}]}));
  const parsed=nowSchema.parse({updated:'2026-10-16',upNext:[{projectId:'special-relativity',description:'An experiment',modes:['academic']}]});
  assert.equal(parsed.upNext[0].projectId,'special-relativity');
  assert.deepEqual(parsed.upNext[0].items,[]);
  const detail={title:'Visibility',description:'Test GPU culling',href:'/projects/special-relativity/'};
  const entry={title:'Rendering studies',description:'Small demos',itemsTitle:'Study topics',items:[detail,{title:'A concise item'}]};
  for(const group of ['workingOn','exploring','upNext'] as const){
    const item=nowSchema.parse({[group]:[entry]})[group][0];
    assert.equal(item.itemsTitle,'Study topics');
    assert.deepEqual(item.items,[detail,{title:'A concise item'}]);
  }
  assert.equal(nowSchema.parse({upNext:[{title:'Topic',description:'Details',items:[{title:'Untitled list'}]}]}).upNext[0].itemsTitle,undefined);
  for(const invalid of [{title:''},{title:'Visibility',description:''},{title:'Unsafe',href:'javascript:alert(1)'}]){
    assert.throws(()=>nowSchema.parse({exploring:[{...entry,items:[invalid]}]}));
  }
  assert.throws(()=>nowSchema.parse({workingOn:[{...entry,itemsTitle:''}]}));
});
test('hero selection falls back to the first home project',()=>{
  assert.equal(homeHero('casual')?.id,homeProjects('casual')[0]?.id);
});
test('home hero selection is independent of homepage ordering',()=>{
  const fixture=mkdtempSync(join(tmpdir(),'academic-casual-'));
  try{
    cpSync('examples/einstein',fixture,{recursive:true});
    editRecord(join(fixture,'content/projects/special-relativity.md'),{home:{casual:{order:1}}});
    editRecord(join(fixture,'content/projects/light-quanta.md'),{home:{casual:{order:3,hero:true}}});
    editRecord(join(fixture,'content/projects/brownian-motion.md'),{home:false});
    const result=spawnSync(process.execPath,['--import','tsx','-e',"import('./src/lib/content.ts').then(m=>{if(m.homeHero('casual')?.id!=='light-quanta'||m.homeProjects('casual')[0]?.id!=='special-relativity')process.exit(1)})"],{env:{...process.env,SITE_CONTENT_ROOT:fixture},encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
  }finally{rmSync(fixture,{recursive:true,force:true});}
});
for(const scenario of ['duplicate home heroes','unavailable home mode','non-project hero','academic hero','obsolete project selector','obsolete featured flag','obsolete paper flag','missing asset','missing mode portrait','missing banner image','missing favicon','unknown now project','unavailable now project','duplicate path'])test(`build validation catches ${scenario}`,()=>{
  const fixture=mkdtempSync(join(tmpdir(),'academic-casual-'));
  try{
    cpSync('examples/einstein',fixture,{recursive:true});
    if(scenario==='duplicate home heroes'){
      for(const name of ['special-relativity','light-quanta']) editRecord(join(fixture,`content/projects/${name}.md`),{home:{casual:{hero:true}}});
    }else if(scenario==='unavailable home mode'){
      editRecord(join(fixture,'content/projects/light-quanta.md'),{modes:['academic'],home:{casual:true}});
    }else if(scenario==='non-project hero'){
      editRecord(join(fixture,'content/posts/reading-einstein.md'),{home:{casual:{hero:true}}});
    }else if(scenario==='academic hero'){
      editRecord(join(fixture,'content/projects/light-quanta.md'),{home:{academic:{hero:true}}});
    }else if(scenario==='obsolete project selector'){
      const file=join(fixture,'site.config.yaml'),config=parse(readFileSync(file,'utf8'));config.modes.casual.heroProject='light-quanta';writeFileSync(file,stringify(config));
    }else if(scenario==='obsolete featured flag'){
      editRecord(join(fixture,'content/projects/light-quanta.md'),{featured:true});
    }else if(scenario==='obsolete paper flag'){
      writeFileSync(join(fixture,'content/publications.bib'),'@article{old,title={Old},author={Author},year={2020},selected={true}}');
    }else if(scenario==='missing asset'){
      const file=join(fixture,'site.config.yaml'),config=parse(readFileSync(file,'utf8'));config.identity.photo='/assets/missing.jpg';writeFileSync(file,stringify(config));
    }else if(scenario==='missing mode portrait'){
      const file=join(fixture,'site.config.yaml'),config=parse(readFileSync(file,'utf8'));config.modes.casual.photo='/assets/missing-mode-portrait.png';writeFileSync(file,stringify(config));
    }else if(scenario==='missing favicon'){
      const file=join(fixture,'site.config.yaml'),config=parse(readFileSync(file,'utf8'));config.site.favicon='/assets/missing-favicon.svg';writeFileSync(file,stringify(config));
    }else if(scenario==='missing banner image'){
      const file=join(fixture,'site.config.yaml'),config=parse(readFileSync(file,'utf8'));config.banner={image:'/assets/missing-banner.svg',alt:'A feature image',width:1600,height:400};writeFileSync(file,stringify(config));
    }else if(scenario==='unknown now project'){
      writeFileSync(join(fixture,'content/now.yaml'),stringify({workingOn:[{projectId:'missing',description:'A missing project'}]}));
    }else if(scenario==='unavailable now project'){
      editRecord(join(fixture,'content/projects/light-quanta.md'),{modes:['academic'],home:{academic:true}});
      writeFileSync(join(fixture,'content/now.yaml'),stringify({exploring:[{projectId:'light-quanta',description:'A scoped project',modes:['casual']}]}));
    }else{
      editRecord(join(fixture,'content/projects/light-quanta.md'),{legacyPath:'/projects/special-relativity/'});
    }
    const result=spawnSync(process.execPath,['--import','tsx','-e',"import('./src/lib/content.ts')"],{env:{...process.env,SITE_CONTENT_ROOT:fixture},encoding:'utf8'});
    assert.notEqual(result.status,0);
    assert.match(result.stderr,/Multiple home heroes|Home metadata .* unavailable|Only projects|only supported in casual|Unrecognized key|Replace featured|Replace selected|Missing resource|Unknown now project|Now project .* unavailable|Duplicate route/);
  }finally{assert.ok(resolve(fixture).startsWith(resolve(tmpdir())+sep+'academic-casual-'));rmSync(fixture,{recursive:true,force:true});}
});

test('publications use the shared home metadata and retain every archive record',()=>{
  const fixture=mkdtempSync(join(tmpdir(),'academic-casual-'));
  try{
    cpSync('examples/einstein',fixture,{recursive:true});
    writeFileSync(join(fixture,'content/publications.bib'),[
      '@article{chosen,title={Chosen},author={Author},year={2026},home={true}}',
      '@article{unselected,title={Unselected},author={Author},year={2025},home={false}}',
      '@article{unmarked,title={Unmarked},author={Author},year={2023}}',
      '@article{scoped,title={Scoped},author={Author},year={2027},home={{"academic":{"order":1},"casual":false}}}',
    ].join('\n'));
    const script="import('./src/lib/content.ts').then(m=>process.stdout.write(JSON.stringify({all:m.publications.map(p=>p.id),home:m.homePublications('academic').map(p=>p.id),casual:m.homePublications('casual').map(p=>p.id),copy:m.publications[0].bibtex})))";
    const result=spawnSync(process.execPath,['--import','tsx','-e',script],{env:{...process.env,SITE_CONTENT_ROOT:fixture},encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
    const parsed=JSON.parse(result.stdout);
    assert.deepEqual(parsed.all,['scoped','chosen','unselected','unmarked']);
    assert.deepEqual(parsed.home,['scoped','chosen']);
    assert.deepEqual(parsed.casual,['chosen']);
    assert.doesNotMatch(parsed.copy,/home\s*=/);
  }finally{rmSync(fixture,{recursive:true,force:true});}
});


test('TOC defaults on site-wide and supports per-record overrides',()=>{
  const original=parse(readFileSync('examples/einstein/site.config.yaml','utf8'));
  assert.equal(configSchema.parse(original).toc,true);
  assert.equal(configSchema.parse({...original,toc:false}).toc,false);
  const entry={id:'demo',title:'Demo',description:'An application',legacyPath:'/projects/demo/'};
  assert.equal(entrySchema.parse(entry).toc,undefined);
  assert.equal(entrySchema.parse({...entry,toc:false}).toc,false);
  assert.equal(entrySchema.parse({...entry,toc:true}).toc,true);
  assert.throws(()=>entrySchema.parse({...entry,toc:'yes'}));
});
