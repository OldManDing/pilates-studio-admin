# Remaining Issues Remediation - 2026-05-03

## Scope

- Frontend smoke-test reliability
- Local secret/config ignore coverage
- Backend seed credential safety
- Security scan follow-up

## Fixed In This Round

| ID | Severity | Status | Issue | Fix |
| --- | --- | --- | --- | --- |
| R4-001 | P1 | Fixed | `npm run smoke-test` passed but took more than 3 minutes with one worker, making it easy to hit automation timeouts. | Increased Vitest `maxWorkers` from `1` to `4`; default smoke suite now passes in about 89 seconds locally. |
| R4-002 | P1 | Fixed | `backend/local-config` contained local environment values but was not ignored by git. | Added `backend/local-config` to `.gitignore`; verified with `git check-ignore`. |
| R4-003 | P1 | Fixed | `backend/prisma/seed.ts` silently fell back to `Admin123!` for the initial admin password. | Seed now requires `SEED_ADMIN_PASSWORD` and fails fast if it is missing. |
| R4-004 | P2 | Fixed | Backend tests had repeated password literals in DTO fixtures. | Moved those fixture values behind test constants so production-like literals are not embedded directly in password fields. |
| R4-005 | P2 | Fixed | Deployment and migration docs did not state that seed requires an explicit admin password. | Updated `DEPLOYMENT.md`, `backend/.env.example`, and `backend/prisma/MIGRATION.md`. |

## Verified

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run smoke-test -- --reporter=dot` | Passed, 13/13 tests, ~89s |
| `npm run build` | Passed |
| `npm audit --omit=dev` | Passed, 0 vulnerabilities |
| `npm audit` | 12 low dev-tooling findings remain via Umi's `elliptic` chain |
| `npm run typecheck` in `backend` | Passed |
| `npm run lint` in `backend` | Passed |
| `npm run test -- --runInBand` in `backend` | Passed, 27 suites / 170 tests |
| `npm run build` in `backend` | Passed |
| `npm audit --omit=dev` in `backend` | Passed, 0 vulnerabilities |
| `npm audit` in `backend` | Passed, 0 vulnerabilities |
| `audit-code` | No critical findings after generated Umi directory cleanup; remaining findings are JSX `<Select>` and Prisma `migration_lock.toml` false positives. |

## Remaining Items

| ID | Severity | Status | Reason |
| --- | --- | --- | --- |
| R4-R01 | Low | Not safely fixable now | Frontend full `npm audit` still reports 12 low-severity dev-tooling findings through Umi's webpack/mako dependency chain. npm reports the only automated fix as forcing `umi@3.3.15`, which would downgrade from Umi 4 and break the current project architecture. Production audit is clean. |
| R4-R02 | Info | False positive | `audit-code` matches Ant Design JSX `<Select>` components as SQL `SELECT`; manual search found no unsafe raw SQL in frontend code. Backend raw SQL usage is limited to Prisma-tagged `SELECT 1` health check. |
| R4-R03 | Info | False positive | `audit-code` matches `provider = "mysql"` in Prisma `migration_lock.toml` as `system (` because of text overlap; the file contains no executable call. |

## Current Judgment

The actionable remaining issues found in this round are fixed and re-verified. The only unresolved security item is a low-severity development dependency advisory with no non-breaking patched upstream release available at this time.
