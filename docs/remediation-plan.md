# Pilates Studio Admin - Audit Remediation Plan

## Overview

This document outlines a phased execution plan for resolving the identified audit issues. Each phase groups related problems with clear commit boundaries and notes which items require product confirmation before implementation.

---

## Issue Summary

| # | Issue | Category | Priority | Needs Product Confirm |
|---|-------|----------|----------|---------------------|
| 1 | Finance member-binding: transactions created without real `memberId` | Backend/Frontend | P1 | YES |
| 2 | Members page: client-side search/filter should be server-side | Backend/Frontend | P1 | NO |
| 3 | Bookings page: client-side search/filter should be server-side | Backend/Frontend | P1 | NO |
| 4 | Coaches page: no pagination, loads all records | Backend/Frontend | P1 | NO |
| 5 | Courses page: no pagination, loads all records | Backend/Frontend | P1 | NO |
| 6 | Reports `getMemberExpiringSoon`: client-side aggregation should be backend endpoint | Backend | P1 | NO |
| 7 | Notifications: recipient dropdown loads all pages client-side | Backend/Frontend | P1 | NO |
| 8 | Dashboard: `Promise.all` fails entirely if one source fails | Frontend | P1 | PARTIAL |
| 9 | UI consistency: inline styles, magic numbers, inconsistent patterns | Frontend | P2 | NO |

---

## Phase 1: Server-Side Search & Filter for Members & Bookings

**Goal:** Move search/filter logic from client-side `useMemo` to backend query parameters.

### 1.1 Members Search/Filter Backendization

**Backend Changes:**
- `backend/src/modules/members/members.service.ts`: Extend `findAll()` to accept `search?`, `status?`, `planId?` parameters
- `backend/src/modules/members/dto/query-member.dto.ts`: Create DTO with `search`, `status`, `planId` fields
- `backend/src/modules/members/members.controller.ts`: Pass query params to service

**Frontend Changes:**
- `src/services/members.ts`: Update `getAll()` to accept filter params
- `src/pages/members/index.tsx`: Remove `filteredMembers` useMemo; pass filters directly to API call
- Remove `searchValue`, `statusFilter`, `planFilter` state-driven filtering; use URL params or direct API calls

**Commit:** `feat(members): add server-side search and filter`

### 1.2 Bookings Search/Filter Backendization

**Backend Changes:**
- `backend/src/modules/bookings/bookings.service.ts`: Extend `findAll()` to accept `search?` (member name/course name), `status?`, `period?`
- `backend/src/modules/bookings/dto/query-booking.dto.ts`: Create or extend DTO

**Frontend Changes:**
- `src/services/bookings.ts`: Update `getAll()` to accept filter params
- `src/pages/bookings/index.tsx`: Remove `filteredBookings` useMemo; pass filters to API call

**Commit:** `feat(bookings): add server-side search and filter`

---

## Phase 2: Pagination for Coaches & Courses

**Goal:** Add server-side pagination to coaches and courses pages.

### 2.1 Coaches Pagination

**Backend Changes:**
- `backend/src/modules/coaches/coaches.service.ts`: Modify `findAll()` to accept `PaginationDto` with `page`, `pageSize`, `search?`, `status?`
- `backend/src/modules/coaches/dto/query-coach.dto.ts`: Create DTO with pagination and filter fields
- `backend/src/modules/coaches/coaches.controller.ts`: Pass query params to service
- Return `PaginatedResponse` shape: `{ data: Coach[], meta: { page, pageSize, total, totalPages } }`

**Frontend Changes:**
- `src/services/coaches.ts`: Update `getAll()` to accept pagination params, return paginated response
- `src/pages/coaches/index.tsx`:
  - Add `Pagination` component
  - Replace `useMemo` filtered display with paginated API data
  - Add `currentPage`, `pageSize` state
  - Remove `filteredCoaches` useMemo; handle filtering via API params

**Commit:** `feat(coaches): add server-side pagination`

### 2.2 Courses Pagination

