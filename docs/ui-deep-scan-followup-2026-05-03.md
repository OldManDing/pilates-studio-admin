# UI Deep Scan Follow-up - 2026-05-03

## Scope

This round focused on real browser UI defects after the previous security and smoke-test pass.

Covered routes:

- `/dashboard`
- `/members`
- `/membership-plans`
- `/mini-users`
- `/courses`
- `/bookings`
- `/coaches`
- `/finance`
- `/analytics`
- `/notifications`
- `/roles`
- `/settings`
- `/login`
- `/forgot-password`
- `/403`
- `/404`

Covered breakpoints:

- Mobile: `380x760`
- Tablet: `820x900`
- Desktop: `1440x1000`

Covered checks:

- page entry rendering
- layout and breakpoint behavior
- horizontal overflow
- visible element out-of-viewport checks
- text clipping candidates
- key mobile and desktop screenshots
- console warning/error capture during route visits
- production build verification

## New Issues Found

| ID | Severity | Page / Module | Reproduced | Root Cause | Status |
| --- | --- | --- | --- | --- | --- |
| UI-FU-001 | P1 | Global layout / tablet breakpoint | Yes, `820px` tablet route screenshots | `src/styles/layout.module.css` switched the sidebar from fixed to static at `<=1200px`, but the drawer/mobile header was only enabled at `<=768px`. Tablet users saw the entire sidebar before page content. | Fixed |
| UI-FU-002 | P1 | Notifications / mobile status chips | Yes, `380px` mobile scan reported `13px` overflow and the final chip exceeded viewport bounds | `statusMetaWrap` used a no-wrap chip row with `flex-shrink: 0`; multiple `sectionMetaPill` items exceeded the narrow card width. | Fixed |
| UI-FU-003 | P2 | Coaches / desktop record cards | Yes, `1440px` desktop scan showed `coachRecordValueClamp` clipping specialty text | Coach record specialty values were clamped to two lines inside a three-column field grid, hiding useful specialty text. | Fixed |

## Fixed Issues

### UI-FU-001 - Tablet sidebar blocks content

- Changed: `src/styles/layout.module.css`
- Fix: use drawer/mobile header layout from `<=1200px` instead of rendering a full static sidebar above the content.
- Why: tablet widths need direct content access and a compact navigation entry, not a full navigation block before every page.
- Immediate retest:
  - `820x900 /notifications`
  - Screenshot: `docs/screenshots/ui-deep-scan-2026-05-03/fix-layout-notifications-tablet.png`
  - Result: page content starts near the top with the menu button visible; no full sidebar block before content.

### UI-FU-002 - Mobile notification chips overflow

- Changed: `src/styles/page.module.css`
- Fix: allow shared status meta rows to wrap, constrain max width, and align wrapped chips to the start on mobile.
- Why: the fix closes the common chip-row failure mode for notifications and any other page using the same shared class.
- Immediate retest:
  - `380x760 /notifications`
  - `380x760 /finance` as a related page using the same shared chip row
  - Screenshots:
    - `docs/screenshots/ui-deep-scan-2026-05-03/fix-notifications-mobile.png`
    - `docs/screenshots/ui-deep-scan-2026-05-03/fix-finance-mobile.png`
  - Result: both pages reported no horizontal overflow and no visible out-of-bounds elements.

### UI-FU-003 - Coach specialty text clipped

- Changed: `src/pages/coaches/index.module.css`
- Fix: increased `coachRecordValueClamp` from two to three lines.
- Why: list rows still remain controlled, but the current two-specialty summary is now fully visible in the desktop card grid.
- Immediate retest:
  - `1440x1000 /coaches`
  - Screenshot: `docs/screenshots/ui-deep-scan-2026-05-03/fix-coaches-desktop.png`
  - Result: specialty values have `scrollHeight === clientHeight`; no horizontal overflow.

## Regression Verification

| Check | Result |
| --- | --- |
| `npm.cmd run typecheck` | Passed |
| `npm.cmd run smoke-test -- --reporter=dot` | Passed, 14 files / 16 tests |
| `npm.cmd run build` | Passed |
| Browser scan at `380px` and `1440px` for 12 protected routes | Passed, no horizontal overflow or out-of-bounds elements |
| Browser scan at `820px` for 12 protected routes | Passed, no horizontal overflow or out-of-bounds elements |

## Remaining Unresolved Issues

No unresolved UI layout defects remain from this round.

One non-layout data quality artifact was observed on `/members`: two records already arrive/display with question-mark names. This was not changed in this UI pass because the DOM text already contains the question marks, so the likely source is existing local data rather than CSS/rendering.

## Previously Missed Area

The most severe miss was the `769px-1200px` tablet breakpoint. Prior checks focused on mobile and desktop, so the static top sidebar behavior at tablet width was not caught.

## Next Priority

The next highest-value check is data quality cleanup for local/member seed records if those question-mark names are not intentional test data.

## Release Judgment

For UI layout and responsive rendering, this round reaches release-ready status for the checked admin routes and breakpoints. This judgment excludes unrelated existing dev dependency audit findings and excludes local data quality cleanup.
