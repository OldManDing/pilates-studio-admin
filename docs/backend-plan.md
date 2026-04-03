# Backend Architecture Plan

## Goal

Build a shared backend foundation for:

- Admin web frontend
- Mini program frontend

using **NestJS + Prisma + MySQL**, while keeping business language aligned with the existing frontend repo.

## Plan

1. Establish system architecture and module boundaries.
2. Define shared domain model for admin + mini program.
3. Design relational schema in Prisma for MySQL.
4. Scaffold backend project structure without generating business UI.
5. Add Prisma schema, migration strategy, seed strategy, and env example.
6. Define API route inventory and validation baseline.

## Architecture Summary

- **Client layer**
  - `apps/admin-web` (existing frontend, future API consumer)
  - `apps/mini-program` (future mini program client)
- **Service layer**
  - `apps/backend` NestJS monolith modularized by domain
- **Data layer**
  - MySQL primary database
  - Prisma ORM / migrations / seed
- **Infra-ready concerns**
  - JWT auth + refresh token
  - RBAC for admin users
  - file storage abstraction placeholder
  - notification abstraction placeholder

## Bounded Modules

- auth
- admins
- roles
- members
- membership-plans
- mini-users
- coaches
- courses
- course-sessions
- bookings
- attendance
- transactions
- analytics
- reports
- settings
- notifications
- common / prisma / health

## Core Design Decisions

1. Treat **course template** and **course session** as separate entities.
2. Treat **member** and **mini-program user** as separate but linkable identities.
3. Treat **booking** and **attendance** as separate entities.
4. Treat **membership plan** as a first-class domain entity, even though the frontend currently implies it through labels.
5. Keep analytics/report endpoints derived from transactional tables, not separate source-of-truth tables.

## Deliverables in this phase

- backend skeleton
- Prisma schema
- env example
- seed plan
- route list
- textual ER explanation
