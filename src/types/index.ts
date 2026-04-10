export type AccentTone = 'mint' | 'violet' | 'orange' | 'pink' | 'blue';

export type StatItem = {
  title: string;
  value: string;
  hint: string;
  tone?: AccentTone;
};

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
export type MemberStatus = 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'SUSPENDED';
export type CoachStatus = 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE';
export type PaymentStatus = '已完成' | '处理中';
export type TransactionStatus = 'COMPLETED' | 'PENDING' | 'PROCESSING' | 'REFUNDED' | 'FAILED';
export type TransactionKind = 'MEMBERSHIP_PURCHASE' | 'MEMBERSHIP_RENEWAL' | 'CLASS_PACKAGE_PURCHASE' | 'PRIVATE_CLASS_PURCHASE' | 'REFUND' | 'ADJUSTMENT';
export type MembershipPlanCategory = 'TIME_CARD' | 'PERIOD_CARD' | 'PRIVATE_PACKAGE';
