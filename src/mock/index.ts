import type { BookingStatus, CoachStatus, MemberStatus, PaymentStatus, StatItem } from '@/types';

export const dashboardStats: Array<StatItem & { icon: 'wallet' | 'team' | 'calendar' | 'rise' }> = [
  { title: '本月营收', value: '¥284,500', hint: '↑ 12.5% vs 上月', tone: 'mint', icon: 'wallet' },
  { title: '总会员', value: '521', hint: '活跃会员 445 人', tone: 'violet', icon: 'team' },
  { title: '今日课程', value: '18', hint: '还有 4 节待开课', tone: 'orange', icon: 'calendar' },
  { title: '月度增长', value: '18.6%', hint: '会员增长保持健康', tone: 'pink', icon: 'rise' }
];

export const todayCourses = [
  { time: '08:00', title: 'Morning Flow', type: 'Reformer', coach: '李静', booking: '6 / 8', status: '剩余 2 位' },
  { time: '10:30', title: 'Core Fundamentals', type: 'Mat', coach: '王芳', booking: '10 / 10', status: '已满' },
  { time: '14:00', title: 'Tower & Mat', type: 'Tower', coach: '张敏', booking: '5 / 6', status: '剩余 1 位' },
  { time: '18:30', title: 'Evening Stretch', type: 'Recovery', coach: '陈瑶', booking: '9 / 12', status: '余位充足' }
];

export const todayBookings: Array<{ name: string; status: BookingStatus; course: string; phone: string; tone: 'mint' | 'violet' | 'orange' | 'pink' }> = [
  { name: '林若溪', status: 'CONFIRMED', course: 'Morning Flow · 08:00', phone: '138****5612', tone: 'mint' },
  { name: '宋知予', status: 'PENDING', course: 'Core Fundamentals · 10:30', phone: '139****1186', tone: 'violet' },
  { name: '顾念', status: 'CANCELLED', course: 'Tower & Mat · 14:00', phone: '136****4721', tone: 'orange' },
  { name: '傅轻岚', status: 'CONFIRMED', course: 'Evening Stretch · 18:30', phone: '150****7843', tone: 'pink' }
];

export const scheduleCards = [
  {
    name: '李静',
    sessions: '12 节',
    tone: 'mint' as const,
    slots: [
      { day: '周一', time: '08:00 · 10:30', count: '2 节' },
      { day: '周四', time: '09:30 · 18:30', count: '2 节' }
    ]
  },
  {
    name: '王芳',
    sessions: '10 节',
    tone: 'violet' as const,
    slots: [
      { day: '周二', time: '07:30 · 11:00', count: '2 节' },
      { day: '周六', time: '09:00 · 16:00', count: '3 节' }
    ]
  }
];

export const memberTrend = [
  { month: '10月', total: 320, active: 280 },
  { month: '11月', total: 352, active: 309 },
  { month: '12月', total: 380, active: 330 },
  { month: '1月', total: 418, active: 362 },
  { month: '2月', total: 452, active: 395 },
  { month: '3月', total: 488, active: 428 },
  { month: '4月', total: 521, active: 445 }
];

export const membersStats: Array<StatItem & { icon: 'team' | 'flash' | 'plus' | 'alert' }> = [
  { title: '总会员数', value: '521', hint: '↑ 7.2% 环比增长', tone: 'mint', icon: 'team' },
  { title: '活跃会员', value: '445', hint: '活跃率 85.4%', tone: 'violet', icon: 'flash' },
  { title: '本月新增', value: '36', hint: '较上月新增 8 人', tone: 'pink', icon: 'plus' },
  { title: '即将到期', value: '23', hint: '需跟进续费', tone: 'orange', icon: 'alert' }
];

export const membersTable: Array<{ key: string; name: string; phone: string; email: string; membership: string; status: MemberStatus; remaining: number; joinedAt: string; tone: 'mint' | 'violet' | 'orange' | 'pink' }> = [
  { key: '1', name: '林若溪', phone: '138****5612', email: 'ruoxi@demo.com', membership: '年卡会员', status: 'ACTIVE', remaining: 28, joinedAt: '2025-06-18', tone: 'mint' },
  { key: '2', name: '宋知予', phone: '139****1186', email: 'zhiyu@demo.com', membership: '季度会籍', status: 'PENDING', remaining: 12, joinedAt: '2026-03-12', tone: 'violet' },
  { key: '3', name: '顾念', phone: '136****4721', email: 'gunian@demo.com', membership: '月度会籍', status: 'EXPIRED', remaining: 0, joinedAt: '2025-10-08', tone: 'orange' },
  { key: '4', name: '傅轻岚', phone: '150****7843', email: 'qinglan@demo.com', membership: '私教组合包', status: 'ACTIVE', remaining: 16, joinedAt: '2025-12-19', tone: 'pink' },
  { key: '5', name: '周听夏', phone: '137****3381', email: 'tingxia@demo.com', membership: '次卡会员', status: 'ACTIVE', remaining: 7, joinedAt: '2026-01-04', tone: 'mint' }
];

