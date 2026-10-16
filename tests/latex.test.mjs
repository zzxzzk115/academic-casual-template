import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,rmSync,symlinkSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {stringify} from 'yaml';
import {readLatexPlan,prepareLatex,publishLatex,buildLatex} from '../scripts/latex.mjs';

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
  const plan=readLatexPlan(root),fakePdf='%PDF-1.5\n'+'x'.repeat(150);
  mkdirSync(join(root,'latex/.latex-build'));writeFileSync(plan.documents[0].compiled,fakePdf);
  mkdirSync(join(root,'public/assets/pdf'),{recursive:true});writeFileSync(plan.documents[0].destination,'existing snapshot');
  writeFileSync(plan.documents[1].compiled,'not a PDF');assert.throws(()=>publishLatex(plan),/Invalid compiled PDF/);
  assert.equal(readFileSync(plan.documents[0].destination,'utf8'),'existing snapshot');
  writeFileSync(plan.documents[1].compiled,fakePdf);publishLatex(plan);
  for(const doc of plan.documents)assert.equal(readFileSync(doc.destination,'utf8'),fakePdf);
}));
