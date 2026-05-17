import {
  BellOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  SendOutlined,
} from '@ant-design/icons';
import {
  Button,
  Descriptions,
  Form,
  Input,
  Modal,
  Pagination,
  Select,
  Spin,
  message,
} from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ActionButton from '@/components/ActionButton';
import EmptyState from '@/components/EmptyState';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatCard from '@/components/StatCard';
import StatusTag from '@/components/StatusTag';
import { adminsApi, type AdminRecord } from '@/services/admins';
import { authApi } from '@/services/auth';
import { membersApi, type Member } from '@/services/members';
import { miniUsersApi, type MiniUserRecord } from '@/services/miniUsers';
import {
  notificationsApi,
  type CreateNotificationData,
  type NotificationChannel,
  type NotificationRecord,
  type NotificationStatus,
} from '@/services/notifications';
import { CRUD_MODAL_WIDTH } from '@/styles/dimensions';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import { getErrorMessage } from '@/utils/errors';
import { hasRequiredPermissions } from '@/utils/menu';
import styles from './index.module.css';

type RecipientType = 'member' | 'miniUser' | 'admin';

const isFeedbackNotification = (notification: NotificationRecord) => notification.type === 'MINI_PROGRAM_FEEDBACK';
const isAccountDeletionRequest = (notification: NotificationRecord) => notification.type === 'ACCOUNT_DELETION_REQUEST';
const isMembershipRenewalRequest = (notification: NotificationRecord) => notification.type === 'MEMBERSHIP_RENEWAL_REQUEST';

const getDeletionProcessedAt = (notification: NotificationRecord) => {
  const payload = notification.payload;
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const processedAt = payload.accountDeletionProcessedAt;
  return typeof processedAt === 'string' ? processedAt : null;
};

const isDeletionProcessed = (notification: NotificationRecord) =>
  isAccountDeletionRequest(notification) && Boolean(getDeletionProcessedAt(notification) || notification.readAt);
type FilterStatus = NotificationStatus | 'ALL';
type FilterChannel = NotificationChannel | 'ALL';
type FilterType = 'ALL' | 'MINI_PROGRAM_FEEDBACK' | 'MEMBERSHIP_RENEWAL_REQUEST' | 'ACCOUNT_DELETION_REQUEST';
type RecipientSelectOption = {
  value: string;
  label: string;
  searchText: string;
};

type ComposerFormValues = {
  recipientType: RecipientType;
  recipientId: string;
  channel: Extract<NotificationChannel, 'INTERNAL' | 'MINI_PROGRAM' | 'EMAIL' | 'SMS'>;
  type: string;
  title: string;
  content: string;
};

const notificationTemplateOptions = [
  { type: 'SYSTEM_NOTICE', title: '系统通知', description: '用于发送普通系统消息或门店公告。' },
  { type: 'STORE_NOTICE', title: '门店通知', description: '用于发送门店运营安排、假期调整等消息。' },
  { type: 'BOOKING_CONFIRMATION', title: '预约确认', description: '会员预约成功后的确认通知。' },
  { type: 'BOOKING_CANCELLED', title: '预约取消', description: '预约取消后的提醒通知。' },
  { type: 'BOOKING_REMINDER', title: '课程提醒', description: '课程开始前的提醒通知。' },
  { type: 'ATTENDANCE_CHECKED_IN', title: '签到成功', description: '会员完成签到后的记录通知。' },
  { type: 'MEMBERSHIP_EXPIRY', title: '会籍到期', description: '会员卡即将到期的提醒通知。' },
  { type: 'MEMBERSHIP_RENEWAL_REQUEST', title: '续费申请', description: '会员提交续费申请后的跟进通知。' },
  { type: 'MINI_PROGRAM_FEEDBACK', title: '小程序反馈', description: '用户从小程序提交反馈后的站内通知。' },
  { type: 'ACCOUNT_DELETION_REQUEST', title: '注销申请', description: '用户提交账号注销后的处理通知。' },
] as const;

const notificationTypeOptions = notificationTemplateOptions.map((option) => ({
  value: option.type,
  label: `${option.title} · ${option.type}`,
}));

const notificationTitleOptions = Array.from(new Set(notificationTemplateOptions.map((option) => option.title)))
  .map((title) => ({ value: title, label: title }));

const notificationTypeLabelMap = Object.fromEntries(
  notificationTemplateOptions.map((option) => [option.type, option.title]),
) as Record<string, string>;

const PAGE_SIZE = 10;
const RECIPIENT_PAGE_SIZE = 100;
const emptyRecipientOptions: Record<RecipientType, RecipientSelectOption[]> = {
  member: [],
  miniUser: [],
  admin: [],
};
const emptyRecipientLoadingState: Record<RecipientType, boolean> = {
  member: false,
  miniUser: false,
  admin: false,
};
const statusLabelMap: Record<NotificationStatus, string> = {
  PENDING: '待发送',
  SENT: '已发送',
  READ: '已读',
  FAILED: '失败',
};

