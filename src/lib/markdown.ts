import MarkdownIt from 'markdown-it';
import { createHighlighter } from 'shiki';
import { href } from './content';
const highlighter = await createHighlighter({ themes:['github-light','github-dark'], langs:['cpp','csharp','cmake','bash','json','lua','python','typescript','javascript','yaml','glsl','xml'] });
const md = new MarkdownIt({ html:true, linkify:true, typographer:true });
const escape = md.utils.escapeHtml;
md.renderer.rules.fence = (tokens,index) => {
  const token=tokens[index], lang=token.info.trim().split(' ')[0];
  if(lang==='mermaid')return `<pre class="mermaid" data-pagefind-ignore>${escape(token.content)}</pre>`;
  const valid = highlighter.getLoadedLanguages().includes(lang);
  return highlighter.codeToHtml(token.content,{lang:valid?lang:'text',themes:{light:'github-light',dark:'github-dark'}});
};
md.renderer.rules.heading_open = (tokens,index,options,_env,self) => {
  const text=tokens[index+1]?.content || '';
  const explicit=text.match(/\s*\{#([\w-]+)\}\s*$/);
  const slug=explicit?explicit[1]:text.toLowerCase().replace(/[^\w\s-]/g,'').replace(/\s+/g,'-');
  if(explicit){tokens[index+1].content=text.replace(explicit[0],'');for(const child of tokens[index+1].children||[])if(child.type==='text')child.content=child.content.replace(/\s*\{#[\w-]+\}\s*$/,'');}
  tokens[index].attrSet('id',slug);
  return self.renderToken(tokens,index,options);
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
