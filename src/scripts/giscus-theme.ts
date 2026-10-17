// Giscus loads asynchronously. Keep pending scripts and loaded widgets on the
// current site theme, including a switch made while the iframe was loading.
export function watchGiscusTheme(doc:Document=document){
  const sync=()=>{
    const theme=doc.documentElement.dataset.theme==='dark'?'dark':'light';
    doc.querySelectorAll<HTMLScriptElement>('[data-comments] script[src="https://giscus.app/client.js"]').forEach(script=>script.dataset.theme=theme);
    doc.querySelectorAll<HTMLIFrameElement>('iframe.giscus-frame').forEach(frame=>{
      frame.contentWindow?.postMessage({giscus:{setConfig:{theme}}},'https://giscus.app');
    });
  };
  const onLoad=(event:Event)=>{
    if((event.target as Element|null)?.matches?.('iframe.giscus-frame'))sync();
  };
  const observer=new MutationObserver(sync);
  observer.observe(doc.documentElement,{attributes:true,attributeFilter:['data-theme']});
  // iframe load does not bubble; capture it so newly loaded frames get the
  // latest theme even if an earlier postMessage arrived before they were ready.
  doc.addEventListener('load',onLoad,{capture:true});
  sync();
  return ()=>{observer.disconnect();doc.removeEventListener('load',onLoad,{capture:true});};
}