export const courseStats: Array<StatItem & { icon: 'calendar' | 'app' | 'percent' | 'star' }> = [
  { title: '课程总数', value: '24', hint: '覆盖 6 种常规课程', tone: 'mint', icon: 'calendar' },
  { title: '本周课程', value: '156', hint: '全部已排期', tone: 'violet', icon: 'app' },
  { title: '平均上座率', value: '87%', hint: '↑ 5.3% vs 上周', tone: 'orange', icon: 'percent' },
  { title: '最受欢迎', value: 'Morning Flow', hint: '满座率 98%', tone: 'pink', icon: 'star' }
];

export const courses = [
  {
    name: 'Morning Flow',
    type: 'Reformer',
    level: '初级',
    coach: '李静',
    duration: '50 分钟',
    capacity: '8 人',
    weekly: '每周 4 节',
    schedule: ['周一 08:00', '周三 08:00', '周五 08:00', '周日 09:00']
  },
  {
    name: 'Core Fundamentals',
    type: 'Mat',
    level: '中级',
    coach: '王芳',
    duration: '60 分钟',
    capacity: '10 人',
    weekly: '每周 3 节',
    schedule: ['周二 10:30', '周四 10:30', '周六 11:00']
  },
  {
    name: 'Tower & Mat',
    type: 'Tower',
    level: '高级',
    coach: '张敏',
    duration: '75 分钟',
    capacity: '6 人',
    weekly: '每周 2 节',
    schedule: ['周二 14:00', '周六 14:00']
  },
  {
    name: 'Evening Stretch',
    type: 'Recovery',
    level: '初级',
    coach: '陈瑶',
    duration: '45 分钟',
    capacity: '12 人',
    weekly: '每周 5 节',
    schedule: ['周一 18:30', '周二 18:30', '周三 18:30', '周四 18:30', '周五 18:30']
  }
];

export const bookingStats: Array<StatItem & { icon: 'calendar' | 'schedule' | 'clock' | 'check' }> = [
  { title: '今日预约', value: '24', hint: '18 已确认', tone: 'mint', icon: 'calendar' },
  { title: '本周预约', value: '156', hint: '满座率 87%', tone: 'violet', icon: 'schedule' },
  { title: '待确认', value: '8', hint: '需及时处理', tone: 'orange', icon: 'clock' },
  { title: '签到率', value: '94%', hint: '↑ 2.1% vs 上周', tone: 'pink', icon: 'check' }
];

export const bookingList: Array<{ id: string; name: string; status: BookingStatus; code: string; course: string; time: string; coach: string; bookedAt: string; tone: 'mint' | 'violet' | 'orange' | 'pink' }> = [
  { id: 'BKG-1032', name: '林若溪', status: 'CONFIRMED', code: 'NO.1032', course: 'Morning Flow', time: '今天 08:00', coach: '李静', bookedAt: '07:12', tone: 'mint' },
  { id: 'BKG-1033', name: '宋知予', status: 'PENDING', code: 'NO.1033', course: 'Core Fundamentals', time: '今天 10:30', coach: '王芳', bookedAt: '08:45', tone: 'violet' },
  { id: 'BKG-1034', name: '顾念', status: 'CANCELLED', code: 'NO.1034', course: 'Tower & Mat', time: '今天 14:00', coach: '张敏', bookedAt: '09:03', tone: 'orange' },
  { id: 'BKG-1035', name: '傅轻岚', status: 'COMPLETED', code: 'NO.1035', course: 'Evening Stretch', time: '今天 18:30', coach: '陈瑶', bookedAt: '09:42', tone: 'pink' }
];

export const coachStats: Array<StatItem & { icon: 'team' | 'star' | 'calendar' | 'heart' }> = [
  { title: '教练总数', value: '12', hint: '在职 10 / 休假 2', tone: 'mint', icon: 'team' },
  { title: '平均评分', value: '4.8', hint: '基于 328 条评价', tone: 'violet', icon: 'star' },
  { title: '本周课程', value: '156', hint: '人均 13 节', tone: 'orange', icon: 'calendar' },
  { title: '学员满意度', value: '96%', hint: '↑ 1.9% 环比', tone: 'pink', icon: 'heart' }
];

