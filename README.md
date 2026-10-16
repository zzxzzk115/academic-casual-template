# Academic / Casual

A content-driven Astro + Vue template for a research homepage with a second, more playful presentation of the same work. Two long homepages, stable detail URLs, a lightweight foveated sampling field, and static HTML throughout.

The bundled **Alex Morgan** site is explicitly fictional. Personal information belongs in a separate content repository.

## Develop a site

Use Node 24 (or Node >=22.22) and pnpm 10.34.5. Clone this template and a content repository into sibling directories, then run from the template:

```sh
pnpm install --frozen-lockfile
pnpm site dev --content ../my-homepage
pnpm site build --content ../my-homepage --out ../my-homepage/dist
pnpm site preview --content ../my-homepage --out ../my-homepage/dist
node scripts/verify.mjs ../my-homepage/dist ../my-homepage
```

Without `--content`, commands use `examples/minimal`. `--out` is resolved against the working directory. `--port 4321` selects a development/preview port. Build output includes the Pagefind full-text index; search is available after a production build.

## Content contract (schema version 1)

- `site.config.yaml`: identity, absolute site URL, leading/trailing-slash base path, language, social links, accents, mode section order, featured project IDs, hero settings, blog source, and optional Giscus configuration. See the complete example.
- `content/profile.yaml`: headlines, summaries, research topics, and interests. `content/about.md` optionally preserves a longer biography.
- `content/cv.yaml`: education/work timelines, languages, and skills. Dates are strings at their known precision (`2024`, `2024-09`, or `Present`). Quote dates in YAML.
- `content/projects/*.md`, `content/posts/*.md`, `content/news/*.md`: Markdown with YAML frontmatter. Required: `id`, `title`, `description`, `legacyPath`. Optional: `image`, `category`, `categories`, `tags`, `modes`, `order`, `date`, `comments`, `featured`. Project dates are optional; give posts/news a timestamp. Explicit paths preserve old slugs.
- `content/publications.bib`: the sole publication source. Standard fields plus optional `pdf` and `preview` are rendered; local PDFs use `/assets/pdf/`, previews `/assets/img/publication_preview/`. BibTeX is downloadable and copyable.
- `content/repositories.yaml`: a list of `owner/repository` strings.
- `public/`: copied without changing resource URLs. Local image paths must begin with `/` and are checked at build time.

Set `site.copyrightStartYear` to show a footer year range ending in the build year. When omitted, the footer shows only the build year.

Frontmatter example:

```yaml
id: my-project
title: My project
description: A short, factual account of what it does.
legacyPath: /projects/my-project/
image: /assets/my-project.webp
category: work
tags: [C++, Graphics]
modes: [academic, casual]
order: 1
```

Markdown supports highlighted code, tables, raw HTML embeds, Mermaid fences, and explicit heading anchors such as `## Architecture {#architecture}`. Existing internal links are prefixed for `site.base`. Templates render repository-authored HTML; content repositories are trusted build inputs, not public upload endpoints.

## Presentation and accessibility

`/` is Academic; `/casual/` is Casual. Detail URLs remain shared, with `?mode=casual` retaining presentation context. Dark/light preferences are independent and stored locally. English UI copy is centralized in the components and section labels; no Chinese routes are published until translated content and interface copy exist.

Set `hero.enabled: false` to remove the optional sampling illustration entirely, including its static fallback. Use the bibliography's `preview` field for figures from actual publications instead.

Interface icons use Font Awesome Free's Brands and Classic Solid fonts, bundled locally through the pinned dependency. Social links can specify `icon: brands:github`, `icon: brands:linkedin`, or another free icon using `brands:` / `solid:`. `Icon.astro` keeps decorative glyphs hidden from assistive technology; controls retain text or accessible labels. Font Awesome retains its own font and code licenses.

When enabled, the Vue sampling field hydrates when visible. It renders only on resize/pointer interaction, pauses offscreen/in hidden tabs, caps pixel density, and leaves a static SVG visible when reduced motion is requested or WebGL is unavailable. All content, navigation, project details, bibliography, and CV remain readable without JavaScript. Search, filtering, and copying progressively enhance them.

## Blog integration

Set `blog.feedUrl` to a JSON Feed 1.1 URL and `blog.snapshot` to a content-relative saved JSON file. Only `items[].id`, `url`, `title`, optional `summary`, and `date_published` are consumed. Builds fetch the feed once per homepage, with a five-second timeout; failures use the saved snapshot. `SITE_OFFLINE=1` forces the snapshot for repeatable checks. Blog content stays on its original host; snapshots and the homepage refresh when the homepage is rebuilt.

## Pin and deploy

Store the template repository and exact commit SHA in the content repository's `template.lock.json`. CI checks out that revision beside the content repository and runs the same build command; no package publication is needed. Upgrades are explicit commit changes reviewed alongside a preview build. Deploy the output with `.nojekyll` to GitHub Pages. Change `site.url`/`site.base` to publish under a project subpath.

## Verify

```sh
pnpm check
pnpm test
pnpm site build
pnpm verify
```

Validation catches invalid configuration, missing featured IDs, duplicate content IDs/routes, malformed publication entries, and missing primary assets. The output verifier checks generated destinations, anchors, migration counts, feed, sitemap, bibliography, and search assets. Test both modes, keyboard search, mobile navigation, filtering, dark mode, and WebGL/reduced-motion fallbacks in a browser.

For one-time Jekyll/al-folio migration, `node scripts/import-jekyll.mjs <source> <destination> [vuepress-blog-source]` imports content without modifying the source. It preserves filenames as public slugs, parses JSONC resumes, normalizes invalid legacy days to their known month, and copies assets. Supply personal configuration separately and review the migration manifest. Preserve an old Git tag before replacing the legacy sources.

MIT licensed. Third-party dependencies retain their respective licenses.
