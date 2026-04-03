# Prisma Migration Strategy

## Recommended flow

1. Configure MySQL and `DATABASE_URL`.
2. Run `npm run prisma:generate`.
3. Run `npm run prisma:migrate:dev -- --name init_core_schema`.
4. Review generated SQL and Prisma client output.
5. Run seed with `npm run seed`.

## Suggested migration breakdown

### 001_init_auth_and_roles
- roles
- permissions
- role_permissions
- admin_users
- refresh_tokens

### 002_init_member_and_mini_user
- mini_users
- membership_plans
- members

### 003_init_coaches_courses_sessions
- coaches
- coach_tags
- coach_certificates
- courses
- course_sessions

### 004_init_bookings_and_attendance
- bookings
- attendance

### 005_init_transactions_and_settings
- transactions
- studio_settings
- notification_settings

## Notes

- Keep analytics/reporting query-driven at first.
- Introduce materialized/stat tables only after real performance needs appear.
