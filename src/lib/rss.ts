type RssItem = { title: string; url: string; description: string; date: string };
type RssOptions = {
  title: string;
  description: string;
  language: string;
  homeUrl: string;
  feedUrl: string;
  stylesheetUrl: string;
  items: RssItem[];
};

const xml = (text: string) => text.replace(/[<>&"']/g, char => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
}[char]!));

export function renderRss(options: RssOptions): string {
  const { title, description, language, homeUrl, feedUrl, stylesheetUrl, items } = options;
  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="${xml(stylesheetUrl)}"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(title)}</title>
    <link>${xml(homeUrl)}</link>
    <description>${xml(description)}</description>
    <language>${xml(language)}</language>
    <atom:link href="${xml(feedUrl)}" rel="self" type="application/rss+xml"/>
${items.map(item => `    <item>
      <title>${xml(item.title)}</title>
      <link>${xml(item.url)}</link>
      <guid isPermaLink="true">${xml(item.url)}</guid>
      <description>${xml(item.description)}</description>
      <pubDate>${new Date(item.date).toUTCString()}</pubDate>
    </item>`).join('\n')}
  </channel>
</rss>
`;
}
