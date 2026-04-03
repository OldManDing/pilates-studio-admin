# Core Entity Relationship Text Description

## Core identity layer

- `Role` defines admin responsibility groups such as owner, frontdesk, coach, and finance.
- `Permission` defines module/action access points.
- `AdminUser` belongs to one `Role`.
- `RolePermission` creates the many-to-many relationship between `Role` and `Permission`.
- `RefreshToken` belongs to one `AdminUser`.

## Member and mini-program identity layer

- `MiniUser` is the user identity for the mini program.
- `Member` is the operational studio identity used by admin staff.
- A `MiniUser` may link to one `Member`, and a `Member` may link back to one `MiniUser`.
- `MembershipPlan` describes purchasable membership/package products.
- A `Member` may belong to one current `MembershipPlan`.
- A `MembershipPlan` can be referenced by many `Member` records over time.

## Coaching and teaching layer

- `Coach` stores instructor profile and operational state.
- `CoachTag` and `CoachCertificate` are child records of `Coach`.
- `Course` is the reusable course template (name, type, level, capacity, duration).
- A `Course` may be assigned to one lead `Coach`.
- `CourseSession` is the scheduled occurrence of a `Course` at a specific time.
- Each `CourseSession` belongs to one `Course` and one `Coach`.

## Booking and attendance layer

- `Booking` belongs to one `Member` and one `CourseSession`.
- Booking source can be admin-created or mini-program-created.
- `Attendance` belongs to one `Booking`, one `Member`, and one `CourseSession`.
- A booking may produce one attendance record.
- This separation allows booking lifecycle and attendance lifecycle to evolve independently.

## Finance layer

- `Transaction` may belong to one `Member`.
- `Transaction` may reference one `MembershipPlan` when the purchase is plan-driven.
- Transactions capture purchases, renewals, private-class packages, refunds, and adjustments.

## Settings layer

- `StudioSetting` stores global studio identity and operating information.
- `NotificationSetting` stores toggleable notification policies used by both admin processes and mini-program flows.

## Derived analytics layer

- Analytics and reports are not modeled as mutable source tables in phase 1.
- They are derived from members, course sessions, bookings, attendance, and transactions.
