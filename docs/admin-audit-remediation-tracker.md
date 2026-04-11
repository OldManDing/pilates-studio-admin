# Admin Audit Remediation Tracker

## Status Legend

- `pending`: not started
- `in_progress`: currently being fixed
- `done`: fixed and validated in current phase
- `blocked`: needs product / business confirmation before a safe fix

## Phase Plan

### Phase 1 — Highest-risk data and contract issues
- Finance transaction/member binding loop
- Reports expiring-soon backendization

### Phase 2 — Server-side filtering and pagination
- Members search/filter backendization
- Bookings search/filter/period backendization
- Coaches pagination
- Courses pagination
- Notification recipient server-side search

### Phase 3 — Runtime/interaction resilience
- Dashboard partial-failure handling
- Settings restore/export interaction resilience
- Roles delete / management closure (if confirmed)
- Notifications/detail/read interaction hardening

### Phase 4 — UI consistency and design-system cleanup
- Buttons / spacing / typography / color token consistency
- Dashboard / Finance / Roles / Bookings visual consistency cleanup

### Product-confirmation bucket
- Analytics advanced metric definitions
- Finance member-binding business rules
- Role deletion rules
- Notification sending policy and scope
- Dashboard product positioning

---

## 1. UI Quality Issues

| ID | Page/Module | Problem | Cause | Suggested Fix | Priority | Status | Notes |
|---|---|---|---|---|---|---|---|
| UI-01 | Global page container | Page padding collapses too aggressively on medium screens | Breakpoint rule in `page.module.css` compresses horizontal spacing too far | Normalize page container spacing across breakpoints | P1 | pending | |
| UI-02 | Dashboard | Dashboard cards feel stitched from different component families | Different internal spacing, heading rhythm, and action treatment across dashboard cards | Unify dashboard card shell and section rhythm | P1 | pending | |
| UI-03 | Finance | Finance page visual language drifts from other CRUD pages | Stats, chart blocks, and records use a different density and card rhythm | Align finance layout and card density with other operational pages | P1 | pending | |
| UI-04 | Roles | Roles page uses a separate color and button system | Local CSS variables and gradients bypass shared tokens | Re-anchor roles page to global token/button system | P1 | pending | |
| UI-05 | Global buttons | Primary/secondary action patterns remain fragmented | `ActionButton`, toolbar buttons, role buttons, and tabs use different sizes/treatment | Consolidate button hierarchy and dimensions | P1 | pending | |
| UI-06 | Typography | Hardcoded font sizes bypass type scale | Several modules still use raw `11px/12px/18px` values | Replace hardcoded sizes with typography tokens | P1 | pending | |
| UI-07 | Color system | Multiple hardcoded colors and gradients break brand consistency | Page-level CSS and inline maps skip CSS variables | Map visual accents back to shared tokens | P1 | pending | |
| UI-08 | Card spacing | Card padding/gap/hover patterns differ too much | StatCard, SectionCard, list cards, and settings shells all use different spacing rules | Normalize card spacing and hover rhythm | P2 | pending | |
| UI-09 | Settings | Settings shells still feel like their own product area | Settings overview/section shell pattern diverges from the main admin structure | Bring settings shells closer to main page patterns | P2 | pending | |
| UI-10 | Bookings | Hero stats / period selector still form an isolated visual island | Bespoke visual patterns not reused elsewhere | Pull bookings control layer closer to shared toolbar/stat patterns | P2 | pending | |

## 2. Functional Issues

| ID | Page/Module | Feature | Problem Description | Reproduction | Expected Result | Actual Result | Priority | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| FN-01 | Finance | Create/Edit transaction | Member association does not form a real create/edit loop | Create or edit a transaction and try to set/change member identity | Member linkage should be persisted or clearly constrained | Current flow does not persist proper member linkage | P0 | done | Added transaction update endpoint and finance member selector bound to `memberId` |
| FN-02 | Members | Search / filter | Search and filters only operate on loaded page data | Search for a member not on the first loaded page | Search/filter should cover full dataset | Current behavior only covers current loaded page | P1 | pending | Phase 2 |
| FN-03 | Bookings | Status progression | Local optimistic update can diverge from real backend state on failure | Trigger status advance and force API failure | UI should only reflect confirmed backend result | UI may briefly show changed state before backend confirms | P1 | pending | Phase 3 |
| FN-04 | Coaches | Delete | Coach list uses optimistic removal without rollback on failure | Delete a coach while API fails | Failed delete should leave UI unchanged | UI can remove then require refresh to recover | P1 | pending | Phase 3 |
| FN-05 | Courses | Detail synchronization | Editing one course can incorrectly affect currently open detail state | Open detail drawer, edit another course, inspect detail panel | Only edited course state should change | Current update condition risks wrong detail refresh | P1 | pending | Phase 3 |
| FN-06 | Notifications | Manual send | Recipient selection currently depends on client-side full list loading | Open composer on a large dataset and search recipient | Search should stay responsive and complete | Current flow loads all options locally | P2 | pending | Phase 2 |
| FN-07 | Roles | Role lifecycle | No delete flow exists for roles | Try to fully manage a role lifecycle | Role management should have explicit deletion rules or constrained omission | Delete is absent | P2 | blocked | Needs product rule |
| FN-08 | Settings | Restore/export UX | Restore/export/recovery feedback is still weak and fragile | Trigger invalid restore or export issues | User should get contextual recovery guidance | Current flow relies mainly on toast feedback | P2 | pending | Phase 3 |
| FN-09 | Dashboard | Partial failure | Dashboard does not surface partial API failure clearly | Fail one dashboard API while others succeed | Page should degrade locally with clear explanation | Current pattern is mainly toast + silent empty values | P2 | pending | Phase 3 |
| FN-10 | Analytics | Metric semantics | Some advanced analytics values still lack product-defined semantics | Review retention / satisfaction / goal metrics | Metrics should be product-defined and explainable | Current implementation is minimum-credible but not final business definition | P2 | blocked | Needs product definition |

