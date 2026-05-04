# Frontend npm audit Impact Review - 2026-05-03

## Scope

This round rechecked the remaining frontend full `npm audit` findings and whether they affect admin features, UI rendering, production runtime dependencies, or backend security status.

## Reproduction

| Check | Result |
| --- | --- |
| `npm.cmd audit --json` | Reproduced: 12 low-severity findings |
| `npm.cmd audit --omit=dev --json` | Passed: 0 production dependency vulnerabilities |
| `npm.cmd explain elliptic` | Reproduced dependency path through Umi dev tooling |
| `npm.cmd view elliptic version` | Latest published version is `6.6.1`, which is still in the advisory range |
| `npm.cmd audit fix --dry-run --force` | Only proposed path is forcing `umi@3.3.15`, a breaking Umi 4 to Umi 3 downgrade |

## Root Cause

The 12 findings are one transitive vulnerability group rooted at `elliptic@6.6.1`.

Dependency path:

```text
umi@4.6.49
  -> @umijs/preset-umi
    -> @umijs/bundler-webpack / @umijs/bundler-mako / @umijs/bundler-utoopack
      -> node-libs-browser / node-libs-browser-okam
        -> crypto-browserify
          -> browserify-sign / create-ecdh
            -> elliptic@6.6.1
```

`elliptic` currently has no newer patched npm release. npm's automated remediation avoids the Umi 4 dependency chain by downgrading to `umi@3.3.15`; that is not a safe patch for this project because the app is built on Umi 4.

## Impact On Features And UI

Current impact on admin features and UI: none confirmed.

Evidence:

| Evidence | Result |
| --- | --- |
| Frontend source search for `crypto`, `elliptic`, `browserify`, `create-ecdh`, `node-libs-browser` in `src` and `config` | No matches |
| Built `dist` search for `elliptic`, `browserify-sign`, `crypto-browserify`, `create-ecdh`, `node-libs-browser`, `ecdh` | No matches |
| `npm.cmd run build` | Passed |
| `npm.cmd run smoke-test -- --reporter=dot` | Passed: 14 files / 16 tests |

Affected surface:

- Development dependency audit reports.
- Umi development/build toolchain dependency tree.
- Potential future risk if frontend code starts importing Node `crypto` or a dependency that causes `crypto-browserify` to enter the browser bundle.

Not affected by current evidence:

- Login UI.
- Dashboard.
- Member, course, booking, coach, finance, analytics, notifications, roles, settings pages.
- Membership plan and mini-user pages.
- Production runtime dependency audit.
- Backend APIs or backend dependency audit.

## Other Issues Rechecked

| Area | Command | Result |
| --- | --- | --- |
| Frontend typecheck | `npm.cmd run typecheck` | Passed |
| Frontend lint | `npm.cmd run lint` | Passed |
| Frontend build | `npm.cmd run build` | Passed |
| Frontend smoke tests | `npm.cmd run smoke-test -- --reporter=dot` | Passed: 14 files / 16 tests |
| Frontend production audit | `npm.cmd audit --omit=dev --json` | Passed: 0 vulnerabilities |
| Backend typecheck | `npm.cmd run typecheck` in `backend` | Passed |
| Backend lint | `npm.cmd run lint` in `backend` | Passed |
| Backend unit tests | `npm.cmd run test -- --runInBand` in `backend` | Passed: 27 suites / 170 tests |
| Backend build | `npm.cmd run build` in `backend` | Passed |
| Backend full audit | `npm.cmd audit --json` in `backend` | Passed: 0 vulnerabilities |
| TODO scan | `rg -n "TODO|FIXME|XXX|HACK" src backend/src config smoke-tests` | No matches |

## Issue Closure Status

| ID | Status | Reproduced | Root Cause | Current Decision |
| --- | --- | --- | --- | --- |
| FAI-001 | Unresolved upstream/tooling item | Yes | Umi 4 depends on a toolchain path that includes `elliptic@6.6.1`; no patched `elliptic` release exists | Do not force downgrade to Umi 3. Track upstream or handle as a framework migration task |

## Current Conclusion

No additional dependency vulnerabilities or validation failures were found in this round outside the known 12 low-severity frontend dev-tooling findings.

These 12 findings do not currently map to a broken feature, broken UI, backend API issue, or production runtime dependency issue. They remain an accepted development-tooling risk unless the project policy requires a completely clean full `npm audit`, in which case the next step is a dedicated Umi toolchain migration branch rather than a hotfix.

