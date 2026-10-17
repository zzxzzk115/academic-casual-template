import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parse, stringify } from 'yaml';
import matter from 'gray-matter';

const root = fileURLToPath(new URL('../', import.meta.url));
const cache = join(root, '.cache');
mkdirSync(cache, { recursive: true });
const runRoot = mkdtempSync(join(cache, 'examples-'));
const run = args => {
  const result = spawnSync(process.execPath, args, { cwd: root, env: { ...process.env, SITE_OFFLINE: '1' }, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`Example validation failed: ${args.join(' ')}`);
};
const outputs = [];
for (const [name, base, email] of [['root', '/', 'root-fixture@example.invalid'], ['subpath', '/portfolio/', 'subpath@example.org']]) {
  const content = join(runRoot, name, 'content'), out = join(runRoot, name, 'dist');
  cpSync(join(root, 'examples/einstein'), content, { recursive: true });
  const file = join(content, 'site.config.yaml'), config = parse(readFileSync(file, 'utf8'));
  config.site.base = base;
  config.identity.email = email;
  cpSync(join(content,'public/assets/einstein-1921.jpg'),join(content,'public/assets/project-cover.jpg'));
  const coverFile=join(content,'content/projects/special-relativity.md');
  const covered=matter(readFileSync(coverFile,'utf8'));
  writeFileSync(coverFile,matter.stringify(covered.content,{...covered.data,image:'/assets/project-cover.jpg',imageFit:name==='root'?'cover':'contain'}));
  for (const mode of ['academic', 'casual']) {
    config.modes[mode].sections.unshift('now');
    config.modes[mode].navigation.unshift('now');
    if (!config.modes[mode].sections.includes('publications')) config.modes[mode].sections.push('publications');
    if (!config.modes[mode].navigation.includes('publications')) config.modes[mode].navigation.push('publications');
  }
  const bibFile=join(content,'content/publications.bib');
  const bibliography=readFileSync(bibFile,'utf8');
  writeFileSync(bibFile,name==='root'?bibliography.replace(/(einstein1905brownian,[\s\S]*?)home = \{true\}/, '$1home = {false}'):bibliography.replace(/  home = \{true\},\n/g,''));
  if (name === 'root') {
    delete config.banner;
    config.identity.cv='/assets/pdf/CV.pdf';
    mkdirSync(join(content,'public/assets/pdf'),{recursive:true});
    writeFileSync(join(content,'public/assets/pdf/CV.pdf'),'%PDF-1.5\nFixture PDF');
    delete config.modes.academic.sidebar;
    delete config.modes.casual.sidebar;
    delete config.modes.casual.photo;
    delete config.modes.casual.photoCredit;
    config.identity.address = 'Fixture public address';
    config.identity.contactNote = 'Fixture contact note';
    config.modes.academic.sections = config.modes.academic.sections.filter(id=>id!=='contact');
    config.modes.academic.navigation = config.modes.academic.navigation.filter(id=>id!=='contact');
    config.socials.push({label:'Fixture secondary link',href:'https://example.org/contact',modes:['academic']});
  }
  if (name === 'subpath') {
    config.identity.name = 'Taylor Quinn';
    config.identity.handle = 'TQ Notebook';
    config.identity.initials = 'TQ';
    config.identity.cv = [{label:'CV · English',href:'/assets/pdf/CV.pdf',lang:'en'},{label:'CV · 中文',href:'/assets/pdf/CV-zh.pdf',lang:'zh-CN'},{label:'السيرة الذاتية',href:'/assets/pdf/CV-ar.pdf',lang:'ar'}];
    mkdirSync(join(content,'public/assets/pdf'),{recursive:true});
    for(const name of ['CV.pdf','CV-zh.pdf','CV-ar.pdf'])writeFileSync(join(content,'public/assets/pdf',name),'%PDF-1.5\nFixture PDF');
    config.site.favicon = '/assets/favicon.jpg';
    cpSync(join(content,'public/assets/einstein-1921.jpg'),join(content,'public/assets/favicon.jpg'));
    config.theme.academic = '#6b3db8';
    cpSync(join(content,'public/assets/einstein-1921.jpg'),join(content,'public/assets/casual-portrait.jpg'));
    config.modes.casual.photo = '/assets/casual-portrait.jpg';
    delete config.modes.casual.photoCredit;
    config.modes.casual.email = 'casual-fixture@example.invalid';
    config.modes.academic.sidebar = true;
    config.modes.casual.sidebar = true;
    writeFileSync(join(content,'public/assets/feature-banner.svg'),'<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="400" viewBox="0 0 1600 400"><rect width="1600" height="400" fill="#dde8ed"/><text x="80" y="220" font-size="56" fill="#17344a">Fixture feature image</text></svg>');
    config.banner={image:'/assets/feature-banner.svg',alt:'Fixture publication overview',width:1600,height:400,caption:'Fixture featured paper',href:'/publications/#einstein1905relativity',modes:['academic']};
    config.identity.address = 'Fixture research office';
    config.modes.casual.address = '';
    writeFileSync(join(content, 'content/now.yaml'), stringify({
      updated: '2026-10-16',
      workingOn: [{projectId:'special-relativity',description:'Academic fixture work',itemsTitle:'Current milestones',items:[{title:'Academic detail',description:'Academic nested description',href:'/projects/special-relativity/'}],modes:['academic']}],
      exploring: [{title:'Casual fixture topic',description:'A casual experiment',items:[{title:'Casual detail',href:'/projects/special-relativity/'},{title:'Concise detail'}],links:[{label:'Example resource',href:'/projects/special-relativity/'}],modes:['casual']}],
    }));
    for (const path of ['projects/light-quanta.md', 'posts/reading-einstein.md']) {
      const file = join(content, 'content', path);
      const parsed=matter(readFileSync(file,'utf8'));
      writeFileSync(file,matter.stringify(parsed.content,{...parsed.data,home:false}));
    }
    mkdirSync(join(content, 'content/news'), {recursive:true});
    for (const mode of ['academic', 'casual']) config.modes[mode].sections.push('news');
    for (const [id, home] of [['hidden',false],['visible-a',true],['visible-b',true],['visible-c',true]]) {
      writeFileSync(join(content,'content/news',`${id}.md`),`---\n${stringify({id:`news-${id}`,title:`Fixture news ${id}`,description:'An example update',legacyPath:`/news/${id}/`,home,date:id==='hidden'?'2026-10-16':'2026-10-15'})}---\nAn update.\n`);
    }
    config.modes.casual.sectionTitles.now = 'On the workbench';
    const profileFile = join(content, 'content/profile.yaml');
    const profile = parse(readFileSync(profileFile, 'utf8'));
    config.modes.casual.sections.push('about');
    profile.casualAbout = 'A concise personal introduction.';
    profile.academicBackground = 'Supervised by [Fixture mentor](https://example.org/mentor/).';
    writeFileSync(profileFile, stringify(profile));
  }
  writeFileSync(file, stringify(config));
  run(['scripts/site.mjs', 'build', '--content', content, '--out', out]);
  run(['scripts/verify.mjs', out, content]);
  const pages = readdirSync(out, { recursive: true }).filter(path => path.endsWith('.html')).map(path => readFileSync(join(out, path), 'utf8')).join('\n');
  if (!pages.includes(email)) throw new Error(`Missing configured identity in ${name}`);
  const academic = readFileSync(join(out, 'index.html'), 'utf8');
  const casual = readFileSync(join(out, 'casual/index.html'), 'utf8');
  const projectArchive=readFileSync(join(out,'projects/index.html'),'utf8');
  if(!projectArchive.includes(`style="object-fit:${name==='root'?'cover':'contain'}"`))throw new Error('Configured project image fill was lost');
  const publicationArchive=readFileSync(join(out,'publications/index.html'),'utf8');
  for(const id of ['einstein1905relativity','einstein1905brownian']) if(!publicationArchive.includes(`id="${id}"`)) throw new Error('A homepage-hidden paper disappeared from the full bibliography');
  if(!readFileSync(join(out,'publications.bib'),'utf8').includes('einstein1905brownian')) throw new Error('A homepage-hidden paper disappeared from the BibTeX download');
  for(const home of [academic,casual]) {
    if(name==='root') {
      if(!home.includes('id="publications"')||!home.includes('id="einstein1905relativity"')||home.includes('id="einstein1905brownian"')||!home.includes('/#publications')) throw new Error('Homepage publication metadata did not select eligible papers and navigation');
    } else if(home.includes('id="publications"')||home.includes('id="einstein1905relativity"')||home.includes('/#publications')) throw new Error('An empty publication selection produced a section or navigation link');
  }
  if (name === 'root') {
    if(!academic.includes('href="/assets/pdf/CV.pdf"')||!readFileSync(join(out,'cv/index.html'),'utf8').includes('Download CV'))throw new Error('Legacy string CV download was lost');
    if(!academic.includes('rel="icon" href="data:image/svg+xml,') || !casual.includes('rel="icon" href="data:image/svg+xml,')) throw new Error('Omitted favicon lost the initials fallback');
    if(academic.includes('class="feature-banner"') || casual.includes('class="feature-banner"')) throw new Error('Unconfigured banner reserved a homepage element');
    const intro=academic.split('</section>')[0];
    for(const text of ['Fixture public address','Fixture contact note','Fixture secondary link']) if(!intro.includes(text)) throw new Error('Omitting Contact lost introductory contact details');
    if(academic.includes('id="contact"') || [...academic.matchAll(/data-nav-mode="academic"[^>]*>([\s\S]*?)<\/(?:nav|div)>/g)].some(match=>match[1].includes('/#contact'))) throw new Error('Removed Contact section or navigation was rendered');
    if (!casual.includes('class="casual-preview"') || !casual.includes('/assets/project-cover.jpg')) throw new Error('Project preview fallback was lost without a mode portrait');
    if (academic.includes('id="now"') || academic.includes('/#now') || casual.includes('id="now"')) throw new Error('Empty now content produced a section or navigation link');
  } else {
    const cvPage=readFileSync(join(out,'cv/index.html'),'utf8');
    for(const html of [academic,cvPage])for(const [name,lang]of [['CV.pdf','en'],['CV-zh.pdf','zh-CN'],['CV-ar.pdf','ar']])if(!html.includes(`href="/portfolio/assets/pdf/${name}" hreflang="${lang}"`))throw new Error('Multilingual CV links lost their base or language');
    for(const html of [academic,cvPage])if(!html.includes('<span lang="ar" dir="auto">السيرة الذاتية</span>'))throw new Error('RTL CV labels lost their language or automatic direction');
    if(casual.includes('السيرة الذاتية')||casual.includes('CV · English')||casual.includes('CV · 中文'))throw new Error('Academic CV downloads leaked onto Casual');
    for(const html of [academic,casual,readFileSync(join(out,'projects/special-relativity/index.html'),'utf8')]) if(!html.includes('rel="icon" href="/portfolio/assets/favicon.jpg"')) throw new Error('Configured favicon lost its base or page/mode scope');
    if(!academic.includes('class="feature-banner"') || !academic.includes('src="/portfolio/assets/feature-banner.svg"') || !academic.includes('Fixture featured paper') || !academic.includes('href="/portfolio/publications/#einstein1905relativity"') || casual.includes('class="feature-banner"')) throw new Error('Feature banner lost its base or mode scope');
    if(readFileSync(join(out,'projects/special-relativity/index.html'),'utf8').includes('class="feature-banner"')) throw new Error('Homepage banner leaked into a detail page');
    for(const home of [academic,casual]) if(!home.includes('class="profile-sidebar"') || !home.includes('home-with-sidebar')) throw new Error('Configured profile sidebar was not rendered');
    if(!academic.includes('<a href="https://example.org/mentor/">Fixture mentor</a>')) throw new Error('Inline supervisor link was not rendered');
    if (!academic.includes('Fixture research office') || casual.includes('Fixture research office')) throw new Error('Mode-specific address hiding failed');
    if (!academic.includes('mailto:subpath@example.org') || academic.includes('mailto:casual-fixture@example.invalid')) throw new Error('Casual email override leaked into Academic');
    if (!casual.includes('mailto:casual-fixture@example.invalid') || casual.includes('mailto:subpath@example.org')) throw new Error('Casual email override was not applied');
    if (!academic.includes('src="/portfolio/assets/einstein-1921.jpg"') || academic.includes('src="/portfolio/assets/casual-portrait.jpg"')) throw new Error('Mode portrait leaked into Academic');
    if (!casual.includes('src="/portfolio/assets/casual-portrait.jpg"') || casual.includes('src="/portfolio/assets/einstein-1921.jpg"')) throw new Error('Casual portrait override or deployment base was lost');
    if (!casual.includes('hero-casual hero-with-portrait') || !casual.includes('class="hero-aside"') || casual.includes('class="casual-preview"')) throw new Error('Explicit Casual avatar did not take priority over a project cover');
    if (casual.includes('<figcaption>')) throw new Error('Default portrait credit was applied to a mode override');
    if (!academic.includes('Academic fixture work') || academic.includes('Casual fixture topic')) throw new Error('Academic now content was not scoped');
    if (!casual.includes('Casual fixture topic') || casual.includes('Academic fixture work') || !casual.includes('On the workbench')) throw new Error('Casual now content was not scoped');
    if (!casual.includes('/portfolio/projects/special-relativity/?mode=casual')) throw new Error('Now link lost its base or mode');
    if (!academic.includes('Current milestones') || !academic.includes('Academic nested description') || academic.includes('Casual detail')) throw new Error('Working-on details or heading were not scoped');
    if (!casual.includes('Concise detail') || casual.includes('Academic detail') || casual.includes('now-items-heading')) throw new Error('Exploring details lost their scope or gained an implicit heading');
    if (!/href="\/portfolio\/projects\/special-relativity\/\?mode=casual"[^>]*>Casual detail/.test(casual)) throw new Error('Nested detail link lost its base or mode');
    if (academic.includes('Up next') || casual.includes('Up next')) throw new Error('Empty now group was rendered');
    if (!academic.includes('datetime="2026-10-16"')) throw new Error('Editorial update date was lost');
    for (const home of [academic, casual]) if (home.includes('/portfolio/projects/light-quanta/') || home.includes('/portfolio/featured-posts/2026/reading-einstein/')) throw new Error('home:false content leaked onto a homepage');
    for (const home of [academic, casual]) {
      if (home.includes('Fixture news hidden') || !home.includes('Fixture news visible-c')) throw new Error('News home eligibility was not applied before the item limit');
    }
    if (!readFileSync(join(out, 'projects/index.html'), 'utf8').includes('/portfolio/projects/light-quanta/')) throw new Error('Hidden project disappeared from its catalog');
    if (!readFileSync(join(out, 'featured-posts/index.html'), 'utf8').includes('reading-einstein')) throw new Error('Hidden post disappeared from its archive');
    if (!readFileSync(join(out, 'feed.xml'), 'utf8').includes('reading-einstein')) throw new Error('Hidden post disappeared from RSS');
    if (!casual.includes('A concise personal introduction.') || academic.includes('A concise personal introduction.')) throw new Error('Casual introduction was not scoped');
    if (!readFileSync(join(out, 'projects/light-quanta/index.html'), 'utf8').includes('data-pagefind-body')) throw new Error('Hidden detail page is no longer searchable');
  }
  outputs.push(pages);
}
if (outputs[0].includes('subpath@example.org') || outputs[1].includes('root-fixture@example.invalid')) throw new Error('Content leaked between independent builds');
console.log(`Root/subpath and content isolation checks passed. Output: ${runRoot}`);
