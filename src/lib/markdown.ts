import MarkdownIt from 'markdown-it';
import { createHighlighter } from 'shiki';
import { href } from './content';
const highlighter = await createHighlighter({ themes:['github-light','github-dark'], langs:['cpp','csharp','cmake','bash','json','lua','python','typescript','javascript','yaml','glsl','xml'] });
const md = new MarkdownIt({ html:true, linkify:true, typographer:true });
const escape = md.utils.escapeHtml;
md.renderer.rules.table_open = (tokens,index,options,_env,self) =>
  `<div class="table-scroll" role="region" aria-label="Scrollable table" tabindex="0">${self.renderToken(tokens,index,options)}`;
md.renderer.rules.table_close = (tokens,index,options,_env,self) =>
  `${self.renderToken(tokens,index,options)}</div>\n`;
md.renderer.rules.fence = (tokens,index) => {
  const token=tokens[index], lang=token.info.trim().split(' ')[0];
  if(lang==='mermaid')return `<pre class="mermaid" data-pagefind-ignore>${escape(token.content)}</pre>`;
  const valid = highlighter.getLoadedLanguages().includes(lang);
  return highlighter.codeToHtml(token.content,{lang:valid?lang:'text',themes:{light:'github-light',dark:'github-dark'}});
};
md.core.ruler.push('heading_anchors',state=>{
  const headings=state.tokens.flatMap((token,index)=>token.type==='heading_open'?[{token,inline:state.tokens[index+1]}]:[]);
  const reserved=new Set(headings.map(({inline})=>inline.content.match(/\s*\{#([\w-]+)\}\s*$/)?.[1]).filter(Boolean));
  const used=new Set<string>();
  for(const {token,inline} of headings){
    const text=inline.content, explicit=text.match(/\s*\{#([\w-]+)\}\s*$/);
    // Retain existing English slugs and authored migration anchors.
    const legacy=text.toLowerCase().replace(/[^\w\s-]/g,'').replace(/\s+/g,'-');
    const unicode=text.toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N}\s_-]/gu,'').trim().replace(/\s+/g,'-');
    const base=explicit?.[1]||(/\w/.test(legacy)?legacy:unicode)||'section';
    let id=base, suffix=2;
    while(used.has(id)||(reserved.has(id)&&id!==explicit?.[1]))id=`${base}-${suffix++}`;
    used.add(id);
    if(explicit){inline.content=text.replace(explicit[0],'');for(const child of inline.children||[])if(child.type==='text')child.content=child.content.replace(/\s*\{#[\w-]+\}\s*$/,'');}
    token.attrSet('id',id);
    token.attrJoin('class','has-heading-anchor');
  }
});
md.renderer.rules.heading_close = (tokens,index,options,_env,self) => {
  const id=tokens[index-2].attrGet('id')!;
  const inline=tokens[index-1];
  const label=(inline.children||[]).filter(token=>['text','code_inline','image'].includes(token.type)).map(token=>token.content).join('')||inline.content;
  return ` <a class="heading-anchor" href="#${encodeURIComponent(id)}" data-copy-heading data-pagefind-ignore aria-label="${escape(`Copy link to ${label}`)}" title="Copy link"><span aria-hidden="true">#</span></a>${self.renderToken(tokens,index,options)}`;
};
for(const name of ['image','link_open']) {
  const original=md.renderer.rules[name];
  md.renderer.rules[name]=(tokens,index,options,env,self)=>{
    const token=tokens[index]; const attr=name==='image'?'src':'href';const value=token.attrGet(attr);
    if(value?.startsWith('/'))token.attrSet(attr,href(value));
    if(name==='image'){token.attrSet('loading','lazy');token.attrSet('decoding','async');}
    return original?original(tokens,index,options,env,self):self.renderToken(tokens,index,options);
  };
}
export const renderMarkdown = (body:string) => md.render(body);
