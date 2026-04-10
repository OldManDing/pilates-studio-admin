export type AccentTone = 'mint' | 'violet' | 'orange' | 'pink';

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

export const bookingStatusLabels: Record<BookingStatus, string> = {
  PENDING: '待确认',
  CONFIRMED: '已确认',
  CANCELLED: '已取消',
  COMPLETED: '已完成',
  NO_SHOW: '未到场',
};

export const memberStatusLabels: Record<MemberStatus, string> = {
  ACTIVE: '正常',
  PENDING: '待激活',
  EXPIRED: '已过期',
  SUSPENDED: '已停用',
};

export const coachStatusLabels: Record<CoachStatus, string> = {
  ACTIVE: '在职',
  ON_LEAVE: '休假中',
  INACTIVE: '停用',
};
