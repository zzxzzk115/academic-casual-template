import {bibliography} from '../lib/content';
export function GET(){return new Response(bibliography,{headers:{'Content-Type':'application/x-bibtex; charset=utf-8'}});}
