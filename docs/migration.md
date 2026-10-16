# Jekyll/al-folio migration adapter

Migration scripts are optional adapters. Normal builds read only the content directory and do not require Jekyll or a legacy site.

```sh
node scripts/import-jekyll.mjs <legacy-source> <new-content> [vuepress-blog-source]
```

Use a new destination and retain a source Git tag. The importer reads `_projects`, `_posts`, `_news`, `_pages/about.md`, the JSONC resume, bibliography and repository list. It preserves filenames as public slugs, copies assets and writes a migration manifest. It parses resume comments, keeps valid dates and reduces impossible day values to known month precision. Supply and review the new site/profile configuration separately. Review imported HTML and external links before building.

```sh
node scripts/audit-migration.mjs <content-repository>
```

The audit reads `migration-manifest.json` and the specified original Git commit. That commit must be available locally. It compares original records, the biography, CV fields, bibliography tags, repository links and Git asset blobs, then writes `migration-audit.json`. Reviewed text replacements and current-source refreshes must be explicitly recorded in the manifest. Unexplained differences fail the command.

`legacyPaths` and `contentChecks` in the manifest also run during normal output verification. They protect prior routes, fragments and displayed information. Baseline auditing is independent of CI output checking and may need a deeper source checkout than a standard shallow clone.
