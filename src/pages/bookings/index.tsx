import { CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Col, Descriptions, Drawer, Form, Modal, Pagination, Popconfirm, Row, Select, Spin, message } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ActionButton from '@/components/ActionButton';
import EmptyState from '@/components/EmptyState';
import FilterModalFooter from '@/components/FilterModalFooter';
import MemberAvatar from '@/components/MemberAvatar';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatusTag from '@/components/StatusTag';
import { CRUD_MODAL_WIDTH, DETAIL_DRAWER_WIDTH } from '@/styles/dimensions';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import { bookingStatusLabels, memberStatusLabels, type BookingStatus } from '@/types';
import { bookingsApi, type Booking } from '@/services/bookings';
import { authApi } from '@/services/auth';
import { type Member } from '@/services/members';
import { courseSessionsApi, type CourseSession } from '@/services/courseSessions';
import { getErrorMessage } from '@/utils/errors';
import { formatLocalDateParam } from '@/utils/date';
import { hasRequiredPermissions } from '@/utils/menu';
import { getToneFromName } from '@/utils/tone';
import { useDebouncedValue } from '@/utils/useDebouncedValue';
import styles from './index.module.css';
import {
  BookingHeroStats,
  BookingListCard,
  BookingPeriodSelector,
} from './components';

const iconMap = {
  calendar: <CalendarOutlined />,
  schedule: <CalendarOutlined />,
  clock: <ClockCircleOutlined />,
  check: <CheckCircleOutlined />
};

type BookingPeriod = '今天' | '明天' | '本周';
type BookingFormValues = {
  memberId: string;
  sessionId: string;
  status: BookingStatus;
};
type BookingFilterDraft = {
  status: BookingStatus | '全部';
};

const bookingStatusOptions: BookingStatus[] = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
const bookingEditableStatusOptions: BookingStatus[] = ['PENDING', 'CONFIRMED', 'CANCELLED'];
const bookingPeriods: BookingPeriod[] = ['今天', '明天', '本周'];

const getBookingFormStatusOptions = (currentStatus?: BookingStatus) => {
  const options = [...bookingEditableStatusOptions];
  if (currentStatus && !options.includes(currentStatus)) {
    options.push(currentStatus);
  }

  return options.map((item) => ({
    label: bookingStatusLabels[item],
    value: item,
    disabled: item === 'COMPLETED' || item === 'NO_SHOW',
  }));
};

const formatDateTime = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

const formatTime = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
};

const formatMonthDay = (date: Date) => {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return '';
  }
};

const formatWeekday = (date: Date) => {
  try {
    return new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(date);
  } catch {
    return '';
  }
};

const formatBookingDateLabel = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    return `${formatMonthDay(date)} ${formatWeekday(date)}`;
  } catch {
    return dateStr;
  }
};

const getBookingPeriodMeta = (period: BookingPeriod) => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 6);

  if (period === '今天') {
    return `${formatMonthDay(today)} ${formatWeekday(today)}`;
  }

  if (period === '明天') {
    return `${formatMonthDay(tomorrow)} ${formatWeekday(tomorrow)}`;
  }

  return `${formatMonthDay(today)} - ${formatMonthDay(weekEnd)}`;
};


const getStatusActionLabel = (status: BookingStatus) => {
  if (status === 'PENDING') return '确认';
  if (status === 'COMPLETED') return '查看详情';
  if (status === 'CANCELLED') return '查看详情';
  if (status === 'NO_SHOW') return '查看详情';
  return '查看详情';
};

const getNextBookingStatus = (status: BookingStatus): BookingStatus => {
  if (status === 'PENDING') return 'CONFIRMED';
  return status;
};

const canAdvanceBookingStatus = (status: BookingStatus) => status === 'PENDING';

