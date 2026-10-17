import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,rmSync,symlinkSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {stringify} from 'yaml';
import {readLatexPlan,prepareLatex,publishLatex,buildLatex,latexCacheKey,checkLatexCache} from '../scripts/latex.mjs';

const document={source:'latex/cv.tex',output:'/assets/pdf/CV.pdf'};
function fixture(run){
  const root=mkdtempSync(join(tmpdir(),'academic-latex-'));
  const configure=latex=>writeFileSync(join(root,'site.config.yaml'),stringify({latex}));
  try{mkdirSync(join(root,'latex'));writeFileSync(join(root,document.source),'\\documentclass{article}');run(root,configure);}
  finally{rmSync(root,{recursive:true,force:true});}
}
test('LaTeX remains optional for content sites',()=>fixture((root,configure)=>{
  configure(undefined);assert.equal(readLatexPlan(root),undefined);assert.doesNotThrow(()=>buildLatex(undefined));
}));
test('LaTeX configuration rejects traversal, commands and duplicate output paths',()=>fixture((root,configure)=>{
  for(const latex of [
    {engine:'sh',documents:[document]},
    {documents:[{...document,source:'../outside.tex'}]},
    {documents:[{...document,source:'latex/-option.tex'}]},
    {documents:[{...document,source:'latex/cv.tex\nother.tex'}]},
    {documents:[{...document,output:'/../../outside.pdf'}]},
    {documents:[document,{source:'other.tex',output:document.output}]},
    {documents:[{...document,source:'latex/missing.tex'}]},
  ]){configure(latex);assert.throws(()=>readLatexPlan(root));}
}));
test('LaTeX plan refuses source or output directories redirected outside the checkout',()=>fixture((root,configure)=>{
  const outside=mkdtempSync(join(tmpdir(),'latex-outside-'));
  try{
    writeFileSync(join(outside,'cv.tex'),'private');symlinkSync(join(outside,'cv.tex'),join(root,'latex/link.tex'));
    configure({documents:[{...document,source:'latex/link.tex'}]});assert.throws(()=>readLatexPlan(root),/Symlink escapes/);
    symlinkSync(outside,join(root,'public'));configure({documents:[document]});assert.throws(()=>readLatexPlan(root),/Symlink escapes/);
  }finally{rmSync(outside,{recursive:true,force:true});}
}));
test('CI preparation removes stale PDFs and emits engine and multi-document outputs',()=>fixture((root,configure)=>{
  writeFileSync(join(root,'latex/zh.tex'),'source');
  configure({engine:'xelatex',documents:[document,{source:'latex/zh.tex',output:'/assets/pdf/CV-zh.pdf'}]});const plan=readLatexPlan(root),pdf=plan.documents[0].compiled;
  mkdirSync(join(root,'latex/.latex-build'));writeFileSync(pdf,'old PDF');
  const output=join(root,'outputs');prepareLatex(plan,output);
  assert.match(readFileSync(output,'utf8'),/enabled<<latex_.*\ntrue\n/);
  assert.match(readFileSync(output,'utf8'),/sources<<latex_.*\nlatex\/cv.tex\nlatex\/zh.tex\n/);
  assert.throws(()=>publishLatex(plan),/Missing compiled PDF/);
}));
test('PDF publication validates every document before replacing public assets',()=>fixture((root,configure)=>{
  writeFileSync(join(root,'latex/zh.tex'),'source');configure({documents:[document,{source:'latex/zh.tex',output:'/assets/pdf/CV-zh.pdf'}]});
  const plan=readLatexPlan(root),fakePdf='%PDF-1.5\n'+'x'.repeat(150)+'\n%%EOF\n';
  mkdirSync(join(root,'latex/.latex-build'));writeFileSync(plan.documents[0].compiled,fakePdf);
  mkdirSync(join(root,'public/assets/pdf'),{recursive:true});writeFileSync(plan.documents[0].destination,'existing snapshot');
  writeFileSync(plan.documents[1].compiled,'not a PDF');assert.throws(()=>publishLatex(plan),/Invalid compiled PDF/);
  assert.equal(readFileSync(plan.documents[0].destination,'utf8'),'existing snapshot');
  writeFileSync(plan.documents[1].compiled,fakePdf);publishLatex(plan);
  for(const doc of plan.documents)assert.equal(readFileSync(doc.destination,'utf8'),fakePdf);
}));


