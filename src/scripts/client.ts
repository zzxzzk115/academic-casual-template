import {watchGiscusTheme} from './giscus-theme';
const base=document.body.dataset.base || '/';
const mode=new URLSearchParams(location.search).get('mode')==='casual'||document.body.dataset.mode==='casual'?'casual':'academic';
document.documentElement.dataset.mode=mode;
document.querySelectorAll<HTMLAnchorElement>('[data-mode-link]').forEach(a=>{if(a.dataset.modeLink===mode)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
document.querySelectorAll<HTMLElement>('[data-nav-mode]').forEach(nav=>nav.hidden=nav.dataset.navMode!==mode);
if(mode==='casual')document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(a=>{const url=new URL(a.href);if(url.origin===location.origin&&url.pathname.startsWith(base)&&!url.pathname.includes('/assets/')&&!url.pathname.includes('/blog/')&&!/\.(bib|xml|txt|pdf)$/.test(url.pathname)&&!a.dataset.modeLink&&!a.hasAttribute('data-mode-fixed')){if(url.pathname===base)url.pathname=`${base}casual/`;else if(!url.pathname.includes('/casual/'))url.searchParams.set('mode','casual');a.href=url.href;}});
document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle],[data-search],[data-menu]').forEach(b=>b.hidden=false);
const siteHeader=document.querySelector<HTMLElement>('.site-header');
if(siteHeader){
  const updateHeaderHeight=()=>document.documentElement.style.setProperty('--header-height',`${Math.ceil(siteHeader.getBoundingClientRect().height)}px`);
  updateHeaderHeight();
  new ResizeObserver(updateHeaderHeight).observe(siteHeader);
}
const toast=(message:string)=>{const box=document.querySelector<HTMLElement>('.toast')!;box.textContent=message;box.classList.add('visible');setTimeout(()=>box.classList.remove('visible'),2200);};
const backToTop=document.querySelector<HTMLButtonElement>('[data-back-to-top]');
if(backToTop){
  const updateBackToTop=()=>{backToTop.hidden=window.scrollY<=Math.min(600,window.innerHeight);};
  window.addEventListener('scroll',updateBackToTop,{passive:true});
  window.addEventListener('resize',updateBackToTop);
  window.addEventListener('pageshow',updateBackToTop);
  updateBackToTop();
  backToTop.addEventListener('click',()=>{
    document.querySelector<HTMLAnchorElement>('.site-header .brand')?.focus({preventScroll:true});
    window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  });
}
watchGiscusTheme();
document.querySelector('[data-theme-toggle]')?.addEventListener('click',()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;try{localStorage.setItem('color-theme',theme);}catch{}});
const systemTheme=matchMedia('(prefers-color-scheme: dark)');
const followSystemTheme=()=>{try{if(localStorage.getItem('color-theme'))return;}catch{}document.documentElement.dataset.theme=systemTheme.matches?'dark':'light';};
systemTheme.addEventListener('change',followSystemTheme);
window.addEventListener('storage',event=>{if(event.key==='color-theme'||event.key===null){if(event.newValue==='light'||event.newValue==='dark')document.documentElement.dataset.theme=event.newValue;else followSystemTheme();}});
const menu=document.querySelector<HTMLButtonElement>('[data-menu]')!,mobile=document.querySelector<HTMLElement>('.mobile-nav')!;
const setMenuOpen=(open:boolean)=>{mobile.hidden=!open;menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close navigation':'Open navigation');};
menu?.addEventListener('click',()=>setMenuOpen(Boolean(mobile.hidden)));
mobile?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setMenuOpen(false)));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!mobile.hidden){setMenuOpen(false);menu.focus();}});
document.addEventListener('click',e=>{if(!mobile.hidden&&e.target instanceof Node&&!mobile.contains(e.target)&&!menu.contains(e.target))setMenuOpen(false);});
matchMedia('(max-width:1000px)').addEventListener('change',()=>setMenuOpen(false));
document.querySelectorAll<HTMLElement>('[data-gallery]').forEach(gallery=>{const buttons=[...gallery.querySelectorAll<HTMLButtonElement>('[data-filter]')];const apply=(button:HTMLButtonElement)=>{buttons.forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false');});button.classList.add('active');button.setAttribute('aria-pressed','true');let count=0;gallery.querySelectorAll<HTMLElement>('[data-category]').forEach(card=>{card.hidden=button.dataset.filter!=='all'&&card.dataset.category!==button.dataset.filter;if(!card.hidden)count++;});gallery.querySelector('[data-filter-status]')!.textContent=`Showing ${count} ${gallery.dataset.galleryLabel}`;};buttons.forEach(button=>button.addEventListener('click',()=>apply(button)));const fromHash=buttons.find(button=>button.dataset.filter===location.hash.slice(1));if(fromHash)apply(fromHash);});
document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach(b=>b.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(b.dataset.copy!);toast('BibTeX copied.');}catch{toast('Copy unavailable. Use the .bib download instead.');}}));
document.querySelectorAll<HTMLAnchorElement>('[data-copy-contact]').forEach(anchor=>anchor.addEventListener('click',async event=>{
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();
  try{await navigator.clipboard.writeText(anchor.dataset.copyContact!);toast(`${anchor.dataset.contactLabel} ID copied.`);}
  catch{location.assign(anchor.href);}
}));
async function copyHeadingLink(anchor:HTMLAnchorElement,event:MouseEvent){
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();
  const url=new URL(location.href);
  url.hash=anchor.hash;
  try{await navigator.clipboard.writeText(url.href);toast('Link copied.');}
  catch{location.hash=url.hash;toast('Copy unavailable. Copy the link from the address bar.');}
}
document.querySelectorAll<HTMLAnchorElement>('[data-copy-heading]').forEach(anchor=>{
  anchor.addEventListener('click',event=>void copyHeadingLink(anchor,event));
  anchor.closest<HTMLElement>('.has-heading-anchor')?.addEventListener('click',event=>{
    if(!(event.target instanceof Element)||event.target.closest('a,button')||!window.getSelection()?.isCollapsed)return;
    void copyHeadingLink(anchor,event);
  });
});
const dialog=document.querySelector<HTMLDialogElement>('#search-dialog')!;
let searchPromise:Promise<void>|undefined;
if(mode==='casual')new MutationObserver(()=>{document.querySelectorAll<HTMLAnchorElement>('#search-results a[href]').forEach(a=>{const u=new URL(a.href);if(u.origin===location.origin&&!u.pathname.includes('/casual/')){if(u.pathname===base)u.pathname=`${base}casual/`;else u.searchParams.set('mode','casual');a.href=u.href;}});}).observe(document.querySelector('#search-results')!,{childList:true,subtree:true});
function ensureSearch(){return searchPromise??=new Promise<void>((resolve,reject)=>{const css=document.createElement('link');css.rel='stylesheet';css.href=`${base}pagefind/pagefind-ui.css`;document.head.append(css);const script=document.createElement('script');script.src=`${base}pagefind/pagefind-ui.js`;script.onload=()=>{new (window as any).PagefindUI({element:'#search-results',showSubResults:true,showImages:false,baseUrl:base,autofocus:true});resolve();};script.onerror=()=>{searchPromise=undefined;reject(new Error('Search unavailable'));};document.head.append(script);});}
const openSearch=async()=>{setMenuOpen(false);dialog.showModal();try{await ensureSearch();dialog.querySelector<HTMLInputElement>('input')?.focus();}catch{document.querySelector('#search-results')!.textContent='Search is available in the published build. Browse the projects and writing links in the meantime.';}};
document.querySelector('[data-search]')?.addEventListener('click',openSearch);
document.querySelector('[data-search-close]')?.addEventListener('click',()=>dialog.close());
dialog?.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();const p=e as MouseEvent;if(p.clientX<r.left||p.clientX>r.right||p.clientY<r.top||p.clientY>r.bottom)dialog.close();}});
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();openSearch();}});
const mermaids=document.querySelectorAll<HTMLElement>('pre.mermaid');
if(mermaids.length){
  const observer=new IntersectionObserver(async entries=>{
    if(!entries.some(e=>e.isIntersecting))return;
    observer.disconnect();
    const {default:mermaid}=await import('mermaid');
    await document.fonts.ready;
    mermaid.initialize({
      startOnLoad:false,
      theme:document.documentElement.dataset.theme==='dark'?'dark':'neutral',
      securityLevel:'strict',
      // Native SVG text avoids clipped foreignObject labels at fractional browser zoom.
      htmlLabels:false,
      fontFamily:getComputedStyle(document.body).fontFamily,
      flowchart:{wrappingWidth:220},
    });
    try{
      await mermaid.run({nodes:mermaids});
      mermaids.forEach(el=>{
        const svg=el.querySelector('svg');
        if(!svg?.viewBox.baseVal.width)return;
        // Keep text at its rendered size; narrow screens scroll the diagram region.
        svg.style.width=`${Math.ceil(svg.viewBox.baseVal.width)}px`;
        svg.style.maxWidth='none';
      });
    }catch{console.warn('Diagram could not be rendered; the source remains available.');}
  },{rootMargin:'200px'});
  mermaids.forEach(el=>observer.observe(el));
}
document.querySelectorAll<HTMLElement>('[data-comments]').forEach(el=>{const observer=new IntersectionObserver(entries=>{if(!entries.some(e=>e.isIntersecting))return;observer.disconnect();const script=document.createElement('script');script.src='https://giscus.app/client.js';script.async=true;script.crossOrigin='anonymous';for(const key of ['repo','repoId','category','categoryId'])script.setAttribute(`data-${key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())}`,el.dataset[key]!);Object.entries({mapping:'pathname',strict:'0',reactionsEnabled:'1',emitMetadata:'0',inputPosition:'bottom',theme:document.documentElement.dataset.theme||'light',lang:'en',loading:'lazy'}).forEach(([k,v])=>script.setAttribute(`data-${k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())}`,v));el.append(script);},{rootMargin:'200px'});observer.observe(el);});

const toc=document.querySelector<HTMLDetailsElement>('[data-toc]');
if(toc){
  const roomy=matchMedia('(min-width:1200px)');
  const updateToc=()=>{toc.open=roomy.matches;};
  updateToc();
  roomy.addEventListener('change',updateToc);
}
