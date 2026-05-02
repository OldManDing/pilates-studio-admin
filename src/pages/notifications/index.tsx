import {
  BellOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  MailOutlined,
  PlusOutlined,
  SendOutlined,
} from '@ant-design/icons';
import {
  Button,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  Pagination,
  Select,
  Spin,
  message,
} from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { CRUD_MODAL_WIDTH, NARROW_DETAIL_DRAWER_WIDTH } from '@/styles/dimensions';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import { getErrorMessage } from '@/utils/errors';
import { hasRequiredPermissions } from '@/utils/menu';
import styles from './index.module.css';

type RecipientType = 'member' | 'miniUser' | 'admin';

const isFeedbackNotification = (notification: NotificationRecord) => notification.type === 'MINI_PROGRAM_FEEDBACK';
const isAccountDeletionRequest = (notification: NotificationRecord) => notification.type === 'ACCOUNT_DELETION_REQUEST';
const isOperationalRequestNotification = (notification: NotificationRecord) =>
  isFeedbackNotification(notification) || isAccountDeletionRequest(notification);

const canMarkAsRead = (notification: NotificationRecord) =>
  notification.status === 'SENT' || (isOperationalRequestNotification(notification) && notification.status === 'PENDING');

const getMarkAsReadLabel = (notification: NotificationRecord) => {
  if (notification.status === 'READ') return isOperationalRequestNotification(notification) ? '已处理' : '已读';
  if (isOperationalRequestNotification(notification)) return '标记已处理';
  if (notification.status === 'SENT') return '标记已读';
  if (notification.status === 'PENDING') return '待发送';
  return '发送失败';
};
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

const recipientTypeLabelMap: Record<RecipientType, string> = {
  member: '会员',
  miniUser: '小程序用户',
  admin: '管理员',
};

