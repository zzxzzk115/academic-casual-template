import {routes,config,href} from '../lib/content';
export function GET(){return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/','/casual/',...routes.map(r=>r.path)].map(p=>`<url><loc>${new URL(href(p),config.site.url).href}</loc></url>`).join('')}</urlset>`,{headers:{'Content-Type':'application/xml'}});}