const getStatusLabel = (notification: NotificationRecord) =>
  isDeletionProcessed(notification) ? '已处理' : statusLabelMap[notification.status];

const getCompletionTimeLabel = (notification: NotificationRecord) =>
  isAccountDeletionRequest(notification) ? '处理时间' : '已读时间';

const getCompletionTimeValue = (notification: NotificationRecord) =>
  isDeletionProcessed(notification) ? getDeletionProcessedAt(notification) || notification.readAt : notification.readAt;

const getDeliveryReasonText = (notification: NotificationRecord) => {
  const reason = notification.failureReason?.trim();
  if (reason) {
    return translateDeliveryReason(reason);
  }

  return notification.status === 'FAILED' ? '未返回具体失败原因，请检查发送渠道配置、接收对象联系方式或小程序订阅消息模板。' : '';
};

const translateDeliveryReason = (reason: string) => {
  const exactReasonMap: Record<string, string> = {
    'Missing SMTP configuration or recipient email': '邮件未发送：缺少 SMTP 配置或接收人邮箱',
    'Unknown email delivery error': '未知邮件投递错误',
    'Unknown WeChat delivery failure': '未知微信订阅消息投递错误',
    'Unknown WeChat delivery error': '未知微信订阅消息投递错误',
    'Failed to fetch WeChat access token': '获取微信 access_token 失败',
    'Unknown notification delivery error': '未知通知投递错误',
    'temporary network error': '临时网络异常',
    'delivery unavailable': '投递服务不可用',
    'unexpected update failure': '通知状态更新异常',
  };
  const phraseReasonMap: Array<[string, string]> = [
    ['Invalid openid', 'OpenID 无效'],
    ['invalid openid', 'OpenID 无效'],
    ['openid is invalid', 'OpenID 无效'],
    ['template_id is invalid', '订阅消息模板 ID 无效'],
    ['invalid template_id', '订阅消息模板 ID 无效'],
    ['access_token expired', 'access_token 已过期'],
    ['invalid credential', '微信凭证无效'],
    ['invalid appid', 'AppID 无效'],
    ['user refuse to accept the msg', '用户未订阅或拒收该消息'],
    ['system error', '微信系统错误'],
    ['api unauthorized', '微信接口未授权'],
  ];

  const translatedExact = exactReasonMap[reason];
  if (translatedExact) {
    return translatedExact;
  }

  const translatedByPhrase = phraseReasonMap.reduce(
    (current, [english, chinese]) => current.split(english).join(chinese),
    reason,
  );
  if (translatedByPhrase !== reason) {
    return translatedByPhrase;
  }

  const unsupportedChannelMatch = reason.match(/^No delivery adapter configured for channel (.+)$/);
  if (unsupportedChannelMatch) {
    return `发送失败：暂未配置 ${unsupportedChannelMatch[1]} 投递服务`;
  }

  const wechatApiMatch = reason.match(/^WeChat API error (.+)$/);
  if (wechatApiMatch) {
    return `微信接口返回异常：${wechatApiMatch[1]}`;
  }

  return Object.entries(exactReasonMap).reduce(
    (current, [englishReason, chineseReason]) => current.split(englishReason).join(chineseReason),
    reason,
  );
};

const channelLabelMap: Record<NotificationChannel, string> = {
  INTERNAL: '站内通知',
  MINI_PROGRAM: '小程序',
  EMAIL: '邮件',
  SMS: '短信',
};

const typeLabelMap: Record<FilterType, string> = {
  ALL: '全部类型',
  MINI_PROGRAM_FEEDBACK: '小程序反馈',
  MEMBERSHIP_RENEWAL_REQUEST: '续费申请',
  ACCOUNT_DELETION_REQUEST: '注销申请',
};

const getInitialTypeFilter = (value: string | null): FilterType => (
  value && value in typeLabelMap ? value as FilterType : 'ALL'
);

const getInitialChannelFilter = (value: string | null): FilterChannel => (
  value === 'INTERNAL' || value === 'MINI_PROGRAM' || value === 'EMAIL' || value === 'SMS'
    ? value
    : 'ALL'
);

const recipientTypeLabelMap: Record<RecipientType, string> = {
  member: '会员',
  miniUser: '小程序用户',
  admin: '管理员',
};

const getDefaultChannelForRecipientType = (type: RecipientType): Extract<NotificationChannel, 'INTERNAL' | 'MINI_PROGRAM' | 'EMAIL'> =>
  type === 'admin' ? 'INTERNAL' : 'MINI_PROGRAM';

