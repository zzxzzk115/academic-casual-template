import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderRss } from '../src/lib/rss';

const options = {
  title: 'Research & "notes"', description: '<Graphics>', language: 'en',
  homeUrl: 'https://example.com/portfolio/',
  feedUrl: 'https://example.com/portfolio/feed.xml',
  stylesheetUrl: '/portfolio/feed.xsl',
  items: [{
    title: "A researcher's notes", description: 'A < B & B > C',
    url: 'https://example.com/portfolio/posts/test/?a=1&b=2', date: '2025-04-11T01:35:00Z',
  }],
};

test('RSS escapes text and URLs while keeping permalink IDs and publication dates', () => {
  const feed = renderRss(options);
  assert.match(feed, /<title>Research &amp; &quot;notes&quot;<\/title>/);
  assert.match(feed, /<description>&lt;Graphics&gt;<\/description>/);
  assert.match(feed, /A researcher&apos;s notes/);
  assert.match(feed, /<description>A &lt; B &amp; B &gt; C<\/description>/);
  assert.match(feed, /<guid isPermaLink="true">https:\/\/example.com\/portfolio\/posts\/test\/\?a=1&amp;b=2<\/guid>/);
  assert.match(feed, /<pubDate>Fri, 11 Apr 2025 01:35:00 GMT<\/pubDate>/);
});

test('RSS advertises a same-origin stylesheet and canonical self URL under the site base', () => {
  const feed = renderRss(options);
  assert.match(feed, /<\?xml-stylesheet type="text\/xsl" href="\/portfolio\/feed.xsl"\?>/);
  assert.match(feed, /<atom:link href="https:\/\/example.com\/portfolio\/feed.xml" rel="self" type="application\/rss\+xml"\/>/);
  assert.match(feed, /<link>https:\/\/example.com\/portfolio\/<\/link>/);
  assert.match(renderRss({ ...options, items: [] }), /<channel>[\s\S]*<\/channel>/);
});
