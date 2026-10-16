# Content and configuration

The starter at `examples/einstein` is a sourced historical profile, with a real public-domain photograph and editorial reading notes. Use `pnpm site init --content <empty-directory>` to create an independent copy. Replace its historical content with your own; the template reads that separate directory at build time.

## Site configuration

`site.config.yaml` uses schema version 1. The complete contract lives in `src/lib/schema.ts`.

| Field | Purpose |
| --- | --- |
| `site` | Title, description, origin URL, base path, language and optional copyright start year |
| `identity` | Name, initials and role; optional handle, institution, location, email, address, contact note, photo, photo credit and CV path |
| `socials` | Links with a label, URL, optional Font Awesome icon and optional mode visibility |
| `theme` | Academic and Casual accent colors in six-digit hex form |
| `hero` | Enable the optional illustration, set its label and intensity |
| `modes` | Ordered sections, optional desktop navigation, section headings and featured project IDs for each mode |
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
    featuredProjects: [my-project]
  casual:
    sections: [projects, interests, writing, about, contact]
    sectionTitles:
      projects: Selected work
    featuredProjects: [my-project]
```

Available sections are `research`, `now`, `news`, `publications`, `projects`, `cv`, `writing`, `interests`, `about` and `contact`. Sections and navigation entries must be unique; desktop navigation can only point to enabled sections. Omitting `navigation` uses the standard desktop subset, including `now` when present. Mobile navigation lists all enabled sections. Empty `now`, `news` and `projects` sections and their navigation links are hidden.

Social links default to both modes. For a Casual-only game platform:

```yaml
socials:
  - label: itch.io
    href: https://itch.io/
    icon: brands:itch-io
    modes: [casual]
```

Free icons accept `brands:<name>` or `solid:<name>`. The fonts are bundled locally; a hosted icon kit is not required.

Set `socials[].primary: true` to include an archive, portfolio or other link in the Academic introduction. GitHub and LinkedIn remain introductory links by default for existing content. Email, handle and blog are optional; omitted data creates no placeholder links. The Casual title falls back to the person's name. A portrait can include `photoCredit: {label, href}`, and is used in Casual when no featured project image is configured. `site.footerText` can replace the default copyright line for a historical or curated example.

## Content files

| Path | Contents |
| --- | --- |
| `content/profile.yaml` | Academic/Casual summaries, background, optional `casualHeadline` and `casualAbout`, research topics, interests and toolkit rows |
| `content/now.yaml` | Optional current work, learning topics and tentative next steps |
| `content/about.md` | Complete biography for CV and the default Casual About section |
| `content/cv.yaml` | Education/work timelines, languages, skills and optional basics/contact fields |
| `content/projects/*.md` | Project records |
| `content/posts/*.md` | Homepage articles, separate from an external blog |
| `content/news/*.md` | Dated announcements |
| `content/publications.bib` | The sole publication data source |
| `content/repositories.yaml` | Repository names in `owner/repository` form |
| `public/` | Assets copied with their existing paths |

The Academic hero uses `identity.role` and factual summaries. The Casual role line uses `profile.casualHeadline`, or “Projects and interests” when omitted. The legacy `headline` field is not displayed. Optional toolkit rows use `label` and an `items` list; they appear in Academic, Casual and CV views.

Set `profile.casualAbout` to a short plain-text personal introduction to use it in the Casual About section instead of the complete biography and toolkit. The full biography and toolkit remain available on the CV page. Omitting it preserves the existing About layout.

CV records use `title`, `institution`, quoted `start`/`end` dates and `description`, with optional `url` and `location`. Keep known date precision. Full CV timelines display months when available. `basics` accepts `label`, `summary`, optional `phone`, `url` and `address`.

## Current work and plans

Add `now` to a mode's ordered `sections` list, then create `content/now.yaml`:

```yaml
updated: '2026-10-16'
workingOn:
  - projectId: my-project
    description: Building a small renderer to try out a new idea.
    modes: [academic, casual]
exploring:
  - title: GPU profiling
    description: Learning how to identify expensive passes in a frame.
    modes: [academic]
upNext:
  - title: A playable prototype
    description: Try turning the latest experiment into a browser demo.
    modes: [casual]
```

Each item needs a `description` and either a `title` or a valid `projectId`. Project references reuse the project's title and detail-page URL; an explicit `title` or `href` overrides either. Items default to both modes. A referenced project must support every mode listed on the item. Ordinary title links use `href`; an optional `links` list of `{label, href}` adds multiple resources, such as course assignments. Both use the same site-base and Casual context handling as other content links.

The optional `updated` date is an explicit editorial date (`YYYY-MM-DD`), never the build date. The groups display as **Working on**, **Exploring** and **Up next**. Empty groups are omitted. A missing file or a mode without any items produces no section or navigation link. Use mode-specific `sectionTitles.now`, for example **Current focus** and **On my workbench**, to change the section heading. These are brief public updates; tentative plans do not need deadlines.

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
links:
  - label: Source
    href: https://github.com
    icon: brands:github
---
```

Required fields are `id`, `title`, `description` and `legacyPath`. The path name retains migration terminology but is also the canonical route for new content. IDs are stable and unique across projects, posts and news. Public paths must end in `/` and remain unique. Optional fields also include `image`, `imageAlt`, `categories`, `date`, `comments`, `featured` and `home`. Posts and news should include a quoted ISO timestamp.

`home` is a YAML boolean: `home: false` excludes a record from both homepages, while `home: true` (the default when omitted) makes it eligible in its configured `modes`. Filtering happens before homepage item limits. Projects still follow the mode's `featuredProjects` list, or the existing `featured`/all-projects fallback; `home: false` overrides either selection. Eligibility does not force an item into a limited or curated selection. Detail pages, archives, RSS and search remain available. This field applies to local Markdown records; articles imported from an independent blog remain controlled by its JSON Feed.

Projects without an image render as text cards. Featured project IDs must exist and support the selected mode. The all-projects page remains a shared catalog. Category fragments such as `/projects/#work` initialize the filter.

Markdown supports code highlighting, tables, Mermaid fences, raw HTML and custom anchors (`## Method {#method}`). Raw HTML is for trusted content authors. Major content remains readable without JavaScript; diagrams retain their source, and interactive filtering/search/copying progressively enhance the page.

## Publications

Standard BibTeX fields include title, author, year, journal/booktitle, volume, number, pages, DOI and URL. Optional presentation fields include:

- `pdf`: filename under `/assets/pdf/`, absolute local path, or external URL.
- `preview`: filename under `/assets/img/publication_preview/`.
- `abstract`, `abbr`, `journal_url`, `date`, `cnki` and `gbt`: abstract, venue details, release date and original citation links/text.

Each citation key becomes an anchor on `/publications/`. The site provides a BibTeX copy button and `/publications.bib` download. Set `hero.enabled: false` to omit the sampling illustration; publication previews remain independent.

## External blog

The homepage reads JSON Feed items with `id`, `url`, `title` and optional `summary`/`date_published`. It links to original articles without copying their bodies. A failed fetch uses `blog.snapshot`; if that snapshot is configured it must be a valid local file. `SITE_OFFLINE=1` forces it for repeatable builds. The historical example omits blog integration; sites can add it independently.

## Validation

The build checks configuration, references, duplicate IDs/routes, publication fields and primary assets. `scripts/verify.mjs <output> <content>` checks generated internal destinations, anchors, feeds and search assets. External destinations are listed, not network-validated. A migration manifest can add counts, legacy paths and visible-text checks.
