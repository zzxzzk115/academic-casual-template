import {appendFileSync,copyFileSync,existsSync,mkdirSync,readFileSync,realpathSync,readdirSync,rmSync,statSync} from 'node:fs';
import {basename,dirname,isAbsolute,join,relative,resolve,sep} from 'node:path';
import {spawnSync} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
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
  const inputs=settings.inputs.map(input=>{const path=contained(root,input);if(!existsSync(path))throw new Error(`Missing LaTeX input: ${input}`);return path;});
  return {root,engine:settings.engine,documents,inputs};
}
// Hash project inputs, not checkout locations, timestamps or previous build outputs.
export function latexCacheKey(plan,toolchain){
  if(!plan)return '';
  const files=new Map(),outputs=new Set(plan.documents.map(doc=>doc.destination));
  const visit=(path,ancestors=new Set())=>{
    const rel=relative(plan.root,path).split(sep).join('/');
    const actual=realpathSync(path),within=relative(plan.root,actual);
    if(within==='..'||within.startsWith(`..${sep}`)||isAbsolute(within))throw new Error(`Symlink escapes LaTeX inputs: ${rel}`);
    if(statSync(path).isDirectory()){
      if(ancestors.has(actual))throw new Error(`Cyclic LaTeX input directory: ${rel}`);
      const next=new Set(ancestors).add(actual);
      for(const entry of readdirSync(path).sort())if(!['.git','.latex-build','node_modules'].includes(entry))visit(join(path,entry),next);
    }else if(statSync(path).isFile()&&!outputs.has(path))files.set(rel,readFileSync(path));
    else if(!statSync(path).isFile())throw new Error(`Unsupported LaTeX input: ${rel}`);
  };
  for(const path of new Set([...plan.documents.map(doc=>dirname(doc.sourcePath)),...plan.inputs]))visit(path);
  const hash=createHash('sha256');
  const add=(label,bytes)=>{hash.update(JSON.stringify([label,bytes.length]));hash.update(bytes);};
  add('plan',Buffer.from(JSON.stringify({engine:plan.engine,documents:plan.documents.map(({source,output})=>({source,output}))})));
  const tooling=toolchain??['../.github/actions/compile-latex/action.yml','./latex.mjs'].map(path=>readFileSync(fileURLToPath(new URL(path,import.meta.url))));
  for(const [index,bytes]of tooling.entries())add(`toolchain/${index}`,Buffer.from(bytes));
  for(const [path,bytes]of [...files].sort(([a],[b])=>a<b?-1:a>b?1:0))add(path,bytes);
  return hash.digest('hex');
}
function writeOutputs(outputFile,fields){
  if(outputFile)for(const [key,value]of Object.entries(fields)){const delimiter=`latex_${randomUUID().replaceAll('-','')}`;appendFileSync(outputFile,`${key}<<${delimiter}\n${value}\n${delimiter}\n`);}
}
export function prepareLatex(plan,outputFile){
  if(outputFile){
    writeOutputs(outputFile,{enabled:String(!!plan),engine:plan?.engine??'',sources:plan?.documents.map(doc=>doc.source).join('\n')??'','cache-key':latexCacheKey(plan),'cache-paths':plan?.documents.map(doc=>doc.compiled).join('\n')??''});
  }
  for(const doc of plan?.documents??[])rmSync(doc.compiled,{force:true});
}
function validPdf(file){
  if(!existsSync(file))return false;
  const bytes=readFileSync(file);
  return bytes.length>=100&&bytes.subarray(0,5).toString()==='%PDF-'&&/%%EOF\s*$/.test(bytes.subarray(-1024).toString('latin1'));
}
export function checkLatexCache(plan,outputFile){
  const valid=!!plan&&plan.documents.every(doc=>validPdf(doc.compiled));
  if(!valid)for(const doc of plan?.documents??[])rmSync(doc.compiled,{force:true});
  writeOutputs(outputFile,{valid:String(valid)});
  console.log(valid?'Reusing validated cached LaTeX PDFs':'LaTeX PDFs need compilation');
  return valid;
}
export function publishLatex(plan){
  if(!plan)return;
  for(const doc of plan.documents){
    if(!existsSync(doc.compiled))throw new Error(`Missing compiled PDF: ${doc.source}; compile before publishing`);
    if(!validPdf(doc.compiled))throw new Error(`Invalid compiled PDF: ${doc.source}`);
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
  if(!['build','prepare','publish','check-cache'].includes(command))throw new Error('Use latex.mjs build|prepare|publish|check-cache --content <directory>');
  let directory=resolve('examples/einstein');
  if(args.length){if(args.length!==2||args[0]!=='--content')throw new Error('Use --content <directory>');directory=args[1];}
  const plan=readLatexPlan(directory);
  if(command==='prepare')prepareLatex(plan,process.env.GITHUB_OUTPUT);
  else if(command==='check-cache')checkLatexCache(plan,process.env.GITHUB_OUTPUT);
  else if(command==='publish')publishLatex(plan);
  else buildLatex(plan);
}
