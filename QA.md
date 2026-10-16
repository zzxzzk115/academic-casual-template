# Validation

Validated on Windows with Node 24.12.0 and pnpm 10.34.5, 16 October 2026.

- Astro / TypeScript: no errors, warnings, or hints.
- Content tests: six passing, including path traversal protection, invalid configuration, YAML timestamps, missing assets, featured references, and duplicate routes.
- Independently built the fictional example and the real content repository; the neutral output contains no personal identity strings.
- Built the neutral content at `/portfolio/` with a different accent. Verified generated links and anchors at both root and subpath bases.
- Real migration: seven projects, two posts, one news item, one BibTeX publication; 27 generated HTML pages, with the root feed, sitemap, bibliography, and Pagefind search.
- Verified more than 900 internal destinations/anchors/resources with no missing targets. Legacy custom Markdown heading IDs are retained.
- Browser checked at mobile (390 px), tablet, and desktop widths: navigation, Academic/Casual links, filtering, search results and anchors, theme toggle, detail-page context, and overflow.
- The browser's reduced-motion preference was active: the SVG remains visible and WebGL does not start. Static generated HTML was also checked for complete primary content without client execution.
- The personal site disables the decorative sampling field completely; publication figures remain attached to bibliography entries. Both modes render the configured copyright year range and self-hosted Font Awesome brand icons.
- Local Lighthouse mobile audit with Font Awesome Free: Academic performance/accessibility/SEO 92/100/100; Casual 91/100/100. Font loading uses swap, and interest links use descriptive text.

Lighthouse values describe the local production build under the audit's simulated mobile conditions, not field measurements or guarantees about a deployed CDN. Reports and preview screenshots are local, ignored artifacts under `reports/`.
