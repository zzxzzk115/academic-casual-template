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
and Casual modes in light and dark themes at 320, 390, 768, 1024, 1279, 1280 and 1440 CSS pixels.
Use real devices and Safari when those platforms are part of the intended audience.

- Open and close the mobile menu with pointer and keyboard; check Escape, focus
  return, outside clicks, section-link activation, and crossing the desktop breakpoint.
- Scroll on desktop and phone widths: navigation must remain visible, anchor
  destinations must clear it, and the mobile menu must open below it even after scrolling.
- Open search, follow a result, and confirm mode/query context on detail pages.
- For an optional feature image, verify mode visibility, original aspect ratio,
  caption/link and deployment-base handling. No banner element should exist when omitted.
- Filter projects, reset the filter, and check the counts and visible entries.
- Check that project images retain their proportions and complete contents.
- Check portrait crops at desktop and phone widths; the head should remain visible
  and the avatar should not overlap the name, role or affiliation.
- With a configured sidebar, check 1279px and 1280px: the name/handle moves below the portrait and the main heading becomes “About me” only at the wide breakpoint. Exactly one profile and
  contact-link set should be visible and keyboard-accessible. Verify both modes
  retain their own email, photo and address visibility; check a short desktop viewport.
- Scroll down and activate Back to top with pointer and keyboard. Confirm that it
  returns to the page top, hands focus back to the header, and respects reduced motion.
- Check heading permalinks with keyboard and pointer; copied URLs must preserve
  the deployment base, mode/query and fragment.
- Check wide tables, code blocks and Mermaid diagrams. Overflow should stay inside
  their own keyboard-accessible regions rather than widening the page.
- Check homepage selection and hidden empty sections while confirming that archives,
  bibliography downloads and detail pages retain unselected content.

Store local screenshots, Lighthouse output and other generated reports in ignored
`reports/` directories. They are local inspection artifacts rather than template documentation.

## Optional LaTeX documents

Run `pnpm latex --content tests/fixtures/latex` with TeX Live available to exercise the real English/Chinese smoke documents; CI runs the same sources through the composite action and uploads the resulting PDFs. Ordinary unit tests do not require TeX. For configured CVs, inspect every generated page for clipping, missing glyphs and awkward page breaks. Confirm each language's download link on the Academic homepage and CV page, the unchanged single-link fallback, and correct deployment-base handling. Break one source to confirm that compilation fails before PDF publication and deployment.