test('PDF cache hashes source, local dependencies, engine and toolchain, not build products',()=>fixture((root,configure)=>{
  configure({documents:[document]});
  const key=()=>latexCacheKey(readLatexPlan(root),['pinned toolchain']);
  const first=key();assert.match(first,/^[a-f0-9]{64}$/);
  mkdirSync(join(root,'latex/.latex-build'));writeFileSync(join(root,'latex/.latex-build/cv.aux'),'generated');
  assert.equal(key(),first);
  mkdirSync(join(root,'public/assets/pdf'),{recursive:true});writeFileSync(join(root,'public/assets/pdf/CV.pdf'),'public snapshot');
  writeFileSync(join(root,'unrelated-homepage.md'),'A new homepage paragraph.');
  assert.equal(key(),first);
  let previous=first;
  for(const [file,bytes]of [['cv.tex','changed source'],['resume.cls','class'],['local.sty','package'],['refs.bib','bibliography'],['font.otf','font bytes'],['cover.png','image bytes']]){
    writeFileSync(join(root,'latex',file),bytes);const next=key();assert.notEqual(next,previous,file);previous=next;
  }
  rmSync(join(root,'latex/cover.png'));assert.notEqual(key(),previous);
  const beforeEngine=key();configure({engine:'lualatex',documents:[document]});assert.notEqual(key(),beforeEngine);
  assert.notEqual(latexCacheKey(readLatexPlan(root),['another TeX image']),key());
}));
test('extra LaTeX inputs are hashed and cannot escape the checkout',()=>fixture((root,configure)=>{
  mkdirSync(join(root,'shared'));writeFileSync(join(root,'shared/header.tex'),'shared');
  configure({inputs:['shared'],documents:[document]});const first=latexCacheKey(readLatexPlan(root));
  writeFileSync(join(root,'shared/header.tex'),'updated');assert.notEqual(latexCacheKey(readLatexPlan(root)),first);
  for(const input of ['../outside','.','shared/missing','/absolute','shared\nother']){
    configure({inputs:[input],documents:[document]});assert.throws(()=>readLatexPlan(root));
  }
  const outside=mkdtempSync(join(tmpdir(),'latex-cache-outside-'));
  try{
    writeFileSync(join(outside,'secret'),'private');symlinkSync(join(outside,'secret'),join(root,'latex/escape'));
    configure({documents:[document]});assert.throws(()=>latexCacheKey(readLatexPlan(root)),/Symlink escapes/);
  }finally{rmSync(outside,{recursive:true,force:true});}
}));
test('cache keys are independent of checkout locations',()=>fixture((root,configure)=>fixture((other,configureOther)=>{
  configure({documents:[document]});configureOther({documents:[document]});
  assert.equal(latexCacheKey(readLatexPlan(root)),latexCacheKey(readLatexPlan(other)));
})));
test('a partial or invalid PDF cache is discarded; a complete valid cache can be published',()=>fixture((root,configure)=>{
  writeFileSync(join(root,'latex/zh.tex'),'source');configure({documents:[document,{source:'latex/zh.tex',output:'/assets/pdf/CV-zh.pdf'}]});
  const plan=readLatexPlan(root),fakePdf='%PDF-1.5\n'+'x'.repeat(150)+'\n%%EOF\n',output=join(root,'outputs');
  mkdirSync(join(root,'latex/.latex-build'));writeFileSync(plan.documents[0].compiled,fakePdf);
  assert.equal(checkLatexCache(plan,output),false);assert.throws(()=>readFileSync(plan.documents[0].compiled));
  for(const doc of plan.documents)writeFileSync(doc.compiled,fakePdf);
  assert.equal(checkLatexCache(plan,output),true);publishLatex(plan);
  assert.match(readFileSync(output,'utf8'),/valid<<latex_.*\ntrue\n/);
  writeFileSync(plan.documents[1].compiled,'%PDF-1.5\n'+'x'.repeat(150));assert.equal(checkLatexCache(plan),false);
  for(const doc of plan.documents)assert.throws(()=>readFileSync(doc.compiled));
}));


test('LaTeX cache rejects cyclic local dependency directories',()=>fixture((root,configure)=>{
  configure({documents:[document]});symlinkSync(join(root,'latex'),join(root,'latex/cycle'));
  assert.throws(()=>latexCacheKey(readLatexPlan(root)),/Cyclic LaTeX input/);
}));
