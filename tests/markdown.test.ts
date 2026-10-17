import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderMarkdown,renderInlineMarkdown,renderMarkdownDocument} from '../src/lib/markdown';

test('Markdown tables retain semantic headers, links and identifiers inside a keyboard-accessible scroll region',()=>{
  const output=renderMarkdown('| Branch | Role |\n| --- | --- |\n| [`dev-VRI`](https://example.org/dev-VRI) | Current graphics framework. |');
  assert.match(output,/<div[^>]+class="table-scroll"[^>]+role="region"[^>]+aria-label="Scrollable table"[^>]+tabindex="0"><table>/);
  assert.match(output,/<thead>\s*<tr>\s*<th>Branch<\/th>/);
  assert.match(output,/<td><a href="https:\/\/example.org\/dev-VRI"><code>dev-VRI<\/code><\/a><\/td>/);
  assert.match(output,/<\/table>\s*<\/div>/);
});

test('multiple table regions end before following prose and do not wrap pipe characters in code blocks',()=>{
  const output=renderMarkdown('| A | B |\n| --- | --- |\n| One | Two |\n\nAfter the first table.\n\n| C | D |\n| --- | --- |\n| Three | Four |\n\n```text\n| Literal | pipe |\n```');
  assert.equal((output.match(/class="table-scroll"/g)||[]).length,2);
  assert.equal((output.match(/<table>/g)||[]).length,2);
  assert.match(output,/<\/table>\s*<\/div>\s*<p>After the first table\.<\/p>/);
  assert.match(output,/<\/table>\s*<\/div>\s*<pre/);
});

test('all six Markdown heading levels have accessible permalink controls and retain inline formatting',()=>{
  const output=renderMarkdown('# Main\n\n## **Bold** and `code` {#stable-section}\n\n### Third\n\n#### Fourth\n\n##### Fifth\n\n###### Sixth');
  for(let level=1;level<=6;level++)assert.match(output,new RegExp(`<h${level}[^>]*class="has-heading-anchor"`));
  assert.equal((output.match(/data-copy-heading/g)||[]).length,6);
  assert.match(output,/<h2 id="stable-section"[^>]*><strong>Bold<\/strong> and <code>code<\/code>/);
  assert.match(output,/href="#stable-section"[^>]*data-pagefind-ignore[^>]*aria-label="Copy link to Bold and code"/);
  assert.ok(!output.includes('{#stable-section}'));
});

test('heading IDs avoid collisions, reserve authored anchors and reset between documents',()=>{
  const output=renderMarkdown('## Example\n\n## Example\n\n## Authored {#example}\n\n## Other {#example-2}\n\n## 你好 世界\n\n## 你好 世界\n\n## !!!');
  const ids=[...output.matchAll(/<h2 id="([^"]+)"/g)].map(match=>match[1]);
  assert.deepEqual(ids,['example-3','example-4','example','example-2','你好-世界','你好-世界-2','section']);
  assert.match(output,/href="#%E4%BD%A0%E5%A5%BD-%E4%B8%96%E7%95%8C"/);
  assert.match(renderMarkdown('## Example'),/<h2 id="example"/);
});

test('heading permalink labels escape markup and do not break existing heading links',()=>{
  const output=renderMarkdown('## [A & B](https://example.org/) {#reference}');
  assert.match(output,/<a href="https:\/\/example.org\/">A &amp; B<\/a>/);
  assert.match(output,/aria-label="Copy link to A &amp; B"/);
  assert.match(output,/href="#reference"/);
});

test('Mermaid fences retain escaped source in a keyboard-accessible diagram region',()=>{
  const source='flowchart TB\n  A["Renderer <core>"] --> B["A long node label"]\n';
  const output=renderMarkdown(`\`\`\`mermaid\n${source}\`\`\``);
  assert.match(output,/<pre class="mermaid" role="region" aria-label="Scrollable diagram" tabindex="0" data-pagefind-ignore>/);
  assert.ok(output.includes('Renderer &lt;core&gt;'));
  assert.ok(output.includes('A long node label'));
  assert.equal((output.match(/<pre/g)||[]).length,1);
});

test('inline biography Markdown renders links without nesting paragraphs',()=>{
  const output=renderInlineMarkdown('Supervised by [Dr Example](https://example.org/mentor/) and **colleagues**.');
  assert.match(output,/<a href="https:\/\/example.org\/mentor\/">Dr Example<\/a>/);
  assert.match(output,/<strong>colleagues<\/strong>/);
  assert.doesNotMatch(output,/<\/?p(?: |>|\/)/);
});


test('TOC headings share rendered anchors and plain labels without code-block false positives',()=>{
  const document=renderMarkdownDocument('# Page\n\n## **Intro** & `API` {#start}\n\n### [Details](https://example.org/)\n\n## Details\n\n## 你好\n\n#### Too deep\n\n```md\n## Not a heading\n```');
  assert.deepEqual(document.headings,[{id:'start',label:'Intro & API',depth:2},{id:'detailshttpsexampleorg',label:'Details',depth:3},{id:'details',label:'Details',depth:2},{id:'你好',label:'你好',depth:2}]);
  for(const heading of document.headings)assert.ok(document.html.includes(`id="${heading.id}"`));
  assert.deepEqual(renderMarkdownDocument('Plain text.').headings,[]);
});
