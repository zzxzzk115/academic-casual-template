# Validation

Validated on Windows with Node 24.12.0 and pnpm 10.34.5, 16 October 2026.

- Astro / TypeScript: no errors, warnings, or hints.
- Content tests: eight passing, including path traversal protection, invalid configuration, YAML timestamps, missing assets, featured references, duplicate routes, social visibility, and project action URL validation.
- Independently built the fictional example and the real content repository; the neutral output contains no personal identity strings.
- Built the neutral content at `/portfolio/` with a different accent. Verified generated links and anchors at both root and subpath bases.
- Real migration: seven original projects plus 16 additional projects, two posts, one news item, one BibTeX publication; 43 generated HTML pages, with the root feed, sitemap, bibliography, and Pagefind search.
- Verified more than 1,480 internal destinations/anchors/resources with no missing targets. Legacy category and custom Markdown heading IDs are retained.
- Audited the original ten content records, biography, CV fields and date precision, original bibliography tags, six repository links, and all 148 asset blobs against the pre-migration commit. No unexplained losses; current-source rewrites and intended corrections are recorded in the content repository's migration report.
- Restored platform/toolchain preferences, full biography, CV contact/institution details, original citation metadata and contact note. Social links can be scoped by mode; the personal Casual page includes itch.io and Steam.
- Browser checked at mobile (390 px), tablet, and desktop widths: navigation, Academic/Casual links, filtering, search results and anchors, theme toggle, detail-page context, and overflow.
- The browser's reduced-motion preference was active: the SVG remains visible and WebGL does not start. Static generated HTML was also checked for complete primary content without client execution.
- The personal site disables the decorative sampling field completely; publication figures remain attached to bibliography entries. Both modes render the configured copyright year range and self-hosted Font Awesome brand icons.
- Enlarged typography checked on desktop, 390 px mobile, and 768 px tablet layouts: article text is 18/17 px, card descriptions 16 px, and no page overflow. News details show the original linked sentence once, while listing/SEO summaries remain available.
- Local Lighthouse mobile audit after content expansion: Academic performance/accessibility/SEO 100/100/100; Casual 91/100/100. Font loading uses swap, and interest links use descriptive text.

Lighthouse values describe the local production build under the audit's simulated mobile conditions, not field measurements or guarantees about a deployed CDN. Reports and preview screenshots are local, ignored artifacts under `reports/`.
