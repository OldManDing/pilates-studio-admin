# Form Modal Control Recheck - 2026-05-04

## Scope

Rechecked the shared admin form modal controls after the membership-plan modal visual report:

- `/membership-plans`
- `/finance`
- `/notifications`
- `/mini-users`

## Issues Found

| ID | Area | Reproduced | Root Cause | Status |
| --- | --- | --- | --- | --- |
| FORM-001 | Shared modal form controls | Yes, in the membership-plan create modal | `settingsInput` styled `Select` selectors too lightly and did not normalize `InputNumber` inner input height, so the dropdown looked borderless and the numeric fields used inconsistent inner sizing. | Fixed |
| FORM-002 | Modal form mount state | Yes, via console warnings on finance / notifications / mini-users form modals | Several modal forms called `form.setFieldsValue(...)` before their `Form` subtree was mounted, because `forceRender` was missing. | Fixed |

## Changes

- `src/styles/page.module.css`
  - Restored visible Select borders/background in modal forms.
  - Normalized `InputNumber` inner input height to match the shared 40px control height.
  - Kept the existing focus treatment consistent across input types.
- `src/pages/finance/index.tsx`
  - Added `forceRender` to the transaction modal.
- `src/pages/notifications/index.tsx`
  - Added `forceRender` to the composer modal.
- `src/pages/mini-users/index.tsx`
  - Added `forceRender` to the link-member modal.

## Verification

- `npm.cmd run typecheck` passed.
- `npm.cmd run lint` passed.
- `npm.cmd run build` passed.
- `npm.cmd run smoke-test` passed.

Browser checks:

- Membership-plan create modal: desktop and mobile screenshot checks, no horizontal overflow, no control height mismatch.
- Finance "新增交易": fresh-tab open produced no new console error after the fix.
- Notifications "新建通知": fresh-tab open produced no new console error after the fix.
- Mini-users "重新绑定": fresh-tab open produced no new console error after the fix.

## Result

The shared modal form control issue is fixed on the checked admin pages, and the related modal mount warnings are gone in fresh-tab verification.
