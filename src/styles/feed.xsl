<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:atom="http://www.w3.org/2005/Atom"
  exclude-result-prefixes="atom">
  <xsl:output method="html" encoding="UTF-8" doctype-system="about:legacy-compat"/>
  <xsl:template match="/rss/channel">
    <html lang="{language}">
      <head>
        <title>RSS · <xsl:value-of select="title"/></title>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <style>
          :root { color-scheme: light dark; --paper: #f8f7f3; --ink: #252c2d; --muted: #5d686d; --line: #dadeda; --accent: __FEED_ACCENT__; }
          * { box-sizing: border-box; }
          body { margin: 0; background: var(--paper); color: var(--ink); font: 17px/1.7 system-ui, sans-serif; }
          main { width: min(850px, 100% - 48px); margin: 0 auto; }
          a { color: var(--accent); text-decoration-thickness: 1px; text-underline-offset: .2em; }
          a:hover { text-decoration: underline; }
          a:focus-visible, input:focus-visible { outline: 2px solid var(--accent); outline-offset: 5px; }
          .topbar { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 32px 0; border-bottom: 1px solid var(--line); font-size: .85rem; }
          .badge { display: inline-flex; align-items: center; gap: 10px; font-weight: 650; letter-spacing: .08em; }
          .badge svg { width: 20px; height: 20px; color: #d36b20; }
          .topbar a { text-decoration: none; }
          header { padding: 52px 0 36px; }
          h1 { margin: 0 0 20px; max-width: 760px; font-size: clamp(1.8rem, 5vw, 2.6rem); line-height: 1.25; letter-spacing: -.035em; text-wrap: balance; }
          .description { margin: 0; color: var(--muted); max-width: 720px; }
          .subscribe { padding: 24px 0 32px; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
          .subscribe h2 { font-size: 1rem; margin: 0 0 8px; }
          .subscribe p { margin: 0 0 16px; color: var(--muted); font-size: .9rem; }
          label { display: block; font-size: .8rem; font-weight: 600; margin: 0 0 6px; }
          input { display: block; width: 100%; padding: 12px 14px; border: 1px solid var(--line); border-radius: 0; background: transparent; color: var(--ink); font: .9rem/1.5 ui-monospace, monospace; }
          .list-title { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; padding-top: 28px; }
          .list-title h2 { margin: 0; font-size: 1.05rem; }
          .count { color: var(--muted); font-size: .8rem; }
          article { padding: 28px 0; border-bottom: 1px solid var(--line); }
          time { color: var(--muted); font-size: .8rem; }
          article h3 { margin: 8px 0; font-size: 1.35rem; line-height: 1.45; letter-spacing: -.02em; }
          article h3 a { color: var(--ink); text-decoration: none; }
          article p { margin: 0; color: var(--muted); overflow-wrap: anywhere; }
          .empty { color: var(--muted); padding: 24px 0; }
          footer { padding: 32px 0 48px; color: var(--muted); font-size: .8rem; }
          @media (prefers-color-scheme: dark) {
            :root { --paper: #1c2223; --ink: #e7ece7; --muted: #b2bebc; --line: #404c4b; --accent: #9cc7ed; }
          }
          @media (max-width: 520px) {
            main { width: calc(100% - 32px); }
            .topbar { padding: 22px 0; }
            header { padding: 36px 0 28px; }
            article h3 { font-size: 1.2rem; }
          }
        </style>
      </head>
      <body>
        <main>
          <nav class="topbar" aria-label="Feed navigation">
            <span class="badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                <circle cx="5" cy="19" r="1" fill="currentColor"/>
                <path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16"/>
              </svg>
              RSS FEED
            </span>
            <a href="{link}">← Back to website</a>
          </nav>
          <header>
            <h1><xsl:value-of select="title"/></h1>
            <p class="description"><xsl:value-of select="description"/></p>
          </header>
          <section class="subscribe" aria-labelledby="subscribe-title">
            <h2 id="subscribe-title">Follow new posts</h2>
            <p>This is an RSS feed. Add the address below to your feed reader to receive new posts.</p>
            <label for="feed-address">Feed address</label>
            <input id="feed-address" type="url" readonly="readonly" value="{atom:link[@rel='self']/@href}" spellcheck="false"/>
          </section>
          <section aria-labelledby="posts-title">
            <div class="list-title">
              <h2 id="posts-title">Latest posts</h2>
              <span class="count"><xsl:value-of select="count(item)"/> posts</span>
            </div>
            <xsl:for-each select="item">
              <article>
                <xsl:if test="pubDate"><time><xsl:value-of select="substring(pubDate, 6, 11)"/></time></xsl:if>
                <h3><a href="{link}"><xsl:value-of select="title"/></a></h3>
                <p><xsl:value-of select="description"/></p>
              </article>
            </xsl:for-each>
            <xsl:if test="not(item)"><p class="empty">No posts have been published yet.</p></xsl:if>
          </section>
          <footer>RSS 2.0 · Read here, or subscribe with your preferred feed reader.</footer>
        </main>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
