# Security Remediation Round 2

Date: 2026-05-03

## Scope

- Backend auth and bootstrap security
- Production Docker Compose defaults
- API smoke script safety
- Repository secret hygiene
- Validation after restart

## Fixed

- [x] Refresh token signing now uses the refresh secret instead of the access secret.
- [x] Production auth config now rejects missing or too-short JWT secrets.
- [x] Production auth config now rejects identical access and refresh secrets.
- [x] CORS no longer allows wildcard origins with credentials in production.
- [x] Helmet security headers are enabled at bootstrap.
- [x] `backend/.env` was removed from git tracking and added to ignore rules.
- [x] `docker-compose.yml` now requires explicit production passwords and CORS origins.
- [x] `scripts/test-api.ps1` no longer hardcodes the login password.

## Verified

- [x] `npm run lint` in `backend`
- [x] `npm run typecheck` in `backend`
- [x] `npm test -- --runInBand` in `backend`
- [x] `npm run test:cov -- --runInBand` in `backend`
- [x] `npm run build` in `backend`
- [x] `npm run typecheck` at repo root
- [x] `npm run build` at repo root
- [x] `npm run smoke-test`
- [x] `npm run smoke-test:cov`
- [x] Runtime smoke: `/api/health`, login, refresh, unauthorized `me`, CORS preflight
- [x] Production runtime guard: wildcard CORS now aborts startup
- [x] Production runtime guard: missing JWT secrets now aborts startup

## Findings Remaining

- [ ] Frontend `npm audit` still reports 37 vulnerabilities in the Umi toolchain.
  - Status: deferred
  - Reason: safe fix path requires a framework-level upgrade or a breaking downgrade path that is not production-safe for this pass.
- [ ] `backend/local.env` is still a local secret file and remains readable in the current workspace.
  - Status: accepted local-only risk
  - Reason: the file is no longer tracked by git or scanned as `.env`, but Windows ACL/permission metadata still trips the audit heuristic.
- [ ] Audit scanner still flags generated coverage and `.umi` artifacts.
  - Status: accepted false positive
  - Reason: these are build outputs and are now gitignored, but the scanner still traverses them locally.
- [ ] Test fixtures still contain demo passwords.
  - Status: accepted for tests
  - Reason: these are non-production specs; replacing them does not materially reduce risk.

## Evidence

- Backend audit: 0 vulnerabilities
- Backend tests: 27 suites, 170 tests passed
- Frontend smoke: 13 files, 13 tests passed
- Health check: HTTP 200
- Auth login: token issued
- Refresh flow: token rotation succeeded
- Unauthorized `/api/auth/me`: HTTP 401
- CORS preflight: origin echoed, credentials omitted in wildcard-dev mode
