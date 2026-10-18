import stylesheet from '../styles/feed.xsl?raw';
import { config } from '../lib/content';

export function GET() {
  return new Response(stylesheet.replaceAll('__FEED_ACCENT__', config.theme.academic), {
    headers: { 'Content-Type': 'application/xslt+xml; charset=utf-8' },
  });
}
