# Security Remediation Round 3

Date: 2026-05-03

## Scope

- Frontend dependency audit cleanup
- Production-vs-dev dependency classification
- Smoke test compatibility after React Router upgrade
- Final verification after restart

## Fixed

- [x] Moved `umi` from `dependencies` to `devDependencies`; production audit is now clean.
- [x] Added targeted `overrides` for the frontend toolchain:
  - `vite@8.0.10`
  - `@vitejs/plugin-react@5.2.0`
  - `tsx@4.21.0`
  - `esbuild@0.28.0`
  - `react-router@6.30.3`
  - `react-router-dom@6.30.3`
  - `path-to-regexp@1.9.0`
  - `postcss@8.5.13`
  - `send@0.19.2`
  - `@babel/runtime@7.29.2`
- [x] Updated smoke test wrappers to opt into React Router v7 future flags and remove warning noise.
- [x] Removed generated `coverage/` and `src/.umi*` artifacts from the workspace after verification.

## Verified

- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `npm run smoke-test -- --reporter=dot`
- [x] `npm audit --omit=dev` at repo root: 0 vulnerabilities
- [x] `npm audit --omit=dev` in `backend`: 0 vulnerabilities
- [x] `npm ls` dependency tree is coherent for the overridden frontend chain

## Remaining

- [ ] `npm audit` still reports 12 low-severity dev-tooling vulnerabilities through Umi's webpack/mako chain and `elliptic`.
  - Status: accepted
  - Reason: no safe non-breaking patch is available in the published registry for this chain.
- [ ] `backend/local.env` remains a local-only file outside git tracking.
  - Status: local risk
  - Reason: it is not committed, but it should still be handled carefully on the developer machine.

## Outcome

Production dependency audit is clean. The remaining issues are dev-tooling lows only, and the app compiles, lints, builds, and smoke-tests successfully after the dependency changes.
