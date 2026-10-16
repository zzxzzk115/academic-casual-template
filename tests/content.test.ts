import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,cpSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join,sep} from 'node:path';
import {spawnSync} from 'node:child_process';
import {parse,stringify} from 'yaml';
import {safeFile,configSchema,entrySchema,nowSchema,homeEntries,nowGroups} from '../src/lib/content';

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
  const configured=configSchema.parse({...original,projectCategories:{work:'Field studies'},sectionLabels:{interests:'Outside work'},modes:{...original.modes,casual:{...original.modes.casual,navigation:['projects','contact'],sectionTitles:{projects:'Selected work'}}}});
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
test('home eligibility defaults on and respects both visibility and presentation mode',()=>{
  const entry={id:'note',title:'Note',description:'A note',legacyPath:'/notes/note/'};
  const records=[
    {...entrySchema.parse(entry),body:'',kind:'post'},
    {...entrySchema.parse({...entry,id:'hidden',home:false}),body:'',kind:'post'},
    {...entrySchema.parse({...entry,id:'casual',modes:['casual']}),body:'',kind:'post'},
  ];
  assert.deepEqual(homeEntries(records,'academic').map(entry=>entry.id),['note']);
  assert.deepEqual(homeEntries(records,'casual').map(entry=>entry.id),['note','casual']);
  assert.throws(()=>entrySchema.parse({...entry,home:'false'}));
});
test('optional now content validates dates, links and item identity',()=>{
  assert.deepEqual(nowGroups('academic'),[]);
  assert.deepEqual(nowSchema.parse({}),{workingOn:[],exploring:[],upNext:[]});
  assert.throws(()=>nowSchema.parse({updated:'2026-02-30'}));
  assert.throws(()=>nowSchema.parse({workingOn:[{description:'No identity'}]}));
  assert.throws(()=>nowSchema.parse({exploring:[{title:'Unsafe',description:'A topic',href:'javascript:alert(1)'}]}));
  const parsed=nowSchema.parse({updated:'2026-10-16',upNext:[{projectId:'special-relativity',description:'An experiment',modes:['academic']}]});
  assert.equal(parsed.upNext[0].projectId,'special-relativity');
});
for(const scenario of ['missing asset','unknown featured project','unknown now project','unavailable now project','duplicate path'])test(`build validation catches ${scenario}`,()=>{
  const fixture=mkdtempSync(join(tmpdir(),'academic-casual-'));
  try{
    cpSync('examples/einstein',fixture,{recursive:true});
    if(scenario==='missing asset'){
      const file=join(fixture,'site.config.yaml'),config=parse(readFileSync(file,'utf8'));config.identity.photo='/assets/missing.jpg';writeFileSync(file,stringify(config));
    }else if(scenario==='unknown featured project'){
      const file=join(fixture,'site.config.yaml'),config=parse(readFileSync(file,'utf8'));config.modes.academic.featuredProjects=['missing'];writeFileSync(file,stringify(config));
    }else if(scenario==='unknown now project'){
      writeFileSync(join(fixture,'content/now.yaml'),stringify({workingOn:[{projectId:'missing',description:'A missing project'}]}));
    }else if(scenario==='unavailable now project'){
      const file=join(fixture,'content/projects/light-quanta.md');
      writeFileSync(file,readFileSync(file,'utf8').replace(/^---\n/,'---\nmodes: [academic]\n'));
      const configFile=join(fixture,'site.config.yaml'),config=parse(readFileSync(configFile,'utf8'));
      config.modes.casual.featuredProjects=config.modes.casual.featuredProjects.filter((id:string)=>id!=='light-quanta');
      writeFileSync(configFile,stringify(config));
      writeFileSync(join(fixture,'content/now.yaml'),stringify({exploring:[{projectId:'light-quanta',description:'A scoped project',modes:['casual']}]}));
    }else{
      const file=join(fixture,'content/projects/light-quanta.md');writeFileSync(file,readFileSync(file,'utf8').replace('/projects/light-quanta/','/projects/special-relativity/'));
    }
    const result=spawnSync(process.execPath,['--import','tsx','-e',"import('./src/lib/content.ts')"],{env:{...process.env,SITE_CONTENT_ROOT:fixture},encoding:'utf8'});
    assert.notEqual(result.status,0);
    assert.match(result.stderr,/Missing resource|Unknown featured|Unknown now project|Now project .* unavailable|Duplicate route/);
  }finally{assert.ok(resolve(fixture).startsWith(resolve(tmpdir())+sep+'academic-casual-'));rmSync(fixture,{recursive:true,force:true});}
});