const recipientChannelOptions: Record<RecipientType, Array<{ label: string; value: Extract<NotificationChannel, 'INTERNAL' | 'MINI_PROGRAM' | 'EMAIL'> }>> = {
  member: [
    { label: channelLabelMap.INTERNAL, value: 'INTERNAL' },
    { label: channelLabelMap.MINI_PROGRAM, value: 'MINI_PROGRAM' },
    { label: channelLabelMap.EMAIL, value: 'EMAIL' },
  ],
  miniUser: [
    { label: channelLabelMap.INTERNAL, value: 'INTERNAL' },
    { label: channelLabelMap.MINI_PROGRAM, value: 'MINI_PROGRAM' },
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

export default function NotificationsPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [composerForm] = Form.useForm<ComposerFormValues>();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [markingNotificationId, setMarkingNotificationId] = useState<string | null>(null);
  const [processingDeletionNotificationId, setProcessingDeletionNotificationId] = useState<string | null>(null);
  const [currentUserPermissions, setCurrentUserPermissions] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');
  const [channelFilter, setChannelFilter] = useState<FilterChannel>('ALL');
  const [typeFilter, setTypeFilter] = useState<FilterType>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailNotification, setDetailNotification] = useState<NotificationRecord | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [recipientOptions, setRecipientOptions] = useState<Record<RecipientType, RecipientSelectOption[]>>(emptyRecipientOptions);
  const [recipientOptionsLoading, setRecipientOptionsLoading] = useState<Record<RecipientType, boolean>>(emptyRecipientLoadingState);
  const recipientRequestSeqRef = useRef<Record<RecipientType, number>>({ member: 0, miniUser: 0, admin: 0 });
  const detailRequestSeqRef = useRef(0);
  const recipientType = Form.useWatch('recipientType', composerForm) || 'member';

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

      setNotifications(nextNotifications);
      setCurrentPage(nextMeta.page);
      setTotal(nextMeta.total);
    } catch (err) {
      messageApi.error(getErrorMessage(err, '加载通知列表失败'));
    } finally {
      setLoading(false);
    }
  }, [channelFilter, currentPage, messageApi, statusFilter, typeFilter]);

  useEffect(() => {
    void loadNotifications(currentPage);
  }, [currentPage, loadNotifications]);

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
  }, [messageApi]);

  useEffect(() => {
    if (!composerOpen) {
      return;
    }

    void loadRecipientOptions(recipientType);
  }, [composerOpen, loadRecipientOptions, recipientType]);

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
        title: '当前页已读',
        value: String(notifications.filter((item) => item.status === 'READ').length),
        hint: '已完成确认',
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
    : `当前共 ${total} 条通知，按待发送、已发送、已读三个阶段跟进。`;

  const openComposerModal = () => {
    composerForm.setFieldsValue({
      recipientType: 'member',
      recipientId: '',
      channel: 'INTERNAL',
      type: '',
      title: '',
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

  const openDetailDrawer = async (notification: NotificationRecord) => {
    const requestSeq = detailRequestSeqRef.current + 1;
    detailRequestSeqRef.current = requestSeq;
    setDetailOpen(true);
    setDetailNotification(notification);

    try {
      setDetailLoading(true);
      const detail = await notificationsApi.getById(notification.id);
      if (detailRequestSeqRef.current !== requestSeq) return;
      setDetailNotification(detail);
    } catch (err) {
      if (detailRequestSeqRef.current !== requestSeq) return;
      messageApi.error(getErrorMessage(err, '加载通知详情失败'));
    } finally {
      if (detailRequestSeqRef.current === requestSeq) {
        setDetailLoading(false);
      }
    }
  };

  const handleMarkAsRead = async (notification: NotificationRecord) => {
    if (notification.status === 'READ') {
      return;
    }

    try {
      setMarkingNotificationId(notification.id);
      const updated = await notificationsApi.markAsRead(notification.id);
      messageApi.success(isFeedbackNotification(notification) ? '反馈已标记为已处理' : '通知已标记为已读');

      if (detailNotification?.id === updated.id) {
        setDetailNotification(updated);
      }

      await loadNotifications(currentPage);
    } catch (err) {
      messageApi.error(getErrorMessage(err, '标记已读失败'));
    } finally {
      setMarkingNotificationId(null);
    }
  };

  const handleProcessDeletionRequest = async (notification: NotificationRecord) => {
    if (!canProcessDeletionRequest) {
      messageApi.error('当前账号没有处理注销申请的权限');
      return;
    }

    try {
      setProcessingDeletionNotificationId(notification.id);
      const updated = await notificationsApi.processAccountDeletionRequest(notification.id);
      messageApi.success('已停用账号并标记申请为已处理');

      if (detailNotification?.id === updated.id) {
        setDetailNotification(updated);
      }

      await loadNotifications(currentPage);
    } catch (err) {
      messageApi.error(getErrorMessage(err, '处理注销申请失败'));
    } finally {
      setProcessingDeletionNotificationId(null);
    }
  };

  const currentRecipientPlaceholder = recipientType === 'member'
    ? '搜索并选择会员'
    : recipientType === 'miniUser'
      ? '搜索并选择小程序用户'
      : '搜索并选择管理员';
  const currentRecipientOptions = recipientOptions[recipientType];
  const currentRecipientLoading = recipientOptionsLoading[recipientType];
  const canProcessDeletionRequest = hasRequiredPermissions(currentUserPermissions, ['WRITE:MEMBERS', 'WRITE:MINI_USERS', 'WRITE:NOTIFICATIONS']);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const me = await authApi.getMe();
        setCurrentUserPermissions(me.role?.permissions || []);
      } catch {
        setCurrentUserPermissions([]);
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
          extra={<ActionButton icon={<PlusOutlined />} onClick={openComposerModal}>新建通知</ActionButton>}
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
        extra={<ActionButton icon={<PlusOutlined />} onClick={openComposerModal}>新建通知</ActionButton>}
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
              <span className={pageCls.sectionMetaPill}>已读</span>
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

                  return (
                    <div key={notification.id} className={styles.notificationCard}>
                      <div className={styles.notificationMain}>
                        <div className={styles.notificationHeader}>
                          <div className={styles.notificationTitleWrap}>
                            <span className={styles.typePill}>{notification.type}</span>
                            <h3 className={styles.notificationTitle}>{notification.title}</h3>
                          </div>
                          <StatusTag status={statusLabelMap[notification.status]} />
                        </div>

                        <div className={styles.notificationMetaRow}>
                          <span className={styles.channelPill}>{channelLabelMap[notification.channel]}</span>
                          <span className={styles.recipientPill}>{recipient.typeLabel} · {recipient.label}</span>
                          <span className={styles.timestampPill}>创建于 {formatDateTime(notification.createdAt)}</span>
                        </div>

                        <p className={styles.notificationPreview}>{notification.content}</p>
                      </div>

                      <aside className={styles.notificationAside}>
                        <Descriptions column={1} size="small">
                          <Descriptions.Item label="接收对象">{recipient.meta}</Descriptions.Item>
                          <Descriptions.Item label="已发送">{formatDateTime(notification.sentAt)}</Descriptions.Item>
                          <Descriptions.Item label="已读时间">{formatDateTime(notification.readAt)}</Descriptions.Item>
                        </Descriptions>

                        <div className={styles.notificationActions}>
                          <Button
                            size="large"
                            className={pageCls.cardActionSecondary}
                            icon={<EyeOutlined />}
                            onClick={() => openDetailDrawer(notification)}
                          >
                            查看详情
                          </Button>
                          <Button
                            type="primary"
                            size="large"
                            className={pageCls.cardActionPrimary}
                            icon={<CheckCircleOutlined />}
                            loading={markingNotificationId === notification.id}
                            disabled={!canMarkAsRead(notification) || (markingNotificationId !== null && markingNotificationId !== notification.id)}
                            onClick={() => handleMarkAsRead(notification)}
                          >
                            {getMarkAsReadLabel(notification)}
                          </Button>
                          {isAccountDeletionRequest(notification) && canProcessDeletionRequest ? (
                            <Button
                              size="large"
                              className={pageCls.cardActionSecondary}
                              loading={processingDeletionNotificationId === notification.id}
                              disabled={notification.status === 'READ' || (processingDeletionNotificationId !== null && processingDeletionNotificationId !== notification.id)}
                              onClick={() => handleProcessDeletionRequest(notification)}
                            >
                              停用账号
                            </Button>
                          ) : null}
                        </div>
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
                actionText="新建通知"
                onAction={openComposerModal}
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
              onChange={() => {
                composerForm.resetFields(['recipientId']);
                composerForm.setFieldValue('channel', 'INTERNAL');
              }}
              options={(
                Object.keys(recipientTypeLabelMap) as RecipientType[]
              ).map((key) => ({ label: recipientTypeLabelMap[key], value: key }))}
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

          <Form.Item name="type" label="通知类型" rules={[{ required: true, message: '请输入通知类型' }]}> 
            <Input className={pageCls.settingsInput} placeholder="请输入通知类型" />
          </Form.Item>

          <Form.Item name="title" label="通知标题" rules={[{ required: true, message: '请输入通知标题' }]}> 
            <Input className={pageCls.settingsInput} placeholder="例如：课程提醒" />
          </Form.Item>

          <Form.Item name="content" label="通知内容" rules={[{ required: true, message: '请输入通知内容' }]}> 
            <Input.TextArea className={pageCls.settingsInput} rows={5} placeholder="请输入要发送的通知内容" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        rootClassName={pageCls.responsiveDetailDrawer}
        open={detailOpen}
        width={NARROW_DETAIL_DRAWER_WIDTH}
        title={detailNotification?.title || '通知详情'}
        onClose={() => {
          setDetailOpen(false);
          setDetailNotification(null);
        }}
        extra={detailNotification ? (
          <div style={{ display: 'flex', gap: 8 }}>
            {isAccountDeletionRequest(detailNotification) && canProcessDeletionRequest ? (
              <Button
                loading={processingDeletionNotificationId === detailNotification.id}
                disabled={detailNotification.status === 'READ' || (processingDeletionNotificationId !== null && processingDeletionNotificationId !== detailNotification.id)}
                onClick={() => handleProcessDeletionRequest(detailNotification)}
              >
                停用账号
              </Button>
            ) : null}
            <Button
              type="primary"
              icon={<MailOutlined />}
              loading={markingNotificationId === detailNotification.id}
              disabled={!canMarkAsRead(detailNotification) || (markingNotificationId !== null && markingNotificationId !== detailNotification.id)}
              onClick={() => handleMarkAsRead(detailNotification)}
            >
              {getMarkAsReadLabel(detailNotification)}
            </Button>
          </div>
        ) : null}
      >
        {detailLoading && !detailNotification ? (
          <div className={pageCls.centeredStatePadded}><Spin /></div>
        ) : detailNotification ? (
          <div className={styles.drawerStack}>
            <div className={styles.overviewCard}>
              <div className={styles.overviewTop}>
                <div>
                  <span className={styles.typePill}>{detailNotification.type}</span>
                  <h2 className={styles.overviewTitle}>{detailNotification.title}</h2>
                </div>
                <StatusTag status={statusLabelMap[detailNotification.status]} />
              </div>

              <div className={styles.overviewMetaGrid}>
                <div className={styles.overviewMetaCard}>
                  <div className={styles.overviewMetaLabel}>发送渠道</div>
                  <div className={styles.overviewMetaValue}>{channelLabelMap[detailNotification.channel]}</div>
                </div>
                <div className={styles.overviewMetaCard}>
                  <div className={styles.overviewMetaLabel}>接收对象</div>
                  <div className={styles.overviewMetaValue}>{getRecipientSummary(detailNotification).typeLabel} · {getRecipientSummary(detailNotification).label}</div>
                </div>
                <div className={styles.overviewMetaCard}>
                  <div className={styles.overviewMetaLabel}>创建时间</div>
                  <div className={styles.overviewMetaValue}>{formatDateTime(detailNotification.createdAt)}</div>
                </div>
                <div className={styles.overviewMetaCard}>
                  <div className={styles.overviewMetaLabel}>已读时间</div>
                  <div className={styles.overviewMetaValue}>{formatDateTime(detailNotification.readAt)}</div>
                </div>
              </div>
            </div>

            <SectionCard title="通知内容">
              <div className={styles.contentBlock}>
                <div className={styles.contentLabel}>正文</div>
                <div className={styles.contentText}>{detailNotification.content}</div>
              </div>
            </SectionCard>

            <SectionCard title="投递状态">
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="发送时间">{formatDateTime(detailNotification.sentAt)}</Descriptions.Item>
                <Descriptions.Item label="更新时间">{formatDateTime(detailNotification.updatedAt)}</Descriptions.Item>
                <Descriptions.Item label="当前状态">{statusLabelMap[detailNotification.status]}</Descriptions.Item>
              </Descriptions>
            </SectionCard>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
