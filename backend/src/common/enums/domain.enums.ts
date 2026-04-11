export enum MemberStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  EXPIRED = 'EXPIRED',
  SUSPENDED = 'SUSPENDED',
}

export enum CoachStatus {
  ACTIVE = 'ACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  INACTIVE = 'INACTIVE',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
}

export enum AttendanceStatus {
  PENDING = 'PENDING',
  CHECKED_IN = 'CHECKED_IN',
  COMPLETED = 'COMPLETED',
  ABSENT = 'ABSENT',
  CANCELLED = 'CANCELLED',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum TransactionKind {
  MEMBERSHIP_PURCHASE = 'MEMBERSHIP_PURCHASE',
  MEMBERSHIP_RENEWAL = 'MEMBERSHIP_RENEWAL',
  CLASS_PACKAGE_PURCHASE = 'CLASS_PACKAGE_PURCHASE',
  PRIVATE_CLASS_PURCHASE = 'PRIVATE_CLASS_PURCHASE',
  REFUND = 'REFUND',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum AdminRoleCode {
  OWNER = 'OWNER',
  FRONTDESK = 'FRONTDESK',
  COACH = 'COACH',
  FINANCE = 'FINANCE',
}

export enum MiniUserStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
}

export enum MembershipPlanCategory {
  TIME_CARD = 'TIME_CARD',
  PERIOD_CARD = 'PERIOD_CARD',
  PRIVATE_PACKAGE = 'PRIVATE_PACKAGE',
}

export enum BookingSource {
  ADMIN = 'ADMIN',
  MINI_PROGRAM = 'MINI_PROGRAM',
}

export enum NotificationChannel {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  MINI_PROGRAM = 'MINI_PROGRAM',
  INTERNAL = 'INTERNAL',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  READ = 'READ',
  FAILED = 'FAILED',
}