**Backend Changes:**
- `backend/src/modules/courses/courses.service.ts`: Modify `findAll()` to accept pagination + filter params
- `backend/src/modules/courses/dto/query-course.dto.ts`: Create DTO
- `backend/src/modules/courses/courses.controller.ts`: Pass query params
- Return `PaginatedResponse` shape

**Frontend Changes:**
- `src/services/courses.ts`: Update `getAll()` for pagination
- `src/pages/courses/index.tsx`:
  - Add `Pagination` component
  - Replace `filteredCourses` useMemo with paginated API
  - Add `currentPage`, `pageSize` state

**Commit:** `feat(courses): add server-side pagination`

---

## Phase 3: Reports & Notifications Backend Endpoints

**Goal:** Replace client-side aggregation with dedicated backend endpoints.

### 3.1 Member Expiring Soon Endpoint

**Backend Changes:**
- `backend/src/modules/reports/reports.service.ts`: Add `getMemberExpiringSoon(days: number)` method that does the calculation in a single SQL query with proper date filtering
- `backend/src/modules/reports/reports.controller.ts`: Add `GET /reports/members/expiring-soon?days=30`
- No new DTO needed if using query param

**Frontend Changes:**
- `src/services/reports.ts`: Simplify `getMemberExpiringSoon()` to call the new endpoint directly (single request, no pagination loop)

**Commit:** `feat(reports): add member-expiring-soon endpoint`

### 3.2 Notification Recipient Search Endpoint

**Backend Changes:**
- `backend/src/modules/notifications/notifications.service.ts`: Add `searchRecipients(type, query, page, pageSize)` method
- `backend/src/modules/notifications/notifications.controller.ts`: Add `GET /notifications/recipients?type=members|miniUsers|admins&q=search&page=1&pageSize=20`
- `backend/src/modules/notifications/dto/query-recipient.dto.ts`: Create DTO

**Frontend Changes:**
- `src/services/notifications.ts`: Add `searchRecipients()` method
- `src/pages/notifications/index.tsx`:
  - Replace `loadAllRecipientPages()` with server-side search
  - Debounce the search input
  - Load only current page of results
  - Remove `RECIPIENT_PAGE_SIZE` constant and pagination loop

**Commit:** `feat(notifications): add server-side recipient search`

---

## Phase 4: Dashboard Partial-Failure Handling

**Goal:** Make dashboard load gracefully when individual data sources fail.

**Frontend Changes:**
- `src/pages/dashboard/index.tsx`: Replace `Promise.all` with sequential fetches and individual try/catch blocks
- Each section should render with "待接入" or last known good data when its source fails
- Add partial loading states for individual panels

**Example Pattern:**
```typescript
// Instead of:
const [data1, data2, data3] = await Promise.all([api1(), api2(), api3()]);

// Use:
const [data1, data2, data3] = await Promise.allSettled([api1(), api2(), api3()]);
// Then handle each result separately
```

**Commit:** `fix(dashboard): handle partial failures gracefully`

---

## Phase 5: Finance Member Binding (Requires Product Confirmation)

**⚠️ REQUIRES PRODUCT CONFIRMATION BEFORE IMPLEMENTATION**

### Product Questions

1. **Member lookup UX**: Should admin search by:
   - Member name (fuzzy search)?
   - Phone number (exact or partial)?
   - Member code?
   - All of the above?

2. **Transaction without member**: Can a transaction exist without a member binding?
   - If YES: What does the finance report show for unbound transactions?
   - If NO: Block transaction creation until member is selected?

3. **Existing transactions**: Should we run a migration to backfill `memberId` where possible, or mark as "unknown member"?

4. **Member selector UI**: Dropdown with search? Modal with table + search? Auto-complete?

### Proposed Implementation (Pending Confirmation)

**Backend Changes:**
- `backend/src/modules/transactions/transactions.service.ts`: Require `memberId` on create
- Add `findMembers(query)` method for search
- `backend/src/modules/transactions/transactions.controller.ts`: Add `GET /members/search?q=`
- `backend/src/modules/transactions/dto/create-transaction.dto.ts`: Add `memberId` required field

