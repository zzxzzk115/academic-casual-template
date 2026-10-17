import {test} from 'node:test';
import assert from 'node:assert/strict';
import {watchGiscusTheme} from '../src/scripts/giscus-theme';

test('Giscus follows the latest theme before, during and after asynchronous iframe loading',t=>{
  let notify:()=>void=()=>{};
  let observed:unknown[]=[];
  let disconnected=false;
  const previous=globalThis.MutationObserver;
  globalThis.MutationObserver=class{
    constructor(callback:()=>void){notify=callback;}
    observe(...args:unknown[]){observed=args;}
    disconnect(){disconnected=true;}
  } as unknown as typeof MutationObserver;
  t.after(()=>{globalThis.MutationObserver=previous;});
  const doc=new EventTarget() as EventTarget & {documentElement:{dataset:{theme:string}};querySelectorAll:(selector:string)=>unknown[]};
  doc.documentElement={dataset:{theme:'dark'}};
  const script={dataset:{theme:'light'}};
  const messages:unknown[][]=[];
  const frame={matches:(selector:string)=>selector==='iframe.giscus-frame',contentWindow:{postMessage:(...args:unknown[])=>messages.push(args)}};
  const frames:typeof frame[]=[];
  doc.querySelectorAll=selector=>selector.startsWith('iframe')?frames:[script];
  const stop=watchGiscusTheme(doc as unknown as Document);
  assert.equal(script.dataset.theme,'dark');
  assert.deepEqual(observed,[doc.documentElement,{attributes:true,attributeFilter:['data-theme']}]);

  // A click while client.js is downloading must update its configuration.
  doc.documentElement.dataset.theme='light';
  notify();
  assert.equal(script.dataset.theme,'light');
  frames.push(frame);

  // A subsequent switch may reach an iframe before its message listener is ready.
  doc.documentElement.dataset.theme='dark';
  notify();
  messages.length=0; // Simulate that in-flight message being lost.
  const loaded=new Event('load');
  Object.defineProperty(loaded,'target',{value:frame});
  doc.dispatchEvent(loaded);
  assert.deepEqual(messages,[[{giscus:{setConfig:{theme:'dark'}}},'https://giscus.app']]);

  // Later site theme changes update the existing widget without replacing it.
  doc.documentElement.dataset.theme='light';
  notify();
  assert.deepEqual(messages.at(-1),[{giscus:{setConfig:{theme:'light'}}},'https://giscus.app']);
  const count=messages.length;
  doc.dispatchEvent(new Event('load')); // Unrelated resources must not trigger a sync.
  assert.equal(messages.length,count);
  stop();
  assert.ok(disconnected);
  doc.dispatchEvent(loaded);
  assert.equal(messages.length,count);
});
