export type AccentTone = 'mint' | 'violet' | 'orange' | 'pink' | 'blue';

export type StatItem = {
  title: string;
  value: string;
  hint: string;
  tone?: AccentTone;
};

export type BookingStatus = '已确认' | '待确认' | '已取消' | '已完成';
export type MemberStatus = '正常' | '待激活' | '已过期';
export type CoachStatus = '在职' | '休假中';
export type PaymentStatus = '已完成' | '处理中';
