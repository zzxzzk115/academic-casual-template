import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,cpSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join,sep} from 'node:path';
import {spawnSync} from 'node:child_process';
import {parse,stringify} from 'yaml';
import {safeFile,configSchema,entrySchema} from '../src/lib/content';

test('content paths reject traversal and absolute escapes',()=>{
  const root=resolve('examples/minimal');
  assert.throws(()=>safeFile(root,'../../private'));
  assert.throws(()=>safeFile(root,resolve(root,'../private')));
  assert.equal(safeFile(root,'content/profile.yaml'),join(root,'content/profile.yaml'));
});
test('configuration rejects unsafe colors, wrong versions, and unknown section IDs',()=>{
  const original=parse(readFileSync('examples/minimal/site.config.yaml','utf8'));
  assert.equal(configSchema.parse(original).schemaVersion,1);
  assert.throws(()=>configSchema.parse({...original,schemaVersion:2}));
  assert.throws(()=>configSchema.parse({...original,theme:{...original.theme,academic:'red;display:none'}}));
  assert.throws(()=>configSchema.parse({...original,modes:{...original.modes,academic:{sections:['unregistered']}}}));
});
test('YAML timestamp objects normalize without losing the instant',()=>{
  const entry={id:'note',title:'A note',description:'A real timestamp',legacyPath:'/notes/a/',date:new Date('2025-04-11T01:35:00Z')};
  assert.equal(entrySchema.parse(entry).date,'2025-04-11T01:35:00.000Z');
});
test('social links default to both modes and can be scoped to one mode',()=>{
  const original=parse(readFileSync('examples/minimal/site.config.yaml','utf8'));
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
for(const scenario of ['missing asset','unknown featured project','duplicate path'])test(`build validation catches ${scenario}`,()=>{
  const fixture=mkdtempSync(join(tmpdir(),'academic-casual-'));
  try{
    cpSync('examples/minimal',fixture,{recursive:true});
    if(scenario==='missing asset'){
      const file=join(fixture,'content/projects/sampling-study.md');writeFileSync(file,readFileSync(file,'utf8').replace('/assets/sample.svg','/assets/missing.svg'));
    }else if(scenario==='unknown featured project'){
      const file=join(fixture,'site.config.yaml'),config=parse(readFileSync(file,'utf8'));config.modes.academic.featuredProjects=['missing'];writeFileSync(file,stringify(config));
    }else{
      const file=join(fixture,'content/projects/little-world.md');writeFileSync(file,readFileSync(file,'utf8').replace('/projects/little-world/','/projects/sampling-study/'));
    }
    const result=spawnSync(process.execPath,['--import','tsx','-e',"import('./src/lib/content.ts')"],{env:{...process.env,SITE_CONTENT_ROOT:fixture},encoding:'utf8'});
    assert.notEqual(result.status,0);
    assert.match(result.stderr,/Missing resource|Unknown featured|Duplicate route/);
  }finally{assert.ok(resolve(fixture).startsWith(resolve(tmpdir())+sep+'academic-casual-'));rmSync(fixture,{recursive:true,force:true});}
});
