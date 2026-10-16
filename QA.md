# Validation

Validated locally on Windows with Node 24.12.0 and pnpm 10.34.5, 16 October 2026. GitHub Actions repeats the automated checks on Linux.

- `pnpm check`: Astro/TypeScript diagnostics.
- `pnpm test`: 29 tests covering configuration, navigation references, paths, dates, social visibility, project links, independent hero selection and homepage eligibility, asset/reference/route failures, safe content initialization, Markdown table semantics/scroll regions and subpath link classification.
- `pnpm check:examples`: independent historical sites at `/` and `/portfolio/`, generated links/anchors/resources, feeds, bibliography, search output and identity isolation.
- `pnpm site init --content <empty-directory>`: starter-only scaffolding with a full template commit pin; existing content is not overwritten.
- `pnpm demo:build --url <origin> --base <path>`: isolates the historical Einstein example, sets project-site metadata and checks the generated output before Pages upload.
- The existing separate personal content site is also built and verified before template pin upgrades. Its source audit and site-specific data stay in the content repository.

Browser checks cover Academic/Casual links, light/dark themes, desktop/mobile navigation, project filters, search and shared detail context. Main content is pre-rendered; optional WebGL leaves a static fallback under reduced motion or when unavailable. Self-hosted Font Awesome icons retain accessible link/control text.

The latest [responsive navigation check record](docs/responsive-checks.md) lists the 320–1280px viewport matrix, keyboard and pointer checks, tablet orientation changes and the limits of the test environment. These browser checks are separate from physical-device/Safari testing.

The public demo was checked under `/academic-casual-template/`: both homepages, search results and project-detail mode context, desktop themes, and 390 px mobile filtering without horizontal overflow. The historical photograph and its credit load correctly in both modes; obsolete developer-example screenshots have been removed.

Migration tooling preserves original slugs and comments mapping, handles JSONC resumes and date precision, and verifies legacy paths/assets through the content repository's own manifest. The framework CI does not require a personal repository.

Local Lighthouse reports and screenshots belong in ignored `reports/` directories. Performance depends on the site's selected images, content and optional integrations; a template check is not a field measurement of a deployed site.

The latest homepage refinements were checked on Linux with Node 24.19.0: Astro diagnostics reported no errors or warnings, 29 tests passed, both example deployments built, and the personal content build passed 1,746 internal destination/resource checks. Desktop browser inspection confirmed natural-height text cards and the Casual two-column feature card. At 390px, project overview rows and cards use a single column without page overflow. Full CV tool content is retained when omitted from the homepage.
