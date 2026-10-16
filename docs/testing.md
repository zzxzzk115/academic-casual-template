# Testing

Run the automated checks before changing the template pin in a content repository:

```sh
pnpm check
pnpm test
pnpm check:examples
```

`check` runs Astro and TypeScript diagnostics. `test` covers configuration, content
selection, paths and references, Markdown rendering, and content initialization.
`check:examples` builds independent fixtures at `/` and `/portfolio/`, verifies
links and assets, and checks that one site's identity does not leak into another.
GitHub Actions runs the same checks for pull requests.

To validate a separate content repository:

```sh
pnpm site build --content ../my-site --out ../my-site/dist
pnpm verify ../my-site/dist ../my-site
```

Keep that site's migration audit and content-specific checks in its own repository.

## Browser checks

Use a production build so that search has its generated index. Check both Academic
and Casual modes in light and dark themes at 320, 390, 768, 1024 and 1280 CSS pixels.
Use real devices and Safari when those platforms are part of the intended audience.

- Open and close the mobile menu with pointer and keyboard; check Escape, focus
  return, outside clicks, section-link activation, and crossing the desktop breakpoint.
- Open search, follow a result, and confirm mode/query context on detail pages.
- Filter projects, reset the filter, and check the counts and visible entries.
- Check that project images retain their proportions and complete contents.
- Check heading permalinks with keyboard and pointer; copied URLs must preserve
  the deployment base, mode/query and fragment.
- Check wide tables, code blocks and Mermaid diagrams. Overflow should stay inside
  their own keyboard-accessible regions rather than widening the page.
- Check homepage selection and hidden empty sections while confirming that archives,
  bibliography downloads and detail pages retain unselected content.

Store local screenshots, Lighthouse output and other generated reports in ignored
`reports/` directories. They are local inspection artifacts rather than template documentation.