## 3. API / Data Issues

| ID | Page/Module | Current Data Source | Problem | Risk | Priority | Status | Notes |
|---|---|---|---|---|---|---|---|
| API-01 | `src/mock/index.ts` | Local mock file | Large demo dataset still exists in repo | Future accidental reuse can reintroduce fake data | P1 | pending | Phase 4 / hygiene |
| API-02 | `src/utils/mockAuth.ts` | Local demo auth helper | Demo auth utility still exists | Future accidental reuse can corrupt real auth behavior | P1 | pending | Phase 4 / hygiene |
| API-03 | Members | `/members` + local filtering | Search/filter not pushed to backend | Incomplete results with larger datasets | P1 | pending | Phase 2 |
| API-04 | Bookings | `/bookings` + local period/status filter | Current list still depends on local filtering workaround | Dataset scale and correctness risks | P1 | pending | Phase 2 |
| API-05 | Coaches | `/coaches` | No pagination contract | Performance and UX degrade with larger data | P1 | pending | Phase 2 |
| API-06 | Courses | `/courses` | No pagination contract | Performance and UX degrade with larger data | P1 | pending | Phase 2 |
| API-07 | Reports / expiring members | Frontend pagination walk | Expiring-soon logic still depends on frontend aggregation workaround | Slow, fragile, and easy to desync from backend | P1 | done | Added backend `GET /reports/members/expiring-soon` and removed frontend pagination walk |
| API-08 | Notifications | `/notifications` + local recipient option loading | Recipient search still loads all entities client-side | Slow or incomplete at scale | P2 | pending | Phase 2 |
| API-09 | Finance | `/transactions` | Member-binding contract incomplete | Financial records can become semantically wrong | P0 | done | Added full transaction update contract and persisted member binding on create/edit |
| API-10 | Analytics | `/analytics/*` | Higher-level analytics semantics still not finalized | Product may over-trust provisional metrics | P2 | blocked | Needs product rule |

---

## Top 10 — Most Damaging to UI Quality
1. Dashboard card family inconsistency
2. Roles page color/button system drift
3. Finance page visual density mismatch
4. Fragmented button hierarchy
5. Hardcoded typography outside token scale
6. Hardcoded colors/gradients outside token system
7. Inconsistent card spacing and hover rules
8. Page container breakpoint padding collapse
9. Settings shell divergence
10. Bookings bespoke control strip style drift

## Top 10 — Most Damaging to Functional Usability
1. Finance transaction/member binding not closed
2. Members search/filter only covers loaded page data
3. Bookings local optimistic status update drift risk
4. Coaches delete optimistic rollback gap
5. Coaches/courses missing pagination
6. Reports expiring-soon frontend workaround
7. Roles missing delete lifecycle
8. Settings restore/export weak recovery UX
9. Dashboard partial-failure weak handling
10. Notifications recipient client-side search scalability issue

## Top 10 — Most Damaging to Real Integration Pass Rate
1. Finance member-binding contract gap
2. Members local filtering over paginated data
3. Bookings local filtering workaround
4. Coaches no pagination contract
5. Courses no pagination contract
6. Reports expiring-soon frontend aggregation workaround
7. Notifications recipient client-side full-list loading
8. Analytics advanced metric semantics unresolved
9. `mockAuth` still in repo
10. `src/mock/index.ts` still in repo

---

## Recommended Fix Order

### Phase 1 — Highest-risk data / contract fixes
1. Finance transaction-member binding loop
2. Reports expiring-soon backendization

### Phase 2 — Server-side search/filter/pagination
3. Members backend search/filter
4. Bookings backend search/filter/period handling
5. Coaches pagination
6. Courses pagination
7. Notifications recipient server-side search

### Phase 3 — Runtime resilience and interaction closure
8. Dashboard partial-failure UX
9. Settings restore/export resilience
10. Coaches delete rollback / Bookings optimistic drift / Courses detail sync

### Phase 4 — UI consistency pass
11. Button hierarchy unification
12. Color/token cleanup
13. Typography/token cleanup
14. Dashboard / Finance / Roles / Bookings visual convergence

---

## Fixable Immediately
- Finance member-binding loop
- Members server-side search/filter
- Bookings server-side search/filter/period handling
- Coaches and courses pagination
- Reports expiring-soon backendization
- Notifications recipient server-side search
- Dashboard partial-failure handling
- First-pass UI/token consistency cleanup

## Requires Human / Product Confirmation
- Analytics advanced metric definitions
- Finance transaction/member business rules
- Role deletion policy
- Notification sending policy and allowed recipient scope
- Dashboard final product positioning