export default function BookingsPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<BookingFormValues>();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<BookingPeriod>('今天');
  const [searchValue, setSearchValue] = useState('');
  const debouncedSearchValue = useDebouncedValue(searchValue, 350);
  const [statusFilter, setStatusFilter] = useState<BookingStatus | '全部'>('全部');
  const [filterDraft, setFilterDraft] = useState<BookingFilterDraft>({ status: '全部' });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isMemberLoading, setIsMemberLoading] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [statusUpdatingBookingId, setStatusUpdatingBookingId] = useState<string | null>(null);
  const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);
  const [currentUserPermissions, setCurrentUserPermissions] = useState<string[]>([]);
  const [currentUserRoleCode, setCurrentUserRoleCode] = useState('');
  const [bookingSummary, setBookingSummary] = useState({
    todayCount: 0,
    weekTotal: 0,
    pendingCount: 0,
    confirmedCount: 0,
    completedCount: 0,
    cancelledCount: 0,
    noShowCount: 0,
  });
  const canWriteBookings = currentUserRoleCode === 'OWNER' || hasRequiredPermissions(currentUserPermissions, ['WRITE:BOOKINGS']);

  useEffect(() => {
    void authApi.getMe()
      .then((me) => {
        setCurrentUserPermissions(me.role?.permissions || []);
        setCurrentUserRoleCode(me.role?.code || '');
      })
      .catch(() => {
        setCurrentUserPermissions([]);
        setCurrentUserRoleCode('');
      });
  }, []);

  const fetchAllMembers = useCallback(async () => {
    const data = await bookingsApi.getMemberOptions();
    return data as Member[];
  }, []);

  const loadCreateFormOptions = useCallback(async () => {
    try {
      setIsMemberLoading(true);
      setIsSessionLoading(true);

      const [membersRes, sessionsRes] = await Promise.all([
        fetchAllMembers(),
        courseSessionsApi.getUpcoming().catch(() => []),
      ]);

      setMembers(membersRes);
      setSessions(sessionsRes);
    } catch (err) {
      messageApi.error(getErrorMessage(err, '加载新增预约选项失败，请稍后重试'));
    } finally {
      setIsMemberLoading(false);
      setIsSessionLoading(false);
    }
  }, [fetchAllMembers, messageApi]);

  const loadBookingsData = useCallback(async (page = 1) => {
    const now = new Date();
    const startDate = new Date(now);
    const endDate = new Date(now);

    if (periodFilter === '今天') {
      endDate.setDate(endDate.getDate());
    } else if (periodFilter === '明天') {
      startDate.setDate(startDate.getDate() + 1);
      endDate.setDate(endDate.getDate() + 1);
    } else {
      endDate.setDate(endDate.getDate() + 6);
    }

    const from = formatLocalDateParam(startDate);
    const to = formatLocalDateParam(endDate);
    const queryParams = {
      from,
      to,
      status: statusFilter === '全部' ? undefined : statusFilter,
      search: debouncedSearchValue.trim() || undefined,
    };

    const [bookingsRes, bookingSummaryRes, membersRes, sessionsRes] = await Promise.all([
      bookingsApi.getAll({
        page,
        pageSize,
        ...queryParams,
      }),
      bookingsApi.getSummary(queryParams),
      fetchAllMembers(),
      courseSessionsApi.getUpcoming().catch(() => []),
    ]);

    setBookings(bookingsRes.data);
    setBookingSummary(bookingSummaryRes);
    setCurrentPage(bookingsRes.meta.page);
    setMembers(membersRes);
    setSessions(sessionsRes);
    setTotal(bookingsRes.meta.total);
  }, [debouncedSearchValue, fetchAllMembers, pageSize, periodFilter, statusFilter]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        await loadBookingsData(currentPage);
      } catch (err) {
        messageApi.error('获取预约数据失败');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentPage, loadBookingsData, messageApi]);

  const bookingStats = useMemo(() => [
    {
      key: 'today',
      title: '今日预约',
      value: String(bookingSummary.todayCount),
      hint: `${bookingSummary.pendingCount} 待确认`,
      tone: 'mint' as const,
      icon: iconMap.calendar,
    },
    {
      key: 'week',
      title: '本周预约',
      value: String(bookingSummary.weekTotal),
      hint: `${bookingSummary.confirmedCount} 已确认 · ${bookingSummary.cancelledCount} 已取消`,
      tone: 'violet' as const,
      icon: iconMap.schedule,
    },
    {
      key: 'pending',
      title: '待确认',
      value: String(bookingSummary.pendingCount),
      hint: '需及时处理',
      tone: 'orange' as const,
      icon: iconMap.clock,
    },
    {
      key: 'checkin',
      title: '已完成',
      value: String(bookingSummary.completedCount),
      hint: `${bookingSummary.noShowCount} 未到场`,
      tone: 'pink' as const,
      icon: iconMap.check,
    },
  ], [bookingSummary]);

  const memberOptions = useMemo(
    () => members.map((member) => {
      const isBookable = member.status === 'ACTIVE';
      const statusText = memberStatusLabels[member.status];

      return {
        label: `${member.name} (${member.phone})${isBookable ? '' : ` · ${statusText}`}`,
        value: member.id,
        disabled: !isBookable,
      };
    }),
    [members],
  );

  const bookingPeriodItems = useMemo(() => bookingPeriods.map((period) => ({
    value: period,
    label: period,
    metaText: getBookingPeriodMeta(period),
    active: periodFilter === period,
  })), [periodFilter]);

  const bookingSelectorSubtitle = useMemo(() => {
    if (statusFilter === '全部') {
      return '切换预约日期，并按会员、课程或编号快速定位记录。';
    }

    return `当前正在查看${bookingStatusLabels[statusFilter]}状态的预约记录。`;
  }, [statusFilter]);

  const bookingFilterLabels = [
    `日期：${periodFilter}`,
    searchValue.trim() ? `关键词“${searchValue.trim()}”` : null,
    statusFilter !== '全部' ? `状态：${bookingStatusLabels[statusFilter]}` : null,
  ].filter(Boolean);

  const bookingCountText = `当前共 ${total} 条预约`;
  const bookingResultSummary = bookingFilterLabels.length > 1
    ? `已按${bookingFilterLabels.join('、')}筛选。`
    : `当前展示${periodFilter}范围内的预约记录，可继续处理状态与查看详情。`;

  const openCreateModal = () => {
    if (!canWriteBookings) {
      messageApi.warning('当前账号没有预约写入权限');
      return;
    }

    setEditingBooking(null);
    form.setFieldsValue({
      memberId: undefined,
      sessionId: undefined,
      status: 'PENDING',
    });
    setIsFormOpen(true);
    void loadCreateFormOptions();
  };

  const openEditModal = (booking: Booking) => {
    if (!canWriteBookings) {
      messageApi.warning('当前账号没有预约写入权限');
      return;
    }

    setEditingBooking(booking);
    form.setFieldsValue({
      memberId: booking.memberId,
      sessionId: booking.sessionId,
      status: booking.status,
    });
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    setEditingBooking(null);
    form.resetFields();
  };

  const handleSaveBooking = async () => {
    if (!canWriteBookings) {
      messageApi.warning('当前账号没有预约写入权限');
      return;
    }

    try {
      setIsSaving(true);
      const values = await form.validateFields();

      if (editingBooking) {
        await bookingsApi.updateStatus(editingBooking.id, values.status);
        if (detailBooking?.id === editingBooking.id) {
          setDetailBooking({ ...detailBooking, status: values.status });
        }
        messageApi.success('预约状态已更新');
      } else {
        await bookingsApi.create({
          memberId: values.memberId,
          sessionId: values.sessionId,
          status: values.status,
          source: 'ADMIN',
        });
        messageApi.success('预约已创建');
      }

      await loadBookingsData();
      closeFormModal();
    } catch (err) {
      messageApi.error(getErrorMessage(err, '保存失败'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBooking = async (booking: Booking) => {
    if (!canWriteBookings) {
      messageApi.warning('当前账号没有预约写入权限');
      return;
    }

    try {
      setDeletingBookingId(booking.id);
      await bookingsApi.delete(booking.id);
      await loadBookingsData();

      if (detailBooking?.id === booking.id) {
        setDetailBooking(null);
      }

      messageApi.success(`已删除预约 ${booking.bookingCode}`);
    } catch (err) {
      messageApi.error(getErrorMessage(err, '删除失败'));
    } finally {
      setDeletingBookingId(null);
    }
  };

  const handleStatusAdvance = async (booking: Booking) => {
    if (!canWriteBookings) {
      messageApi.warning('当前账号没有预约写入权限');
      return;
    }

    const nextStatus = getNextBookingStatus(booking.status);
    if (nextStatus === booking.status) {
      setDetailBooking(booking);
      return;
    }

    try {
      setStatusUpdatingBookingId(booking.id);
      const updatedBooking = await bookingsApi.updateStatus(booking.id, nextStatus);
      await loadBookingsData(currentPage);

      if (detailBooking?.id === booking.id) {
        setDetailBooking(updatedBooking);
      }

      messageApi.success(`预约 ${booking.bookingCode} 已更新为${bookingStatusLabels[nextStatus]}`);
    } catch (err) {
      messageApi.error(getErrorMessage(err, '更新失败'));
    } finally {
      setStatusUpdatingBookingId(null);
    }
  };

  const openFilterModal = () => {
    setFilterDraft({ status: statusFilter });
    setIsFilterOpen(true);
  };

  const applyFilters = () => {
    setStatusFilter(filterDraft.status);
    setCurrentPage(1);
    setIsFilterOpen(false);
  };

  const resetFilters = () => {
    const nextDraft: BookingFilterDraft = { status: '全部' };
    setFilterDraft(nextDraft);
    setStatusFilter(nextDraft.status);
    setCurrentPage(1);
    setIsFilterOpen(false);
  };

  const handlePeriodChange = (period: BookingPeriod) => {
    setPeriodFilter(period);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading && bookings.length === 0) {
    return (
      <div className={`${pageCls.page} ${pageCls.workPage}`}>
        {contextHolder}
        <PageHeader
          title="预约管理"
          extra={canWriteBookings ? <ActionButton icon={<PlusOutlined />} onClick={openCreateModal}>新增预约</ActionButton> : null}
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
        title="预约管理"
        extra={canWriteBookings ? <ActionButton icon={<PlusOutlined />} onClick={openCreateModal}>新增预约</ActionButton> : null}
      />

      <BookingHeroStats items={bookingStats} />

      <BookingPeriodSelector
        title="预约日程"
        subtitle={bookingSelectorSubtitle}
        resultCountText={bookingCountText}
        periods={bookingPeriodItems}
        searchValue={searchValue}
        searchPlaceholder="按会员、课程、编号搜索预约"
        onPeriodChange={(period) => handlePeriodChange(period as BookingPeriod)}
        onSearchChange={handleSearchChange}
        onOpenFilter={openFilterModal}
      />

      <SectionCard
        title="预约列表"
      >
        <Spin spinning={loading}>
          <div className={pageCls.sectionContentStack}>
            <div className={pageCls.sectionSummaryRow}>
              <div className={pageCls.sectionSummaryText}>{bookingResultSummary}</div>
              <span className={pageCls.sectionMetaPill}>{bookingCountText}</span>
            </div>

            {bookings.length ? (
              <>
                <div className={`${widgetCls.recordList} ${pageCls.sectionListStack}`}>
                  {bookings.map((item) => (
                    <BookingListCard
                      key={item.id}
                      memberName={item.member?.name || '未知会员'}
                      statusLabel={bookingStatusLabels[item.status]}
                      courseName={item.session?.course?.name || '未知课程'}
                      sessionTimeText={formatTime(item.session?.startsAt || item.bookedAt)}
                      sessionDateText={formatBookingDateLabel(item.session?.startsAt || item.bookedAt)}
                      tone={getToneFromName(item.member?.name || '未知会员')}
                      primaryActionLabel={getStatusActionLabel(item.status)}
                      showPrimaryAction={canWriteBookings && canAdvanceBookingStatus(item.status)}
                      primaryActionLoading={statusUpdatingBookingId === item.id}
                      primaryActionDisabled={
                        (statusUpdatingBookingId !== null && statusUpdatingBookingId !== item.id)
                        || deletingBookingId !== null
                      }
                      detailActionDisabled={statusUpdatingBookingId !== null || deletingBookingId !== null}
                      onPrimaryAction={() => handleStatusAdvance(item)}
                      onViewDetail={() => setDetailBooking(item)}
                    />
                  ))}
                </div>
                <div className={pageCls.sectionPagination}>
                  <Pagination
                    current={currentPage}
                    pageSize={pageSize}
                    total={total}
                    onChange={handlePageChange}
                    showSizeChanger={false}
                  />
                </div>
              </>
            ) : (
              <div className={pageCls.sectionEmptyState}>
                <EmptyState
                  title="当前筛选下暂无预约"
                  description="调整筛选条件后再试。"
                  actionText="重置筛选"
                  onAction={() => {
                    setSearchValue('');
                    resetFilters();
                  }}
                />
              </div>
            )}
          </div>
        </Spin>
      </SectionCard>

      <Modal
        className={pageCls.crudModal}
        title={editingBooking ? '编辑预约' : '新增预约'}
        open={isFormOpen}
        width={CRUD_MODAL_WIDTH}
        onCancel={closeFormModal}
        onOk={handleSaveBooking}
        confirmLoading={isSaving}
        okButtonProps={{ disabled: !canWriteBookings }}
        okText={editingBooking ? '保存修改' : '新增预约'}
        cancelText="取消"
        zIndex={1600}
        forceRender
        destroyOnHidden
      >
        <Form form={form} className={pageCls.crudModalForm} layout="vertical">
          <Row gutter={18}>
            {!editingBooking ? (
              <>
                <Col xs={24} md={12}>
                  <Form.Item name="memberId" label="会员" rules={[{ required: true, message: '请选择会员' }]}>
                    <Select
                      className={pageCls.settingsInput}
                      placeholder="选择会员"
                      options={memberOptions}
                      loading={isMemberLoading}
                      notFoundContent={isMemberLoading ? '正在加载会员...' : '暂无可选会员'}
                      showSearch
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="sessionId" label="课程时段" rules={[{ required: true, message: '请选择课程时段' }]}>
                    <Select
                      className={pageCls.settingsInput}
                      placeholder="选择课程时段"
                      options={sessions.map((s) => ({
                        label: `${s.course?.name || '未知'} - ${formatDateTime(s.startsAt)}`,
                        value: s.id,
                      }))}
                      loading={isSessionLoading}
                      notFoundContent={isSessionLoading ? '正在加载课程时段...' : '暂无可选课程时段'}
                      showSearch
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                    />
                  </Form.Item>
                </Col>
              </>
            ) : null}
            <Col xs={24} md={12}>
              <Form.Item name="status" label="预约状态" rules={[{ required: true, message: '请选择预约状态' }]}>
                <Select className={pageCls.settingsInput} options={getBookingFormStatusOptions(editingBooking?.status)} />
              </Form.Item>
            </Col>
            {editingBooking ? (
              <Col span={24}>
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="会员">{editingBooking.member?.name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="课程时段">{`${editingBooking.session?.course?.name || '未知课程'} · ${formatDateTime(editingBooking.session?.startsAt || editingBooking.bookedAt)}`}</Descriptions.Item>
                </Descriptions>
              </Col>
            ) : null}
          </Row>
        </Form>
      </Modal>

      <Modal
        title="筛选条件"
        open={isFilterOpen}
        onCancel={() => setIsFilterOpen(false)}
        onOk={applyFilters}
        destroyOnHidden
        footer={<FilterModalFooter onReset={resetFilters} onCancel={() => setIsFilterOpen(false)} onApply={applyFilters} />}
      >
        <div className={pageCls.filterModalBody}>
          <div>
            <div className={`${widgetCls.smallText} ${pageCls.filterFieldLabel}`}>预约状态</div>
            <Select
              value={filterDraft.status}
              className={`${pageCls.settingsInput} ${pageCls.fullWidthControl}`}
              options={[{ label: '全部状态', value: '全部' }, ...bookingStatusOptions.map((item) => ({ label: bookingStatusLabels[item], value: item }))]}
              onChange={(value: BookingStatus | '全部') => setFilterDraft((current) => ({ ...current, status: value }))}
            />
          </div>
        </div>
      </Modal>

      <Drawer
        rootClassName={pageCls.responsiveDetailDrawer}
        open={detailBooking !== null}
        width={DETAIL_DRAWER_WIDTH}
        title={detailBooking?.bookingCode ?? '预约详情'}
        onClose={() => setDetailBooking(null)}
        extra={detailBooking && canWriteBookings ? (
          <div className={pageCls.drawerActionGroup}>
            <Button
              icon={<EditOutlined />}
              onClick={() => openEditModal(detailBooking)}
              disabled={statusUpdatingBookingId !== null || deletingBookingId !== null}
            >
              编辑
            </Button>
            {canAdvanceBookingStatus(detailBooking.status) ? (
              <Button
                onClick={() => handleStatusAdvance(detailBooking)}
                loading={statusUpdatingBookingId === detailBooking.id}
                disabled={
                  (statusUpdatingBookingId !== null && statusUpdatingBookingId !== detailBooking.id)
                  || deletingBookingId !== null
                }
              >
                {getStatusActionLabel(detailBooking.status)}
              </Button>
            ) : null}
            <Popconfirm
              title="确认删除该预约吗？"
              okText="删除"
              cancelText="取消"
              okButtonProps={{
                danger: true,
                loading: deletingBookingId === detailBooking.id,
                disabled: (statusUpdatingBookingId !== null) || (deletingBookingId !== null && deletingBookingId !== detailBooking.id),
              }}
              onConfirm={() => handleDeleteBooking(detailBooking)}
            >
              <Button
                className={pageCls.cardActionWarning}
                icon={<DeleteOutlined />}
                loading={deletingBookingId === detailBooking.id}
                disabled={
                  statusUpdatingBookingId !== null
                  || (deletingBookingId !== null && deletingBookingId !== detailBooking.id)
                }
              >
                删除
              </Button>
            </Popconfirm>
          </div>
        ) : null}
      >
        {detailBooking ? (
          <div className={pageCls.detailContentStack}>
            <div className={widgetCls.detailOverviewPanel}>
              <div className={widgetCls.recordMeta}>
                <MemberAvatar name={detailBooking.member?.name || '未知'} tone={getToneFromName(detailBooking.member?.name || '未知')} />
                  <div>
                    <div className={`${widgetCls.recordTitle} ${pageCls.recordTitleRow}`}>
                      {detailBooking.member?.name || '未知会员'}
                      <StatusTag status={bookingStatusLabels[detailBooking.status]} />
                    </div>
                  <div className={widgetCls.recordSub}>{detailBooking.bookingCode}</div>
                  <div className={widgetCls.recordSub}>{detailBooking.session?.course?.name || '未知课程'} · {formatDateTime(detailBooking.session?.startsAt || detailBooking.bookedAt)}</div>
                </div>
              </div>
              <div className={`${widgetCls.detailOverviewStatGrid} ${styles.bookingDetailStatGrid}`}>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatMint}`}>
                  <div className={widgetCls.detailInsightLabel}>教练</div>
                  <div className={`${widgetCls.detailOverviewStatValue} ${widgetCls.detailOverviewStatValueLarge}`}>{detailBooking.session?.coach?.name || '-'}</div>
                </div>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatViolet}`}>
                  <div className={widgetCls.detailInsightLabel}>预约来源</div>
                  <div className={`${widgetCls.detailOverviewStatValue} ${widgetCls.detailOverviewStatValueLarge}`}>{detailBooking.source === 'ADMIN' ? '后台' : '小程序'}</div>
                </div>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatOrange}`}>
                  <div className={widgetCls.detailInsightLabel}>预约时间</div>
                  <div className={`${widgetCls.detailOverviewStatValue} ${widgetCls.detailOverviewStatValueLarge}`}>{formatTime(detailBooking.bookedAt)}</div>
                </div>
              </div>
            </div>

            <Descriptions column={1} size="small" bordered className={pageCls.detailDescriptions}>
              <Descriptions.Item label="会员姓名">{detailBooking.member?.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="手机号">{detailBooking.member?.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="预约编号">{detailBooking.bookingCode}</Descriptions.Item>
              <Descriptions.Item label="预约课程">{detailBooking.session?.course?.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="授课教练">{detailBooking.session?.coach?.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="上课时间">{formatDateTime(detailBooking.session?.startsAt || detailBooking.bookedAt)}</Descriptions.Item>
              <Descriptions.Item label="状态">{bookingStatusLabels[detailBooking.status]}</Descriptions.Item>
            </Descriptions>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