export const coaches: Array<{ name: string; status: CoachStatus; experience: string; rating: string; phone: string; email: string; specialties: string[]; certificates: string[]; totalCourses: string; weeklyCourses: string; tone: 'mint' | 'violet' | 'orange' | 'pink' }> = [
  {
    name: '李静', status: 'ACTIVE', experience: '8 年经验', rating: '4.9', phone: '138-1111-0202', email: 'lijing@pilates.com',
    specialties: ['Reformer', 'Prenatal', 'Recovery'], certificates: ['BASI Pilates', 'PMA 认证'], totalCourses: '286 节', weeklyCourses: '16 节', tone: 'mint'
  },
  {
    name: '王芳', status: 'ACTIVE', experience: '6 年经验', rating: '4.8', phone: '138-2222-0202', email: 'wangfang@pilates.com',
    specialties: ['Mat', 'Tower', 'Chair'], certificates: ['STOTT Pilates', '运动康复训练'], totalCourses: '241 节', weeklyCourses: '14 节', tone: 'violet'
  },
  {
    name: '张敏', status: 'ON_LEAVE', experience: '10 年经验', rating: '4.9', phone: '138-3333-0202', email: 'zhangmin@pilates.com',
    specialties: ['Athletic', 'Tower', 'Reformer'], certificates: ['Peak Pilates', '功能性训练'], totalCourses: '328 节', weeklyCourses: '0 节', tone: 'orange'
  },
  {
    name: '陈瑶', status: 'ACTIVE', experience: '5 年经验', rating: '4.7', phone: '138-4444-0202', email: 'chenyao@pilates.com',
    specialties: ['Seniors', 'Mat', 'Recovery'], certificates: ['Balanced Body', '老年运动指导'], totalCourses: '214 节', weeklyCourses: '12 节', tone: 'pink'
  }
];

export const financeStats: Array<StatItem & { icon: 'wallet' | 'pay' | 'line' | 'pie' }> = [
  { title: '本月营收', value: '¥284,500', hint: '↑ 12.5% vs 上月', tone: 'mint', icon: 'wallet' },
  { title: '本月支出', value: '¥106,800', hint: '场地与人员成本', tone: 'orange', icon: 'pay' },
  { title: '净利润', value: '¥177,700', hint: '经营状态良好', tone: 'violet', icon: 'line' },
  { title: '利润率', value: '62.5%', hint: '保持行业领先', tone: 'pink', icon: 'pie' }
];

export const financeBar = [
  { month: '10月', revenue: 180, profit: 112 },
  { month: '11月', revenue: 196, profit: 124 },
  { month: '12月', revenue: 214, profit: 138 },
  { month: '1月', revenue: 228, profit: 146 },
  { month: '2月', revenue: 241, profit: 155 },
  { month: '3月', revenue: 266, profit: 169 },
  { month: '4月', revenue: 285, profit: 178 }
];

export const revenueStructure = [
  { name: '会员年卡', value: 35.5, fill: '#43c7ab' },
  { name: '季度会员', value: 25.5, fill: '#8b7cff' },
  { name: '月度会员', value: 22.1, fill: '#ffb760' },
  { name: '次卡', value: 11.8, fill: '#ff8da8' },
  { name: '私教课程', value: 5.1, fill: '#73a7ff' }
];

export const transactions: Array<{ name: string; status: PaymentStatus; type: string; date: string; amount: string; tone: 'mint' | 'violet' | 'orange' | 'pink' }> = [
  { name: '林若溪', status: '已完成', type: '会员年卡续费', date: '2026-04-01', amount: '¥12,800', tone: 'mint' },
  { name: '宋知予', status: '处理中', type: '私教课程组合', date: '2026-03-31', amount: '¥6,600', tone: 'violet' },
  { name: '顾念', status: '已完成', type: '季度会籍购买', date: '2026-03-31', amount: '¥4,280', tone: 'orange' },
  { name: '傅轻岚', status: '已完成', type: '恢复课程次卡', date: '2026-03-30', amount: '¥2,180', tone: 'pink' }
];

export const analyticsStats: Array<StatItem & { icon: 'target' | 'retention' | 'seat' | 'smile' }> = [
  { title: '目标达成率', value: '112%', hint: '超额完成月度目标', tone: 'mint', icon: 'target' },
  { title: '会员留存率', value: '94.2%', hint: '↑ 1.8% 环比', tone: 'violet', icon: 'retention' },
  { title: '平均上座率', value: '87.3%', hint: '高峰时段表现突出', tone: 'orange', icon: 'seat' },
  { title: '整体满意度', value: '4.8 / 5', hint: '基于 521 份问卷', tone: 'pink', icon: 'smile' }
];

