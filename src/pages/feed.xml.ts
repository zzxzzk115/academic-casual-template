import { config, posts, href } from '../lib/content';
import { renderRss } from '../lib/rss';

export function GET() {
  const absolute = (path: string) => new URL(href(path), config.site.url).href;
  return new Response(renderRss({
    title: config.site.title,
    description: config.site.description,
    language: config.site.language,
    homeUrl: absolute('/'),
    feedUrl: absolute('/feed.xml'),
    stylesheetUrl: href('/feed.xsl'),
    items: posts.map(post => ({
      title: post.title,
      url: absolute(post.legacyPath),
      description: post.description,
      date: post.date!,
    })),
  }), { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
