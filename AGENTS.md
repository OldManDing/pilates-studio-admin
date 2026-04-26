# AGENTS.md

## Project mission

Build a production-ready Pilates Studio system based on the existing admin UI style.
The final deliverables include:

1. Admin web frontend
2. Admin backend API
3. Mini program frontend
4. Shared backend services for both admin and mini program
5. Deployable production configuration

## Working style

- Plan first before coding for large tasks.
- Do not make major architectural decisions silently.
- Prefer incremental, reviewable changes.
- Reuse existing design language and domain model consistently.
- Keep outputs concise and execution-oriented.

## Product scope

The system includes these domains:

- Dashboard
- Member management
- Course management
- Booking management
- Coach management
- Finance reports
- Analytics
- System settings
- Mini program user side: home, course booking, coach list/detail, membership, booking records, profile

## Tech stack defaults

Unless the repository already defines otherwise, use:

- Admin frontend: React 18 + Umi 4 + Ant Design 5 + TypeScript + Recharts
- Backend: Node.js + NestJS + Prisma + MySQL
- Mini program frontend: Taro + React + TypeScript
- Auth: JWT + refresh token
- API style: RESTful JSON
- Validation: class-validator / zod where appropriate
- Testing: basic unit tests + API smoke tests
- Lint/format: ESLint + Prettier

## Engineering constraints

- Keep directory structure clean and modular.
- Do not duplicate components or business logic unnecessarily.
- Prefer shared DTO/types/schemas where practical.
- Add mock data only when real backend is not ready.
- Replace mock data with real API integration once backend endpoints exist.
- Never leave fake placeholders in code paths marked production-ready.
- Add env examples for all required environment variables.
- Add seed data for local development.
- Add minimal deployment docs.

## UI constraints

- Preserve the existing Pilates Studio brand language:
  - mint/teal primary
  - purple/orange/pink accents
  - light gray surfaces
  - soft shadow
  - generous spacing
  - rounded cards
  - clean premium wellness SaaS look
- New pages must feel like the same product family.
- Mini program UI must be adapted to mobile interaction, but remain visually consistent with the admin system.

## Backend constraints

- Model real business entities clearly:
  - users/admins
  - members
  - membership plans
  - coaches
  - courses
  - bookings
  - attendance
  - transactions
  - reports
  - notifications
  - system settings
- Define schema first before implementing APIs.
- Implement permissions and role checks for admin APIs.
- Avoid hardcoding IDs, secrets, and environment-specific values.

## Default workflow

For every major task:

1. Inspect existing code and assets
2. Propose a short plan
3. Identify impacted files
4. Implement in small batches
5. Run validation commands
6. Summarize what changed, what remains, and risks

## Done means

A task is done only when:

- code compiles
- lint passes
- key routes/pages load
- APIs run without obvious errors
- frontend and backend contracts match
- no unresolved TODOs remain in touched files
- docs or setup notes are updated if needed

## Validation commands

Always try to run the relevant commands after changes:

- install dependencies
- typecheck
- lint
- test
- build
- relevant dev server or smoke check

## Output contract

For each execution:

1. Brief plan
2. Files to create/change
3. Implementation
4. Validation results
5. Remaining risks / next step

## UI review rules

Before declaring any frontend task complete:

1. run the page locally
2. compare against provided reference images
3. check spacing, typography, card styling, colors, table density, and states
4. list any remaining visual mismatches
5. do not mark done if obvious UI issues remain