export const popularityData = [
  { name: 'Morning Flow', value: 96 },
  { name: 'Core Fundamentals', value: 88 },
  { name: 'Advanced Reformer', value: 80 },
  { name: 'Tower & Mat', value: 72 },
  { name: 'Beginner Friendly', value: 84 },
  { name: 'Evening Stretch', value: 90 }
];

export const radarData = [
  { subject: '课程质量', score: 95 },
  { subject: '会员满意度', score: 92 },
  { subject: '教练水平', score: 97 },
  { subject: '设施环境', score: 91 },
  { subject: '服务态度', score: 94 },
  { subject: '性价比', score: 87 }
];

export const bookingDistribution = [
  { time: '06:00', value: 12 },
  { time: '08:00', value: 28 },
  { time: '10:00', value: 34 },
  { time: '12:00', value: 22 },
  { time: '14:00', value: 30 },
  { time: '16:00', value: 42 },
  { time: '18:00', value: 56 },
  { time: '20:00', value: 31 }
];

export const retentionData = [
  { month: '10月', retained: 86, newUsers: 58, churn: 12 },
  { month: '11月', retained: 88, newUsers: 64, churn: 11 },
  { month: '12月', retained: 89, newUsers: 67, churn: 10 },
  { month: '1月', retained: 90, newUsers: 70, churn: 9 },
  { month: '2月', retained: 92, newUsers: 72, churn: 8 },
  { month: '3月', retained: 93, newUsers: 75, churn: 7 },
  { month: '4月', retained: 94, newUsers: 79, churn: 6 }
];

export const peakPeriodData = [
  { label: '早晨', time: '06:00–10:00', percent: 35, total: 156, color: '#43c7ab' },
  { label: '上午', time: '10:00–14:00', percent: 22, total: 98, color: '#8b7cff' },
  { label: '下午', time: '14:00–18:00', percent: 28, total: 124, color: '#ffb760' },
  { label: '晚上', time: '18:00–22:00', percent: 15, total: 67, color: '#ff8da8' }
];

export const notificationSettings = [
  { title: '预约确认通知', description: '会员预约课程后立即发送确认提醒', enabled: true },
  { title: '课程提醒', description: '开课前 2 小时自动推送提醒', enabled: true },
  { title: '会籍到期提醒', description: '到期前 7 天提醒前台与会员', enabled: true },
  { title: '每日运营报表', description: '每天 22:00 推送门店概览', enabled: false },
  { title: '每周分析报告', description: '每周一 09:00 自动生成经营周报', enabled: true }
];

export const securityActions = [
  { title: '修改密码', description: '定期更新管理员账号密码' },
  { title: '两步验证', description: '为核心账号开启短信或邮箱二次验证' },
  { title: '权限管理', description: '配置前台、店长和财务的页面权限' }
];

export const dataActions = [
  { title: '数据备份', description: '每日自动备份课程、预约和交易数据' },
  { title: '导出数据', description: '按时间范围导出经营与会员报表' },
  { title: '数据恢复', description: '从最近一次备份恢复门店数据' }
];

export const roleCards: Array<{ key: string; name: string; status: '正常' | '待激活' | '处理中'; users: number; description: string; scopes: string[] }> = [
  {
    key: 'owner',
    name: '店长',
    status: '正常',
    users: 2,
    description: '负责门店运营目标、排班审批与财务复核。',
    scopes: ['门店总览', '财务查看', '角色管理']
  },
  {
    key: 'frontdesk',
    name: '前台',
    status: '正常',
    users: 4,
    description: '处理会员接待、预约确认与课程签到。',
    scopes: ['会员管理', '预约管理', '课程查看']
  },
  {
    key: 'coach',
    name: '教练',
    status: '待激活',
    users: 9,
    description: '查看课程安排、学员档案与训练备注。',
    scopes: ['课程安排', '会员信息(只读)', '签到记录']
  },
  {
    key: 'finance',
    name: '财务',
    status: '处理中',
    users: 1,
    description: '对账、报表导出及交易流水核查。',
    scopes: ['财务报表', '数据导出', '交易流水']
  }
];

export const permissionMatrix: Array<{ key: string; module: string; owner: boolean; frontdesk: boolean; coach: boolean; finance: boolean }> = [
  { key: 'dashboard', module: '仪表盘总览', owner: true, frontdesk: true, coach: true, finance: true },
  { key: 'members', module: '会员管理', owner: true, frontdesk: true, coach: true, finance: false },
  { key: 'bookings', module: '预约管理', owner: true, frontdesk: true, coach: true, finance: false },
  { key: 'coaches', module: '教练管理', owner: true, frontdesk: false, coach: true, finance: false },
  { key: 'finance', module: '财务报表', owner: true, frontdesk: false, coach: false, finance: true },
  { key: 'settings', module: '系统设置', owner: true, frontdesk: false, coach: false, finance: false }
];
