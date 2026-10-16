import {appendFileSync,copyFileSync,existsSync,mkdirSync,readFileSync,realpathSync,rmSync,statSync} from 'node:fs';
import {basename,dirname,isAbsolute,join,relative,resolve,sep} from 'node:path';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {parse} from 'yaml';
import {latexSchema} from '../src/lib/schema.ts';

function contained(root,file){
  const target=resolve(root,file),within=path=>{const rel=relative(root,path);return rel!==''&&rel!=='..'&&!rel.startsWith(`..${sep}`)&&!isAbsolute(rel);};
  if(!within(target))throw new Error(`Path escapes LaTeX content: ${file}`);
  let ancestor=target;
  while(!existsSync(ancestor))ancestor=dirname(ancestor);
  const actual=realpathSync(ancestor);
  if(actual!==root&&!within(actual))throw new Error(`Symlink escapes LaTeX content: ${file}`);
  return target;
}
export function readLatexPlan(directory){
  const root=realpathSync(resolve(directory)),raw=parse(readFileSync(join(root,'site.config.yaml'),'utf8'));
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Expected a site configuration object');
  if(raw.latex===undefined)return undefined;
  const settings=latexSchema.parse(raw.latex);
  const documents=settings.documents.map(doc=>{
    const source=contained(root,doc.source);
    if(!existsSync(source)||!statSync(source).isFile())throw new Error(`Missing LaTeX source: ${doc.source}`);
    return {...doc,sourcePath:source,compiled:contained(root,join(dirname(doc.source),'.latex-build',`${basename(doc.source,'.tex')}.pdf`)),destination:contained(root,`public${doc.output}`)};
  });
  if(new Set(documents.map(doc=>doc.sourcePath)).size!==documents.length)throw new Error('Duplicate resolved LaTeX source');
  return {root,engine:settings.engine,documents};
}
export function prepareLatex(plan,outputFile){
  if(outputFile){
    const fields={enabled:String(!!plan),engine:plan?.engine??'',sources:plan?.documents.map(doc=>doc.source).join('\n')??''};
    for(const [key,value]of Object.entries(fields)){const delimiter=`latex_${randomUUID().replaceAll('-','')}`;appendFileSync(outputFile,`${key}<<${delimiter}\n${value}\n${delimiter}\n`);}
  }
  for(const doc of plan?.documents??[])rmSync(doc.compiled,{force:true});
}
export function publishLatex(plan){
  if(!plan)return;
  for(const doc of plan.documents){
    if(!existsSync(doc.compiled))throw new Error(`Missing compiled PDF: ${doc.source}; compile before publishing`);
    const pdf=readFileSync(doc.compiled);
    if(pdf.length<100||pdf.subarray(0,5).toString()!=='%PDF-')throw new Error(`Invalid compiled PDF: ${doc.source}`);
  }
  for(const doc of plan.documents){mkdirSync(dirname(doc.destination),{recursive:true});copyFileSync(doc.compiled,doc.destination);console.log(`${doc.source} -> ${doc.output}`);}
}
export function buildLatex(plan){
  if(!plan){console.log('No LaTeX documents configured');return;}
  prepareLatex(plan);
  for(const doc of plan.documents){
    const result=spawnSync('latexmk',[plan.engine==='pdflatex'?'-pdf':`-${plan.engine}`,'-norc','-no-shell-escape','-file-line-error','-halt-on-error','-interaction=nonstopmode','-outdir=.latex-build',basename(doc.sourcePath)],{cwd:dirname(doc.sourcePath),stdio:'inherit'});
    if(result.error)throw new Error(`latexmk is required for ${plan.engine}; use the documented CI action or install TeX Live`,{cause:result.error});
    if(result.status!==0)throw new Error(`LaTeX compilation failed: ${doc.source} (exit ${result.status})`);
  }
  publishLatex(plan);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const args=process.argv.slice(2),command=args[0]&&!args[0].startsWith('--')?args.shift():'build';
  if(!['build','prepare','publish'].includes(command))throw new Error('Use latex.mjs build|prepare|publish --content <directory>');
  let directory=resolve('examples/einstein');
  if(args.length){if(args.length!==2||args[0]!=='--content')throw new Error('Use --content <directory>');directory=args[1];}
  const plan=readLatexPlan(directory);
  if(command==='prepare')prepareLatex(plan,process.env.GITHUB_OUTPUT);
  else if(command==='publish')publishLatex(plan);
  else buildLatex(plan);
}