**Frontend Changes:**
- `src/pages/finance/index.tsx`: Replace `memberName` text input with searchable Select component
- `src/services/transactions.ts`: Pass `memberId` on create/update

**Commit:** `feat(finance): add member binding to transactions` (after product confirmation)

---

## Phase 6: UI Consistency Improvements

**Goal:** Reduce inline styles, magic numbers, and inconsistent patterns.

### 6.1 Inline Style Consolidation

**Files to review:**
- `src/pages/finance/index.tsx` (lines 41-92: color maps, line 114-116: inline stats)
- `src/pages/members/index.tsx`
- `src/pages/bookings/index.tsx`
- `src/pages/coaches/index.tsx`

**Action:** Move inline color maps, status mappings, and constant objects to:
- Shared utility files (`src/utils/`)
- Or CSS modules with proper token usage
- Or `src/types/` for domain-specific constants

**Commit:** `refactor(ui): consolidate inline styles and magic numbers`

### 6.2 Shared Patterns

**Standardize:**
- `StatCard` props across all pages
- Empty state rendering
- Filter modal footer pattern (already exists as `FilterModalFooter`)
- Loading state pattern

**Commit:** `refactor(ui): standardize page patterns`

---

## Phase Dependencies

```
Phase 1 ──────────────────────────────────────────────────┐
  (Members/Bookings server-side filter)                     │
                                                          ▼
Phase 2 ──────────────────────────────────────────────────┐
  (Coaches/Courses pagination)                             │  Can run in parallel
                                                          │  after Phase 1
Phase 3 ──────────────────────────────────────────────────┘
  (Reports/Notifications backend)                          │
                                                          ▼
Phase 4 ──────────────────────────────────────────────────► Can start any time
  (Dashboard partial failure)                               │
                                                          ▼
Phase 5 ◄─────────────────────────────────────────────────► Requires product
  (Finance member binding)                                 │  confirmation
                                                          ▼
Phase 6 ──────────────────────────────────────────────────► Run last
  (UI consistency)
```

---

## Verification After Each Phase

For each phase, verify:
1. Frontend typecheck passes: `npm run typecheck`
2. Frontend lint passes: `npm run lint`
3. Frontend build succeeds: `npm run build`
4. Backend tests pass: `npm run test` (backend)
5. Backend build succeeds: `npm run build` (backend)

---

## Risk Assessment

| Phase | Risk | Mitigation |
|-------|------|------------|
| 1-2 | Breaking API changes | Version endpoints; maintain backward compatibility during transition |
| 3 | Query performance | Add indexes on `joinedAt`, `status` for expiring-soon query |
| 4 | Dashboard data inconsistency | Use last-known-good data with clear staleness indicators |
| 5 | Data migration | Run with feature flag; rollback plan ready |
| 6 | Style regression | Visual smoke tests after each file change |

---

## Items Requiring Product Confirmation

1. **Finance member-binding** (Phase 5): How should member search/selection work?
2. **Dashboard partial failure** (Phase 4): What should users see when a panel fails to load?
3. **Notification bulk send** (Phase 3 related): Should admins be able to send to multiple recipients at once?

---

## Current File State Reference

Based on codebase inspection:

- `src/pages/members/index.tsx`: Line 189-203 `filteredMembers` useMemo does client-side filter
- `src/pages/bookings/index.tsx`: Line 194-209 `filteredBookings` useMemo does client-side filter  
- `src/pages/coaches/index.tsx`: Line 92 `coachesApi.getAll()` loads all with no pagination
- `src/pages/courses/index.tsx`: Line 63 `coursesApi.getAll()` loads all with no pagination
- `src/services/reports.ts`: Line 38-68 `getMemberExpiringSoon` loops pages client-side
- `src/pages/notifications/index.tsx`: Line 230-248 `loadAllRecipientPages` loads all pages
- `src/pages/dashboard/index.tsx`: Line 201 `Promise.all` will fail entirely if one request fails
- `src/pages/finance/index.tsx`: Line 548 `memberName` is text input, not bound to member
