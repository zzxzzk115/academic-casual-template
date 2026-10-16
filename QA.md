# Validation

Validated locally on Windows with Node 24.12.0 and pnpm 10.34.5, 16 October 2026. GitHub Actions repeats the automated checks on Linux.

- `pnpm check`: Astro/TypeScript diagnostics.
- `pnpm test`: thirteen tests covering configuration, navigation references, paths, dates, social visibility, project links, asset/reference/route failures, safe content initialization and subpath link classification.
- `pnpm check:examples`: independent fictional sites at `/` and `/portfolio/`, generated links/anchors/resources, feeds, bibliography, search output and identity isolation.
- `pnpm site init --content <empty-directory>`: starter-only scaffolding with a full template commit pin; existing content is not overwritten.
- The existing separate personal content site is also built and verified before template pin upgrades. Its source audit and site-specific data stay in the content repository.

Browser checks cover Academic/Casual links, light/dark themes, desktop/mobile navigation, project filters, search and shared detail context. Main content is pre-rendered; optional WebGL leaves a static fallback under reduced motion or when unavailable. Self-hosted Font Awesome icons retain accessible link/control text.

Migration tooling preserves original slugs and comments mapping, handles JSONC resumes and date precision, and verifies legacy paths/assets through the content repository's own manifest. The framework CI does not require a personal repository.

Local Lighthouse reports and screenshots belong in ignored `reports/` directories. Performance depends on the site's selected images, content and optional integrations; a template check is not a field measurement of a deployed site.
