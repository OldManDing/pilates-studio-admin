import {
  AttendanceStatus,
  BookingStatus,
  CoachStatus,
  MemberStatus,
  MiniUserStatus,
  TransactionKind,
  TransactionStatus
} from '../enums/domain.enums';

export interface MembershipPlanModel {
  id: string;
  code: string;
  name: string;
  category: 'TIME_CARD' | 'PERIOD_CARD' | 'PRIVATE_PACKAGE';
  durationDays: number | null;
  totalCredits: number | null;
  priceCents: number;
  active: boolean;
}

export interface MemberModel {
  id: string;
  memberCode: string;
  name: string;
  phone: string;
  email: string | null;
  status: MemberStatus;
  joinedAt: Date;
  remainingCredits: number;
  currentPlanId: string | null;
  miniUserId: string | null;
}

export interface MiniUserModel {
  id: string;
  openId: string;
  unionId: string | null;
  nickname: string | null;
  phone: string | null;
  status: MiniUserStatus;
  linkedMemberId: string | null;
}

export interface CoachModel {
  id: string;
  coachCode: string;
  name: string;
  status: CoachStatus;
  phone: string;
  email: string | null;
  bio: string | null;
  specialties: string[];
  certificates: string[];
}

export interface CourseModel {
  id: string;
  courseCode: string;
  name: string;
  type: string;
  level: string;
  durationMinutes: number;
  capacity: number;
  coachId: string | null;
  active: boolean;
}

export interface CourseSessionModel {
  id: string;
  sessionCode: string;
  courseId: string;
  coachId: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  bookedCount: number;
  location: string | null;
}

export interface BookingModel {
  id: string;
  bookingCode: string;
  memberId: string;
  sessionId: string;
  status: BookingStatus;
  bookedAt: Date;
  source: 'ADMIN' | 'MINI_PROGRAM';
}

export interface AttendanceModel {
  id: string;
  bookingId: string;
  memberId: string;
  sessionId: string;
  status: AttendanceStatus;
  checkedInAt: Date | null;
  completedAt: Date | null;
}

export interface TransactionModel {
  id: string;
  transactionCode: string;
  memberId: string | null;
  planId: string | null;
  kind: TransactionKind;
  status: TransactionStatus;
  amountCents: number;
  happenedAt: Date;
  notes: string | null;
}

export interface StudioSettingModel {
  id: string;
  studioName: string;
  phone: string;
  email: string;
  businessHours: string;
  address: string;
}
