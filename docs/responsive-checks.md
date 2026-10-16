# Responsive navigation checks

Last checked: 16 October 2026, using a production build in the Codex in-app browser. Interaction checks used an external content repository with both homepages, 23 projects and populated detail pages. That content is not part of this template.

These are browser viewport, DOM geometry and keyboard/mouse interaction checks. They do not establish compatibility with physical iOS/Android devices or Safari. Screenshot capture timed out in the test environment, so no visual screenshot comparison is claimed.

## Viewports

Academic and Casual both passed page-width checks at 320, 360, 390, 550, 551, 600, 768, 820, 1000, 1001, 1024, 1180 and 1280 CSS pixels. In every case, the document scroll width matched its client width.

| Width | Navigation | Result |
| --- | --- | --- |
| 320, 360 | Collapsed menu; mode links on a second header row | No horizontal overflow; 44 × 44px icon buttons |
| 390, 550 | Collapsed menu; single header row | No horizontal overflow; menu links at least 44px high |
| 551, 600, 768, 820, 1000 | Collapsed menu with profile name visible | Open/close, Escape and focus return passed |
| 1001, 1024, 1180, 1280 | Desktop navigation | Mobile menu hidden; no horizontal overflow |

## Interaction regression checklist

- In each mode, open the menu with its button; check that `aria-expanded`, `aria-controls`, its accessible name and the visible links agree. Close it again with the button or Escape. Escape returns focus to the menu button.
- Open with Enter, Tab into the navigation and activate a section link with Enter. The menu closes and the expected section hash is selected.
- Click outside an open menu. It closes without consuming the destination click.
- Open at 820 × 1180, change to 1180 × 820, and return to portrait. Wait for the media-query change event between changes. The menu stays closed after crossing the desktop breakpoint; two navigation panels must never appear together.
- Open a menu, then open search. The menu closes; the search dialog stays inside a 390px viewport. A production-index query returns project links, and Escape closes search.
- Switch modes, filter projects, reset the filter and open a project. The filter counts and detail-page mode context remain correct. A section link from a detail page returns to the matching homepage mode.
- Check the homepage and a project detail with light and dark themes. Check a populated detail at 320 × 568, 768 × 1024 and 1024 × 768 for page overflow. Code blocks may scroll inside their own containers.

All of the above interactions passed in this session. The full project listing also showed all 23 entries without page overflow at 390px.

The same revision passed Astro/TypeScript checking, the 14 template tests, production content/link verification and independent root/subpath example builds. Repeat these interaction checks after changes to the header, navigation, typography or breakpoints.
