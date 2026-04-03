# API Route Inventory

Base prefix: `/api`

## Health

- `GET /health`

## Auth

- `POST /auth/admin/login`
- `POST /auth/admin/refresh`
- `POST /auth/admin/logout`
- `GET /auth/me`
- `POST /auth/mini/login`

## Admins

- `GET /admins`
- `POST /admins`
- `GET /admins/:id`
- `PATCH /admins/:id`
- `PATCH /admins/:id/password`
- `DELETE /admins/:id`

## Roles & permissions

- `GET /roles`
- `POST /roles`
- `GET /roles/:id`
- `PATCH /roles/:id`
- `DELETE /roles/:id`
- `GET /permissions`
- `PUT /roles/:id/permissions`

## Members

- `GET /members`
- `POST /members`
- `GET /members/:id`
- `PATCH /members/:id`
- `DELETE /members/:id`
- `GET /members/:id/bookings`
- `GET /members/:id/transactions`
- `GET /members/:id/attendance`

## Membership plans

- `GET /membership-plans`
- `POST /membership-plans`
- `GET /membership-plans/:id`
- `PATCH /membership-plans/:id`
- `DELETE /membership-plans/:id`

## Mini-program users

- `GET /mini-users/me`
- `GET /mini-users/:id`
- `PATCH /mini-users/:id`
- `POST /mini-users/:id/link-member`

## Coaches

- `GET /coaches`
- `POST /coaches`
- `GET /coaches/:id`
- `PATCH /coaches/:id`
- `DELETE /coaches/:id`
- `GET /coaches/:id/sessions`

## Courses

- `GET /courses`
- `POST /courses`
- `GET /courses/:id`
- `PATCH /courses/:id`
- `DELETE /courses/:id`

## Course sessions

- `GET /course-sessions`
- `POST /course-sessions`
- `GET /course-sessions/:id`
- `PATCH /course-sessions/:id`
- `DELETE /course-sessions/:id`

## Bookings

- `GET /bookings`
- `POST /bookings`
- `GET /bookings/:id`
- `PATCH /bookings/:id`
- `PATCH /bookings/:id/status`
- `DELETE /bookings/:id`

## Attendance

- `GET /attendance`
- `POST /attendance/check-in`
- `POST /attendance/check-out`
- `PATCH /attendance/:id`
- `GET /attendance/:id`

## Transactions

- `GET /transactions`
- `POST /transactions`
- `GET /transactions/:id`
- `PATCH /transactions/:id`
- `DELETE /transactions/:id`

## Analytics

- `GET /analytics/dashboard`
- `GET /analytics/members/growth`
- `GET /analytics/bookings/distribution`
- `GET /analytics/courses/popularity`
- `GET /analytics/retention`

## Reports

- `GET /reports/finance/summary`
- `GET /reports/finance/trend`
- `GET /reports/finance/revenue-structure`
- `GET /reports/export`

## Settings

- `GET /settings/studio`
- `PATCH /settings/studio`
- `GET /settings/notifications`
- `PATCH /settings/notifications/:key`
- `POST /settings/security/password`
- `POST /settings/security/two-factor`
- `POST /settings/data/backup`
- `POST /settings/data/export`
- `POST /settings/data/restore`

## Mini-program member-facing routes

- `GET /mini/courses`
- `GET /mini/courses/:id`
- `GET /mini/coaches`
- `GET /mini/coaches/:id`
- `GET /mini/members/me`
- `GET /mini/members/me/membership`
- `GET /mini/bookings`
- `POST /mini/bookings`
- `DELETE /mini/bookings/:id`