const recipientChannelOptions: Record<RecipientType, Array<{ label: string; value: Extract<NotificationChannel, 'INTERNAL' | 'MINI_PROGRAM' | 'EMAIL'> }>> = {
  member: [
    { label: channelLabelMap.MINI_PROGRAM, value: 'MINI_PROGRAM' },
    { label: channelLabelMap.INTERNAL, value: 'INTERNAL' },
    { label: channelLabelMap.EMAIL, value: 'EMAIL' },
  ],
  miniUser: [
    { label: channelLabelMap.MINI_PROGRAM, value: 'MINI_PROGRAM' },
    { label: channelLabelMap.INTERNAL, value: 'INTERNAL' },
  ],
  admin: [
    { label: channelLabelMap.INTERNAL, value: 'INTERNAL' },
  ],
};

const iconMap = {
  total: <BellOutlined />,
  pending: <ClockCircleOutlined />,
  sent: <SendOutlined />,
  read: <CheckCircleOutlined />,
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '-';
  }

  try {
    return new Date(value).toLocaleString('zh-CN', {
      hour12: false,
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
};

const getRecipientSummary = (notification: NotificationRecord) => {
  if (notification.memberId) {
    return {
      label: notification.member?.name || notification.memberId,
      meta: notification.member?.memberCode || notification.member?.phone || notification.memberId,
      typeLabel: '会员',
    };
  }

  if (notification.miniUserId) {
    return {
      label: notification.miniUser?.nickname || notification.miniUser?.openId || notification.miniUserId,
      meta: notification.miniUser?.phone || notification.miniUser?.openId || notification.miniUserId,
      typeLabel: '小程序用户',
    };
  }

  if (notification.adminUserId) {
    return {
      label: notification.adminUser?.displayName || notification.adminUser?.email || notification.adminUserId,
      meta: notification.adminUser?.email || notification.adminUserId,
      typeLabel: '管理员',
    };
  }

  return {
    label: '未指定接收对象',
    meta: '-',
    typeLabel: '未知',
  };
};

const buildCreatePayload = (values: ComposerFormValues): CreateNotificationData => {
  const trimmedRecipientId = values.recipientId.trim();
  const recipientPayload = {
    memberId: values.recipientType === 'member' ? trimmedRecipientId : undefined,
    miniUserId: values.recipientType === 'miniUser' ? trimmedRecipientId : undefined,
    adminUserId: values.recipientType === 'admin' ? trimmedRecipientId : undefined,
  };

  const recipientTargetCount = Object.values(recipientPayload).filter(Boolean).length;

  if (recipientTargetCount !== 1) {
    throw new Error('请选择且仅选择一个接收对象');
  }

  return {
    channel: values.channel,
    type: values.type.trim(),
    title: values.title.trim(),
    content: values.content.trim(),
    ...recipientPayload,
  };
};

const buildRecipientLabel = (primary: string, secondary?: string | null) =>
  secondary ? `${primary} · ${secondary}` : primary;

const buildRecipientSearchText = (...parts: Array<string | null | undefined>) =>
  parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(' ')
    .toLowerCase();

const mapMemberToOption = (member: Member): RecipientSelectOption => {
  const secondary = member.memberCode || member.phone || member.email || member.id;

  return {
    value: member.id,
    label: buildRecipientLabel(member.name, secondary),
    searchText: buildRecipientSearchText(member.name, member.memberCode, member.phone, member.email, member.id),
  };
};

const mapMiniUserToOption = (miniUser: MiniUserRecord): RecipientSelectOption => {
  const primary = miniUser.nickname?.trim() || miniUser.member?.name || miniUser.openId || miniUser.id;
  const secondary = miniUser.phone || miniUser.openId || miniUser.member?.memberCode || miniUser.id;

  return {
    value: miniUser.id,
    label: buildRecipientLabel(primary, secondary),
    searchText: buildRecipientSearchText(
      miniUser.nickname,
      miniUser.phone,
      miniUser.openId,
      miniUser.member?.name,
      miniUser.member?.memberCode,
      miniUser.id,
    ),
  };
};

const mapAdminToOption = (admin: AdminRecord): RecipientSelectOption => {
  const primary = admin.displayName?.trim() || admin.email || admin.id;
  const secondary = admin.email || admin.phone || admin.role?.name || admin.id;

  return {
    value: admin.id,
    label: buildRecipientLabel(primary, secondary),
    searchText: buildRecipientSearchText(admin.displayName, admin.email, admin.phone, admin.role?.name, admin.id),
  };
};

const payloadLabelMap: Record<string, string> = {
  reason: '申请原因',
  phone: '联系电话',
  nickname: '微信昵称',
  memberCode: '会员编号',
  amountCents: '申请金额',
  courseName: '课程',
  startsAt: '上课时间',
  endsAt: '结束时间',
  coachName: '教练',
  studioName: '门店',
  remark: '备注',
  cancelledAt: '取消时间',
  accountDeletionProcessedAt: '处理时间',
};

const payloadDisplayOrder = [
  'reason',
  'phone',
  'nickname',
  'memberCode',
  'amountCents',
  'courseName',
  'startsAt',
  'endsAt',
  'coachName',
  'studioName',
  'remark',
  'cancelledAt',
  'accountDeletionProcessedAt',
];

function formatPayloadValue(key: string, value: unknown) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  if (key === 'amountCents' && typeof value === 'number') {
    return `¥${(value / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  if (['startsAt', 'endsAt', 'cancelledAt', 'accountDeletionProcessedAt'].includes(key) && (typeof value === 'string' || value instanceof Date)) {
    return formatDateTime(String(value));
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
}

function getNotificationPayloadEntries(notification: NotificationRecord) {
  const payload = notification.payload;

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return [];
  }

  const entries = Object.entries(payload)
    .filter(([key]) => key in payloadLabelMap)
    .map(([key, value]) => ({
      key,
      label: payloadLabelMap[key],
      value: formatPayloadValue(key, value),
    }))
    .filter((entry) => entry.value);

  return entries.sort((left, right) => {
    const leftRank = payloadDisplayOrder.indexOf(left.key);
    const rightRank = payloadDisplayOrder.indexOf(right.key);
    const safeLeftRank = leftRank === -1 ? Number.MAX_SAFE_INTEGER : leftRank;
    const safeRightRank = rightRank === -1 ? Number.MAX_SAFE_INTEGER : rightRank;

    return safeLeftRank - safeRightRank;
  });
}

function getNotificationListDisplay(notification: NotificationRecord, recipient: ReturnType<typeof getRecipientSummary>) {
  if (isFeedbackNotification(notification)) {
    return {
      label: '用户提交反馈',
      summary: notification.content || `${recipient.label} 从小程序提交了意见反馈。`,
      actionHint: '建议进入小程序用户页核对身份并跟进',
    };
  }

  if (isAccountDeletionRequest(notification)) {
    const reason = getNotificationPayloadEntries(notification).find((entry) => entry.key === 'reason')?.value;
    return {
      label: '账号注销申请',
      summary: reason ? `用户申请注销账号，原因：${reason}` : '用户申请注销账号，需要核对会员与小程序身份后处理。',
      actionHint: isDeletionProcessed(notification) ? '注销申请已处理' : '进入小程序用户页处理',
    };
  }

  if (isMembershipRenewalRequest(notification)) {
    const amount = getNotificationPayloadEntries(notification).find((entry) => entry.key === 'amountCents')?.value;
    return {
      label: '会员续费申请',
      summary: amount ? `用户提交续费申请，待确认金额 ${amount} 与会籍计划。` : '用户提交续费申请，待后台确认收款与会籍处理。',
      actionHint: '进入财务报表处理续费交易',
    };
  }

  return {
    label: channelLabelMap[notification.channel],
    summary: notification.content || `${notification.title} 的投递记录，当前状态为${getStatusLabel(notification)}。`,
    actionHint: notification.status === 'FAILED' ? '检查投递失败原因' : '通知记录',
  };
}

export default function NotificationsPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [searchParams] = useSearchParams();
  const [composerForm] = Form.useForm<ComposerFormValues>();
  const highlightedNotificationId = searchParams.get('notificationId')?.trim() || '';
  const queryTypeFilter = getInitialTypeFilter(searchParams.get('type'));
  const queryChannelFilter = getInitialChannelFilter(searchParams.get('channel'));
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUserPermissions, setCurrentUserPermissions] = useState<string[]>([]);
  const [currentUserRoleCode, setCurrentUserRoleCode] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');
  const [channelFilter, setChannelFilter] = useState<FilterChannel>(queryChannelFilter);
  const [typeFilter, setTypeFilter] = useState<FilterType>(queryTypeFilter);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);
  const [recipientOptions, setRecipientOptions] = useState<Record<RecipientType, RecipientSelectOption[]>>(emptyRecipientOptions);
  const [recipientOptionsLoading, setRecipientOptionsLoading] = useState<Record<RecipientType, boolean>>(emptyRecipientLoadingState);
  const recipientRequestSeqRef = useRef<Record<RecipientType, number>>({ member: 0, miniUser: 0, admin: 0 });
  const notificationCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const recipientType = Form.useWatch('recipientType', composerForm) || 'member';
  const canWriteNotifications = currentUserRoleCode === 'OWNER' || hasRequiredPermissions(currentUserPermissions, ['WRITE:NOTIFICATIONS']);
  const canReadAdmins = currentUserRoleCode === 'OWNER' || hasRequiredPermissions(currentUserPermissions, ['READ:ADMINS']);

  const loadNotifications = useCallback(async (page = currentPage) => {
    try {
      setLoading(true);
      const response = await notificationsApi.getAll({
        page,
        pageSize: PAGE_SIZE,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        channel: channelFilter === 'ALL' ? undefined : channelFilter,
        type: typeFilter === 'ALL' ? undefined : typeFilter,
      });

      const nextNotifications = response.data ?? [];
      const nextMeta = response.meta ?? {
        page,
        pageSize: PAGE_SIZE,
        total: nextNotifications.length,
        totalPages: nextNotifications.length ? 1 : 0,
      };
      const currentNotifications = [...nextNotifications];

      if (highlightedNotificationId && !currentNotifications.some((item) => item.id === highlightedNotificationId)) {
        const highlightedNotification = await notificationsApi.getById(highlightedNotificationId).catch(() => null);
        const matchesType = !highlightedNotification || typeFilter === 'ALL' || highlightedNotification.type === typeFilter;
        const matchesChannel = !highlightedNotification || channelFilter === 'ALL' || highlightedNotification.channel === channelFilter;
        const matchesStatus = !highlightedNotification || statusFilter === 'ALL' || highlightedNotification.status === statusFilter;

        if (highlightedNotification && matchesType && matchesChannel && matchesStatus) {
          currentNotifications.unshift(highlightedNotification);
        }
      }

      setNotifications(currentNotifications);
      setCurrentPage(nextMeta.page);
      setTotal(nextMeta.total);
    } catch (err) {
      messageApi.error(getErrorMessage(err, '加载通知列表失败'));
    } finally {
      setLoading(false);
    }
  }, [channelFilter, currentPage, highlightedNotificationId, messageApi, statusFilter, typeFilter]);

  useEffect(() => {
    void loadNotifications(currentPage);
  }, [currentPage, loadNotifications]);

  useEffect(() => {
    if (queryTypeFilter === 'ALL' || queryTypeFilter === typeFilter) {
      return;
    }

    setCurrentPage(1);
    setTypeFilter(queryTypeFilter);
  }, [queryTypeFilter, typeFilter]);

  useEffect(() => {
    if (queryChannelFilter === 'ALL' || queryChannelFilter === channelFilter) {
      return;
    }

    setCurrentPage(1);
    setChannelFilter(queryChannelFilter);
  }, [channelFilter, queryChannelFilter]);

  useEffect(() => {
    if (!highlightedNotificationId) {
      return;
    }

    const timer = window.setTimeout(() => {
      notificationCardRefs.current[highlightedNotificationId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [highlightedNotificationId, notifications]);

  const loadRecipientOptions = useCallback(async (type: RecipientType, search?: string) => {
    const requestSeq = recipientRequestSeqRef.current[type] + 1;
    recipientRequestSeqRef.current[type] = requestSeq;

    try {
      setRecipientOptionsLoading((current) => ({
        ...current,
        [type]: true,
      }));

      if (type === 'member') {
        const members = await membersApi.getAll(1, RECIPIENT_PAGE_SIZE, { search });
        if (recipientRequestSeqRef.current[type] !== requestSeq) return;
        setRecipientOptions((current) => ({
          ...current,
          member: members.data.map(mapMemberToOption),
        }));
      } else if (type === 'miniUser') {
        const miniUsers = await miniUsersApi.getAll(1, RECIPIENT_PAGE_SIZE, search);
        if (recipientRequestSeqRef.current[type] !== requestSeq) return;
        const miniUserRows = Array.isArray((miniUsers as unknown as { data?: unknown[] }).data)
          ? (miniUsers as unknown as { data: MiniUserRecord[] }).data
          : (Array.isArray(miniUsers as unknown as unknown[]) ? (miniUsers as unknown as MiniUserRecord[]) : []);
        setRecipientOptions((current) => ({
          ...current,
          miniUser: miniUserRows.map(mapMiniUserToOption),
        }));
      } else {
        if (!canReadAdmins) {
          setRecipientOptions((current) => ({
            ...current,
            admin: [],
          }));
          return;
        }

        const admins = await adminsApi.getAll(search);
        if (recipientRequestSeqRef.current[type] !== requestSeq) return;
        setRecipientOptions((current) => ({
          ...current,
          admin: admins.map(mapAdminToOption),
        }));
      }
    } catch (err) {
      messageApi.error(getErrorMessage(err, `加载${recipientTypeLabelMap[type]}列表失败`));
    } finally {
      if (recipientRequestSeqRef.current[type] === requestSeq) {
        setRecipientOptionsLoading((current) => ({
          ...current,
          [type]: false,
        }));
      }
    }
  }, [canReadAdmins, messageApi]);

  useEffect(() => {
    if (!composerOpen) {
      return;
    }

    void loadRecipientOptions(recipientType);
  }, [composerOpen, loadRecipientOptions, recipientType]);

  useEffect(() => {
    if (composerOpen && recipientType === 'admin' && !canReadAdmins) {
      composerForm.setFieldValue('recipientType', 'member');
      composerForm.resetFields(['recipientId']);
      composerForm.setFieldValue('channel', getDefaultChannelForRecipientType('member'));
    }
  }, [canReadAdmins, composerForm, composerOpen, recipientType]);

  const summaryStats = useMemo(
    () => [
      {
        title: '通知总数',
        value: String(total),
        hint: '当前筛选结果总量',
        tone: 'mint' as const,
        icon: 'total' as const,
      },
      {
        title: '当前页待发送',
        value: String(notifications.filter((item) => item.status === 'PENDING').length),
        hint: '当前页待处理记录',
        tone: 'orange' as const,
        icon: 'pending' as const,
      },
      {
        title: '当前页已发送',
        value: String(notifications.filter((item) => item.status === 'SENT').length),
        hint: '等待阅读确认',
        tone: 'violet' as const,
        icon: 'sent' as const,
      },
      {
        title: '当前页已确认',
        value: String(notifications.filter((item) => item.status === 'READ').length),
        hint: '已读或已处理',
        tone: 'pink' as const,
        icon: 'read' as const,
      },
    ],
    [notifications, total],
  );

  const notificationFilterLabels = [
    statusFilter !== 'ALL' ? `状态：${statusLabelMap[statusFilter]}` : null,
    channelFilter !== 'ALL' ? `渠道：${channelLabelMap[channelFilter]}` : null,
    typeFilter !== 'ALL' ? `类型：${typeLabelMap[typeFilter]}` : null,
  ].filter(Boolean);

  const feedbackCount = notifications.filter(isFeedbackNotification).length;

  const notificationResultSummary = notificationFilterLabels.length
    ? `已按${notificationFilterLabels.join('、')}筛选，当前匹配 ${total} 条通知。`
    : `当前共 ${total} 条通知，按待发送、已发送、已确认三个阶段跟进。`;

  const openComposerModal = () => {
    if (!canWriteNotifications) {
      messageApi.warning('当前账号没有通知写入权限');
      return;
    }

    composerForm.setFieldsValue({
      recipientType: 'member',
      recipientId: '',
      channel: getDefaultChannelForRecipientType('member'),
      type: 'SYSTEM_NOTICE',
      title: '系统通知',
      content: '',
    });
    setComposerOpen(true);
  };

  const showMiniProgramFeedback = () => {
    setCurrentPage(1);
    setStatusFilter('ALL');
    setChannelFilter('INTERNAL');
    setTypeFilter('MINI_PROGRAM_FEEDBACK');
  };

  const closeComposerModal = () => {
    setComposerOpen(false);
    composerForm.resetFields();
  };

  const handleCreateNotification = async () => {
    if (!canWriteNotifications) {
      messageApi.warning('当前账号没有通知写入权限');
      return;
    }

    let values: ComposerFormValues;

    try {
      values = await composerForm.validateFields();
    } catch {
      return;
    }

    try {
      setSaving(true);
      const payload = buildCreatePayload(values);
      await notificationsApi.create(payload);
      messageApi.success('通知已创建并提交发送');
      closeComposerModal();

      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        await loadNotifications(1);
      }
    } catch (err) {
      messageApi.error(getErrorMessage(err, '创建通知失败'));
    } finally {
      setSaving(false);
    }
  };

  const currentRecipientPlaceholder = recipientType === 'member'
    ? '搜索并选择会员'
    : recipientType === 'miniUser'
      ? '搜索并选择小程序用户'
      : '搜索并选择管理员';
  const currentRecipientOptions = recipientOptions[recipientType];
  const currentRecipientLoading = recipientOptionsLoading[recipientType];

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const me = await authApi.getMe();
        setCurrentUserPermissions(me.role?.permissions || []);
        setCurrentUserRoleCode(me.role?.code || '');
      } catch {
        setCurrentUserPermissions([]);
        setCurrentUserRoleCode('');
      }
    };

    void fetchCurrentUser();
  }, []);

  if (loading && notifications.length === 0) {
    return (
      <div className={`${pageCls.page} ${pageCls.workPage}`}>
        {contextHolder}
        <PageHeader
          title="通知管理"
          subtitle="查看通知记录、筛选状态与渠道，并支持最小化手动发送。"
          extra={canWriteNotifications ? <ActionButton icon={<PlusOutlined />} onClick={openComposerModal}>新建通知</ActionButton> : null}
        />
        <div className={`${pageCls.centeredState} ${pageCls.centeredStateTall}`}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  return (
    <div className={`${pageCls.page} ${pageCls.workPage}`}>
      {contextHolder}

      <PageHeader
        title="通知管理"
        extra={canWriteNotifications ? <ActionButton icon={<PlusOutlined />} onClick={openComposerModal}>新建通知</ActionButton> : null}
      />

      <div className={pageCls.heroGrid}>
        {summaryStats.map((item) => (
          <StatCard key={item.title} {...item} icon={iconMap[item.icon]} />
        ))}
      </div>

      <SectionCard title="通知队列">
        <Spin spinning={loading}>
          <div className={pageCls.sectionContentStack}>
          <div className={pageCls.sectionSummaryRow}>
            <div className={pageCls.sectionSummaryText}>{notificationResultSummary}</div>
            <div className={pageCls.statusMetaWrap}>
              {feedbackCount > 0 ? <span className={pageCls.sectionMetaPill}>当前页反馈 {feedbackCount} 条</span> : null}
              <span className={pageCls.sectionMetaPill}>待发送</span>
              <span className={pageCls.sectionMetaPill}>已发送</span>
              <span className={pageCls.sectionMetaPill}>已确认</span>
            </div>
          </div>

          <div className={pageCls.toolbar}>
            <div className={`${pageCls.toolbarLeft} ${styles.queueFilters}`}>
              <Select
                value={statusFilter}
                className={`${pageCls.settingsInput} ${pageCls.toolbarSelect} ${styles.queueFilterSelect}`}
                options={[
                  { label: '全部状态', value: 'ALL' },
                  { label: statusLabelMap.PENDING, value: 'PENDING' },
                  { label: statusLabelMap.SENT, value: 'SENT' },
                  { label: statusLabelMap.READ, value: 'READ' },
                  { label: statusLabelMap.FAILED, value: 'FAILED' },
                ]}
                onChange={(value: FilterStatus) => {
                  setCurrentPage(1);
                  setStatusFilter(value);
                }}
              />
              <Select
                value={channelFilter}
                className={`${pageCls.settingsInput} ${pageCls.toolbarSelect} ${styles.queueFilterSelect}`}
                options={[
                  { label: '全部渠道', value: 'ALL' },
                  { label: channelLabelMap.INTERNAL, value: 'INTERNAL' },
                  { label: channelLabelMap.MINI_PROGRAM, value: 'MINI_PROGRAM' },
                  { label: channelLabelMap.EMAIL, value: 'EMAIL' },
                  { label: channelLabelMap.SMS, value: 'SMS' },
                ]}
                onChange={(value: FilterChannel) => {
                  setCurrentPage(1);
                  setChannelFilter(value);
                }}
              />
              <Select
                value={typeFilter}
                className={`${pageCls.settingsInput} ${pageCls.toolbarSelect} ${styles.queueFilterSelect}`}
                options={(
                  Object.keys(typeLabelMap) as FilterType[]
                ).map((key) => ({ label: typeLabelMap[key], value: key }))}
                onChange={(value: FilterType) => {
                  setCurrentPage(1);
                  setTypeFilter(value);
                }}
              />
              <Button type="text" className={`${widgetCls.dashboardCardAction} ${styles.queueQuickAction}`} onClick={showMiniProgramFeedback}>小程序反馈</Button>
            </div>
          </div>

          {notifications.length ? (
            <>
              <div className={`${widgetCls.recordList} ${pageCls.sectionListStack}`}>
                {notifications.map((notification) => {
                  const recipient = getRecipientSummary(notification);
                  const listDisplay = getNotificationListDisplay(notification, recipient);
                  const payloadEntries = getNotificationPayloadEntries(notification);
                  const highlighted = highlightedNotificationId === notification.id;

                  return (
                    <div
                      key={notification.id}
                      ref={(node) => {
                        notificationCardRefs.current[notification.id] = node;
                      }}
                      className={`${styles.notificationCard} ${highlighted ? styles.notificationCardHighlighted : ''}`}
                    >
                      <div className={styles.notificationMain}>
                        <div className={styles.notificationHeader}>
                          <div className={styles.notificationTitleWrap}>
                            <span className={styles.typePill}>{notificationTypeLabelMap[notification.type] || notification.title || '通知'}</span>
                            <h3 className={styles.notificationTitle}>{notification.title}</h3>
                          </div>
                          <StatusTag status={getStatusLabel(notification)} />
                        </div>

                        <div className={styles.notificationMetaRow}>
                          <span className={styles.channelPill}>{channelLabelMap[notification.channel]}</span>
                          <span className={styles.recipientPill}>{recipient.typeLabel} · {recipient.label}</span>
                          <span className={styles.timestampPill}>创建于 {formatDateTime(notification.createdAt)}</span>
                        </div>

                        <div className={styles.notificationBrief}>
                          <div className={styles.notificationBriefHead}>
                            <span className={styles.notificationBriefLabel}>{listDisplay.label}</span>
                            <span className={styles.notificationActionHint}>{listDisplay.actionHint}</span>
                          </div>
                          <p className={styles.notificationPreview}>{listDisplay.summary}</p>
                        </div>
                        {payloadEntries.length > 0 ? (
                          <div className={styles.notificationPayloadPills}>
                            {payloadEntries.map((entry) => (
                              <span key={entry.key} className={styles.notificationPayloadPill}>
                                {entry.label}：{entry.value}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {notification.status === 'FAILED' || notification.failureReason ? (
                          <div className={notification.status === 'FAILED' ? styles.failureReason : styles.deliveryNote}>
                            <span>{notification.status === 'FAILED' ? '失败原因' : '发送说明'}：</span>
                            {getDeliveryReasonText(notification)}
                          </div>
                        ) : null}
                      </div>

                      <aside className={styles.notificationAside}>
                        <Descriptions column={1} size="small">
                          <Descriptions.Item label="接收对象">{recipient.meta}</Descriptions.Item>
                          <Descriptions.Item label="已发送">{formatDateTime(notification.sentAt)}</Descriptions.Item>
                          <Descriptions.Item label={getCompletionTimeLabel(notification)}>{formatDateTime(getCompletionTimeValue(notification))}</Descriptions.Item>
                        </Descriptions>
                      </aside>
                    </div>
                  );
                })}
              </div>

              <div className={`${pageCls.sectionPagination} ${styles.notificationPagination}`}>
                <Pagination
                  current={currentPage}
                  pageSize={PAGE_SIZE}
                  total={total}
                  onChange={setCurrentPage}
                  showSizeChanger={false}
                />
              </div>
            </>
          ) : (
            <div className={pageCls.sectionEmptyState}>
              <EmptyState
                title="暂无通知记录"
                description="当前筛选条件下暂无通知。"
                actionText={canWriteNotifications ? '新建通知' : undefined}
                onAction={canWriteNotifications ? openComposerModal : undefined}
              />
            </div>
          )}
          </div>
        </Spin>
      </SectionCard>

      <Modal
        className={pageCls.crudModal}
        title="新建通知"
        open={composerOpen}
        width={CRUD_MODAL_WIDTH}
        onCancel={closeComposerModal}
        onOk={handleCreateNotification}
        confirmLoading={saving}
        okText="立即发送"
        cancelText="取消"
        zIndex={1600}
        forceRender
        destroyOnHidden
      >
        <Form form={composerForm} className={pageCls.crudModalForm} layout="vertical">
          <Form.Item
            name="recipientType"
            label="接收对象类型"
            rules={[{ required: true, message: '请选择接收对象类型' }]}
          >
            <Select
              className={pageCls.settingsInput}
              onChange={(nextRecipientType: RecipientType) => {
                composerForm.resetFields(['recipientId']);
                composerForm.setFieldValue('channel', getDefaultChannelForRecipientType(nextRecipientType));
              }}
              options={(Object.keys(recipientTypeLabelMap) as RecipientType[])
                .filter((key) => key !== 'admin' || canReadAdmins)
                .map((key) => ({ label: recipientTypeLabelMap[key], value: key }))}
            />
          </Form.Item>

          <Form.Item
            name="recipientId"
            label="接收对象"
            rules={[{ required: true, message: '请选择接收对象' }]}
            extra={currentRecipientLoading
              ? `正在加载${recipientTypeLabelMap[recipientType]}列表...`
              : '仅向当前选择对象发送。'}
          >
            <Select
              allowClear
              showSearch
              loading={currentRecipientLoading}
              className={pageCls.settingsInput}
              placeholder={currentRecipientPlaceholder}
              options={currentRecipientOptions}
              filterOption={false}
              onSearch={(value) => {
                void loadRecipientOptions(recipientType, value.trim() || undefined);
              }}
              notFoundContent={currentRecipientLoading ? <Spin size="small" /> : `暂无可选${recipientTypeLabelMap[recipientType]}`}
            />
          </Form.Item>

          <Form.Item
            name="channel"
            label="发送渠道"
            rules={[{ required: true, message: '请选择发送渠道' }]}
          >
            <Select
              className={pageCls.settingsInput}
              options={recipientChannelOptions[recipientType]}
            />
          </Form.Item>

          <Form.Item name="type" label="消息类型" rules={[{ required: true, message: '请选择消息类型' }]}>
            <Select
              showSearch
              className={pageCls.settingsInput}
              placeholder="请选择消息类型"
              options={notificationTypeOptions}
              optionFilterProp="label"
              onChange={(value) => {
                const template = notificationTemplateOptions.find((option) => option.type === value);
                if (template) {
                  composerForm.setFieldValue('title', template.title);
                }
              }}
            />
          </Form.Item>

          <Form.Item name="title" label="通知标题" rules={[{ required: true, message: '请选择通知标题' }]}> 
            <Select
              showSearch
              className={pageCls.settingsInput}
              placeholder="请选择通知标题"
              options={notificationTitleOptions}
              optionFilterProp="label"
            />
          </Form.Item>

          <Form.Item name="content" label="通知内容" rules={[{ required: true, message: '请输入通知内容' }]}> 
            <Input.TextArea className={pageCls.settingsInput} rows={5} placeholder="请输入要发送的通知内容" />
          </Form.Item>
        </Form>
      </Modal>

    </div>
  );
}
