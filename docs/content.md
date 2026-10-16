# Content and configuration

The starter at `examples/einstein` is a sourced historical profile, with a real public-domain photograph and editorial reading notes. Use `pnpm site init --content <empty-directory>` to create an independent copy. Replace its historical content with your own; the template reads that separate directory at build time.

Quick links: [Homepage curation](#homepage-curation) · [Current work and plans](#current-work-and-plans) · [Markdown records](#markdown-records) · [Publications](#publications)

## Site configuration

`site.config.yaml` uses schema version 1. The complete contract lives in `src/lib/schema.ts`.

| Field | Purpose |
| --- | --- |
| `site` | Title, description, origin URL, base path, language and optional copyright start year |
| `identity` | Name, initials and role; optional handle, institution, location, email, address, contact note, photo, photo credit and CV path |
| `socials` | Links with a label, URL, optional Font Awesome icon and optional mode visibility |
| `theme` | Academic and Casual accent colors in six-digit hex form |
| `banner` | Optional homepage feature image, caption, link and mode visibility |
| `hero` | Enable the optional illustration, set its label and intensity |
| `modes` | Ordered sections, optional desktop navigation, section headings, `showToolkit` and an optional responsive `sidebar` for each mode |
| `sectionLabels` | Optional navigation labels, keyed by section ID |
| `projectCategories` | Category IDs mapped to display names |
| `blog` | Optional external blog integration: original URL, JSON Feed URL and content-relative snapshot file |
| `comments` | Optional Giscus repository/category IDs, with pathname mapping |

`site.url` is the origin URL, such as `https://example.github.io`. Set `site.base` to `/` for a root site, or `/portfolio/` for a project site. It must start and end with `/`. Templates prefix local paths automatically. Do not include the base in content paths.

```yaml
sectionLabels:
  interests: Outside work
projectCategories:
  work: Research projects
  fun: Experiments
modes:
  academic:
    sections: [research, publications, projects, cv, writing, contact]
    navigation: [research, projects, contact]
  casual:
    sections: [projects, interests, writing, about, contact]
    sectionTitles:
      projects: Featured work
```

Homepage content is chosen in each record’s `home` metadata. Site configuration controls the section layout and navigation; it contains no project selection or hero IDs. `hero.enabled` controls the optional sampling illustration.

Available sections are `research`, `now`, `news`, `publications`, `projects`, `cv`, `writing`, `interests`, `about` and `contact`. Sections and navigation entries must be unique; desktop navigation can only point to enabled sections. Omitting `navigation` uses the standard desktop subset, including `now` when present. Mobile navigation lists all enabled sections. Empty `now`, `news`, `publications` and `projects` sections and their navigation links are hidden.

Social links default to both modes. For a Casual-only game platform:

```yaml
socials:
  - label: itch.io
    href: https://itch.io/
    icon: brands:itch-io
    modes: [casual]
```

Free icons accept `brands:<name>` or `solid:<name>`. The fonts are bundled locally; a hosted icon kit is not required.

When a separate Contact section is enabled, set `socials[].primary: true` to include an archive, portfolio or other link in the Academic introduction. If `contact` is omitted from a mode’s `sections`, the introduction automatically shows all of that mode’s social links, contact note and resolved address alongside its email, so a separate Contact block is optional. Remove `contact` from explicit navigation as well, if configured. GitHub and LinkedIn remain introductory links by default for existing content. Email, handle and blog are optional; omitted data creates no placeholder links. `modes.<mode>.email` overrides `identity.email` in that homepage's introductory and Contact links; without an override the identity address is used. Use `socials[].modes` to choose which modes show a social link. `modes.<mode>.address` overrides the homepage Contact address; set it to an empty string (`address: ""`) to hide the default office address in that mode. Omission inherits `identity.address`. The Casual title falls back to the person's name. The default portrait is `identity.photo`, with optional `identity.photoCredit: {label, href}`. Set `modes.academic.photo` or `modes.casual.photo` to override it for that mode, using an absolute site path or an HTTPS image URL (for example a GitHub avatar). An override applies to that mode’s introduction and About portrait. An explicit `modes.casual.photo` takes priority over any featured project in the opening visual and uses the same circular avatar layout, size and position as Academic at each breakpoint. If no override is set, the identity portrait and credit are used; an overridden photo uses only that mode’s optional `photoCredit`, so the default image’s credit is not attached to a different picture. Without an explicit mode photo, Casual uses a featured project cover when available, then the default portrait or illustration fallback. Academic and explicit Casual introduction avatars share the same right-hand anchor and circular crop (192 px on desktop, 160 px on tablets, 96 px on phones). About avatars also use circular crops; choose a photograph with the face near the centre and space around the head. The Casual introduction retains the full portrait. `site.footerText` can replace the default copyright line for a historical or curated example.

## Optional homepage feature image

Omit `banner` to show no image or empty space above the homepage. When a publication or project is ready, add a top-level block such as:

```yaml
banner:
  image: /assets/img/paper-overview.webp
  alt: Overview of the rendering method and its result
  width: 1600
  height: 400
  caption: Paper title · Venue, year
  href: /publications/#paper-key
  modes: [academic]
```

`image`, `alt`, `width` and `height` are required; use the actual image dimensions to reserve the correct aspect ratio. `caption` and `href` are optional. The image is shown in full without cropping; a wide source image around 3:1 or 4:1 works well. A configured link makes the image and caption one keyboard-accessible link. Local paths receive the deployment base and current mode context. `modes` defaults to both modes. The banner appears below the persistent navigation and above the homepage columns; it does not appear on detail or archive pages. This presentation setting is independent of per-record `home` collection metadata.

The bundled Einstein example enables an Academic-only paper teaser using a credited reproduction of Figure 1 from his 1911 paper. See `examples/einstein/ASSETS.md` for the image source and reuse terms.

## Responsive profile sidebar

Set `modes.<mode>.sidebar: true` to enable a left profile column on that homepage at viewport widths of **1280 CSS pixels and above**. The schema defaults to `false` for compatibility; the bundled Einstein starter explicitly enables it in both modes. Enable it separately for Academic and Casual:

```yaml
modes:
  academic:
    sidebar: true
    sections: [research, now, projects, cv, writing]
  casual:
    sidebar: true
    sections: [now, projects, interests, writing]
```

The sidebar collects that mode’s portrait, email, CV link (Academic), social links, blog link (Casual), contact note and resolved address. Mode visibility and photo/email/address overrides work exactly as in the compact introduction. The name (or Casual handle) sits below the portrait, and the main introduction is headed “About me”. The main column retains the introduction and content sections. The top navigation remains visible while scrolling, and the sidebar stays below it. On screens tall enough for a persistent profile, the sidebar stays in view as the page scrolls.

Below 1280px, the sidebar is hidden and the existing introduction, portrait and contact-link layout is retained, with the name or Casual handle as the main heading. Both modes keep matching portrait anchors and sizes. Omit a separate `contact` section when the introduction/sidebar already contains all your contact information. Sidebar behavior is limited to homepages; detail and archive pages retain their normal layout.

## Content files

| Path | Contents |
| --- | --- |
| `content/profile.yaml` | Academic/Casual summaries, background, optional `academicBackground`, `casualHeadline` and `casualAbout`, research topics, interests and toolkit rows |
| `content/now.yaml` | Optional current work, learning topics and tentative next steps |
| `content/about.md` | Complete biography for CV and the default Casual About section |
| `content/cv.yaml` | Education/work timelines, languages, skills and optional basics/contact fields |
| `content/projects/*.md` | Project records |
| `content/posts/*.md` | Homepage articles, separate from an external blog |
| `content/news/*.md` | Dated announcements |
| `content/publications.bib` | The sole publication data source |
| `content/repositories.yaml` | Repository names in `owner/repository` form |
| `public/` | Assets copied with their existing paths |

The Academic hero uses `identity.role` and factual summaries. The Casual role line uses `profile.casualHeadline`, or “Projects and interests” when omitted. The legacy `headline` field is not displayed. Optional toolkit rows use `label` and an `items` list; they appear in Academic, Casual and CV views. Set a mode’s `showToolkit: false` to omit toolkit rows from that homepage while retaining them on the full CV. `profile.academicBackground` optionally replaces the longer `background` in the Academic introduction; an empty string hides that paragraph. Omission preserves the original background. This paragraph supports inline Markdown links and emphasis, for example `Supervised by [Dr Example](https://example.org/mentor/)`.

Set `profile.casualAbout` to a short plain-text personal introduction to use it in the Casual About section instead of the complete biography and toolkit. The full biography and toolkit remain available on the CV page. Omitting it preserves the existing About layout. To keep the entire personal introduction at the top, consolidate it in `casualSummary` and omit `about` from that mode’s `sections` (and explicit `navigation`, if configured).

CV records use `title`, `institution`, quoted `start`/`end` dates and `description`, with optional `url` and `location`. Keep known date precision. Full CV timelines display months when available. `basics` accepts `label`, `summary`, optional `phone`, `url` and `address`.

## Current work and plans

Add `now` to a mode's ordered `sections` list, then create `content/now.yaml`:

```yaml
updated: '2026-10-16'
workingOn:
  - projectId: my-project
    description: Building a small renderer to try out a new idea.
    itemsTitle: Current milestones
    items:
      - title: First rendered frame
        description: Establish a minimal render loop.
    modes: [academic, casual]
exploring:
  - title: GPU profiling
    description: Learning how to identify expensive passes in a frame.
    itemsTitle: Study topics
    items:
      - title: Memory access patterns
      - title: Synchronization costs
    modes: [academic]
upNext:
  - title: A playable prototype
    description: Try turning the latest experiment into a browser demo.
    itemsTitle: Planned work items
    items:
      - title: A small playable scene
        description: Test the core interaction with a few placeholder assets.
      - title: Browser build
        description: Package the scene so it can be shared with a link.
    modes: [casual]
```

Each item needs a `description` and either a `title` or a valid `projectId`. Project references reuse the project's title and detail-page URL; an explicit `title` or `href` overrides either. Items default to both modes. A referenced project must support every mode listed on the item. Ordinary title links use `href`; an optional `links` list of `{label, href}` adds multiple resources, such as course assignments. Both use the same site-base and Casual context handling as other content links.

All three groups share the same entry structure. An optional `items` list adds one level of details beneath any entry in `workingOn`, `exploring` or `upNext`. Each detail requires a non-empty `title`; `description` and `href` are optional (when supplied, descriptions must be non-empty and links must be safe local paths or external URLs). Detail links inherit the current mode and deployment base. Use the optional `itemsTitle` to label the list, for example **Current milestones**, **Study topics** or **Planned work items**; omitting it renders the list without an extra heading. Entries without `items` retain the brief layout. Groups containing detail lists span the section width, with two-column lists on larger screens and one column on phones. Nested lists are limited to one level.

The optional `updated` date is an explicit editorial date (`YYYY-MM-DD`), never the build date. The groups display as **Working on**, **Exploring** and **Up next**. Empty groups are omitted. A missing file or a mode without any items produces no section or navigation link. Use mode-specific `sectionTitles.now`, for example **Current focus** and **On my workbench**, to change the section heading. These are brief public updates; tentative plans do not need deadlines.

Project card images preserve their source aspect ratio and show the complete image. Prefer a real application capture or an SVG diagram; avoid adding decorative window frames to the asset.

## Homepage curation

Use **one per-record field, `home`**, for projects, local posts, news and publications. All four content types use the same defaults and mode settings. `site.config.yaml` controls which sections are enabled and their layout; record selection, ordering and the Casual project hero belong in the records themselves.

### Include or exclude a record

In Markdown frontmatter:

```yaml
home: true
```

| Setting | Homepage behavior |
| --- | --- |
| Omitted, or `home: false` | Excluded from automatic homepage lists |
| `home: true` | Eligible in every mode supported by the record |
| `home: { academic: true }` | Eligible only in Academic |
| `home: { casual: true }` | Eligible only in Casual |
| `home: { academic: false, casual: { order: 2 } }` | Excluded from Academic; eligible in Casual with order 2 |

The default is **false everywhere**. In an object, an omitted mode is also excluded. Use real YAML booleans, not quoted strings such as `home: "true"`. A mode object (even `{}`) enables that mode with the placement defaults below.

For a record to appear, the mode must enable its section and, for Markdown, be included in the record’s `modes` list. `home: true` does not enable a disabled section. An explicit home mode unsupported by `modes` fails validation rather than silently widening visibility.

### Order and the Casual hero

Put all homepage placement choices under `home`:

```yaml
# In content/projects/my-project.md frontmatter:
modes: [academic, casual]
order: 20
home:
  academic: { order: 1 }
  casual: { order: 3, hero: true }
```

This project is first in Academic and third in Casual when other projects have orders 1 and 2. It also supplies the Casual opening preview. The top-level `order: 20` remains its catalog order.

| Placement field | Default | Rule |
| --- | --- | --- |
| `home.<mode>.order` | `100` | Numeric values sort in ascending order |
| `home.casual.hero` | `false` | Marks the preferred project for the Casual opening preview when no mode photo overrides it |

Equal homepage orders retain the underlying content order: catalog order for projects, newest dates first for news/writing, and newest years first for publications. The Academic and Casual orders are independent. Homepage filtering happens before limits: news shows up to three items and writing shows up to four combined local/blog items. An eligible record can therefore be beyond the visible limit.

Only projects can set `hero: true`, and only in Casual. At most one project may do so; conflicting heroes fail validation. Project hero selection is independent of card order. An explicit `modes.casual.photo` overrides the opening visual with an avatar; project cards and their order are unaffected. Without a mode photo or an explicit project hero, the first eligible project is used. A missing project cover uses the existing portrait/illustration fallback. The site-level `hero.enabled` setting controls the optional illustration; Academic retains its profile introduction and portrait.

### Publications on homepages

Write the same field on each record in `content/publications.bib`:

```bibtex
@article{my-paper,
  home = {true},
  title = {My paper},
  author = {Author, Example},
  year = {2026}
}
```

Use `home = {false}` or omit the field to keep a paper out of homepage lists. BibTeX metadata belongs on each paper, not in a YAML header for the whole bibliography.

The same mode-specific object is supported as JSON inside the BibTeX value:

```bibtex
home = {{"academic":{"order":1},"casual":false}},
```

This paper appears only in Academic, with order 1. `hero` remains restricted to project records. Copied citations omit `home` and other presentation fields; the full bibliography download retains the source records.

### Sections, navigation and retained content

Keep a section such as `publications` in `modes.<mode>.sections` when it should become visible automatically as eligible content is added. Its homepage block and desktop/mobile navigation links appear only when the eligible count is greater than zero. The same empty-section rule applies to projects and news; `now` hides when it has no items for that mode.

`home` only changes automatic homepage collection. Detail pages, archive/catalog pages and search keep their records. Local posts remain in RSS, and `/publications/` plus `/publications.bib` retain every paper. A zero-paper homepage therefore does not delete the bibliography.

Explicit editorial sections such as `content/now.yaml` keep their own content: a manually authored reference can still link to a project with `home: false`. Imported blog articles are controlled by the independent JSON Feed, not local Markdown `home` metadata.

### Upgrade earlier content

| Earlier setting | Replacement |
| --- | --- |
| `modes.<mode>.featuredProjects: [a, b]` | Set `home.<mode>.order: 1` on project a and `2` on b; omit that mode on projects not selected |
| `modes.casual.heroProject: a` | Set `home.casual.hero: true` on project a |
| Project frontmatter `featured: true` | Set `home: true`, or explicit mode placements |
| BibTeX `selected = {true/false}` | Use `home = {true/false}` |
| Markdown relying on the former default-on behavior | Add `home: true` to entries intended for the homepage |

Remove the old settings after moving their values. Legacy selectors are rejected rather than treated as competing aliases. The bundled example and personal content site have already been migrated. For imported Jekyll/al-folio content, review homepage eligibility before building; see the [migration guide](migration.md).

## Markdown records

```yaml
---
id: my-project
title: My project
description: A factual summary of the work.
legacyPath: /projects/my-project/
category: work
tags: [Research, Python]
modes: [academic, casual]
order: 1
home: true
status: In development
overview:
  purpose: The problem this project addresses.
  contribution: What I implemented or contributed.
  outcome: What works today, with any relevant limits.
links:
  - label: Source
    href: https://github.com
    icon: brands:github
---
```

Required fields are `id`, `title`, `description` and `legacyPath`. The path name retains migration terminology but is also the canonical route for new content. IDs are stable and unique across projects, posts and news. Public paths must end in `/` and remain unique. Optional fields also include `image`, `imageAlt`, `categories`, `date`, `comments` and `home`. Posts and news should include a quoted ISO timestamp.

Use the shared [`home` rules](#homepage-curation) for homepage visibility, mode-specific order and the Casual hero.

Optional `overview: {purpose, contribution, outcome}` gives a project detail page a compact opening summary, labeled **Purpose**, **My contribution** and **Outcome**. Supply all three as plain text; use the Markdown body for evidence, images and technical detail. This replaces the repeated description under the page title; the description remains in cards, search and page metadata. Projects without an overview keep their existing layout.

Homepage writing defaults to **Featured writing**; override `sectionTitles.writing` or `sectionLabels.writing` to suit your editorial selection. Use `sectionTitles.news: Milestones` for infrequent announcements without changing existing URLs or section IDs.

Projects without an image render as text cards at their natural height. The all-projects page remains a shared catalog. Category fragments such as `/projects/#work` initialize the filter.

Markdown supports code highlighting, tables, Mermaid fences, raw HTML and custom anchors (`## Method {#method}`). Raw HTML is for trusted content authors. Major content remains readable without JavaScript; diagrams retain their source, and interactive filtering/search/copying progressively enhance the page.

All Markdown headings (`#` through `######`) have a `#` permalink control in the left margin, revealed on hover or keyboard focus and always visible on touch devices. The heading is underlined on hover or focus. Click its text or the `#` control to copy the current page URL, including its deployment base, query parameters and heading fragment; existing links inside a heading retain their own destinations. Selecting heading text does not trigger copying. Existing authored `{#id}` anchors and English slugs are retained; repeated generated slugs receive numeric suffixes. Headings with no English slug use a Unicode slug or `section` fallback. Homepage section headings and detail-page titles also provide copy-link controls. Without JavaScript, controls act as ordinary fragment links; if clipboard access is unavailable, clicking navigates to the fragment so the address-bar URL can be copied.

## Publications

Standard BibTeX fields include title, author, year, journal/booktitle, volume, number, pages, DOI and URL. Optional presentation fields include:

- `pdf`: filename under `/assets/pdf/`, absolute local path, or external URL.
- `preview`: filename under `/assets/img/publication_preview/`.
- `abstract`, `abbr`, `journal_url`, `date`, `cnki` and `gbt`: abstract, venue details, release date and original citation links/text.

Use the same `home` metadata as Markdown records to curate homepage papers; see [Publications on homepages](#publications-on-homepages) for boolean and mode-specific BibTeX examples. The complete bibliography remains available independently of homepage selection.

Each citation key becomes an anchor on `/publications/`. The site provides a BibTeX copy button and `/publications.bib` download. Set `hero.enabled: false` to omit the sampling illustration; publication previews remain independent.

## External blog

The homepage reads JSON Feed items with `id`, `url`, `title` and optional `summary`/`date_published`. It links to original articles without copying their bodies. A failed fetch uses `blog.snapshot`; if that snapshot is configured it must be a valid local file. `SITE_OFFLINE=1` forces it for repeatable builds. The historical example omits blog integration; sites can add it independently.

## Validation

The build checks configuration, references, duplicate IDs/routes, publication fields and primary assets. `scripts/verify.mjs <output> <content>` checks generated internal destinations, anchors, feeds and search assets. External destinations are listed, not network-validated. A migration manifest can add counts, legacy paths and visible-text checks.

Mermaid diagrams wait for fonts before rendering and use SVG text with wrapped node labels. Diagrams retain their natural size inside a keyboard-accessible horizontal scroll region, so narrow screens can inspect the complete diagram without shrinking or clipping text.
