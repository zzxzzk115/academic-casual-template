import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderMarkdown} from '../src/lib/markdown';

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
