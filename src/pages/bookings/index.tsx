import { CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Col, Descriptions, Drawer, Form, Modal, Pagination, Popconfirm, Row, Select, Spin, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import ActionButton from '@/components/ActionButton';
import EmptyState from '@/components/EmptyState';
import FilterModalFooter from '@/components/FilterModalFooter';
import MemberAvatar from '@/components/MemberAvatar';
import PageHeader from '@/components/PageHeader';
import StatusTag from '@/components/StatusTag';
import { CRUD_MODAL_WIDTH, DETAIL_DRAWER_WIDTH } from '@/styles/dimensions';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import { bookingStatusLabels, type BookingStatus } from '@/types';
import { bookingsApi, type Booking } from '@/services/bookings';
import { membersApi, type Member } from '@/services/members';
import { courseSessionsApi, type CourseSession } from '@/services/courseSessions';
import { getErrorMessage } from '@/utils/errors';
import { getToneFromName } from '@/utils/tone';
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
const bookingPeriods: BookingPeriod[] = ['今天', '明天', '本周'];
const BOOKING_QUERY_PAGE_SIZE = 200;

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

const getPeriodFromDate = (dateStr: string): BookingPeriod => {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  if (date >= today && date < tomorrow) return '今天';
  if (date >= tomorrow && date < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)) return '明天';
  return '本周';
};

const getStatusActionLabel = (status: BookingStatus) => {
  if (status === 'PENDING') return '确认';
  if (status === 'CONFIRMED') return '签到';
  if (status === 'COMPLETED') return '恢复待确认';
  if (status === 'CANCELLED') return '恢复待确认';
  if (status === 'NO_SHOW') return '标记待确认';
  return '更新状态';
};

const getNextBookingStatus = (status: BookingStatus): BookingStatus => {
  if (status === 'PENDING') return 'CONFIRMED';
  if (status === 'CONFIRMED') return 'COMPLETED';
  return 'PENDING';
};

export default function BookingsPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<BookingFormValues>();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<BookingPeriod>('今天');
  const [searchValue, setSearchValue] = useState('');
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

  const loadBookingsData = async (page = 1) => {
    const now = new Date();
    const startDate = new Date(now);
    const endDate = new Date(now);

    if (periodFilter === '今天') {
      endDate.setDate(endDate.getDate() + 1);
    } else if (periodFilter === '明天') {
      startDate.setDate(startDate.getDate() + 1);
      endDate.setDate(endDate.getDate() + 2);
    } else {
      endDate.setDate(endDate.getDate() + 7);
    }

    const from = startDate.toISOString().split('T')[0];
    const to = endDate.toISOString().split('T')[0];

    const [bookingsRes, membersRes, sessionsRes] = await Promise.all([
      bookingsApi.getAll({
        page,
        pageSize,
        from,
        to,
        status: statusFilter === '全部' ? undefined : statusFilter,
        search: searchValue.trim() || undefined,
      }),
      membersApi.getAll(1, 100),
      courseSessionsApi.getUpcoming().catch(() => []),
    ]);

    setBookings(bookingsRes.data);
    setCurrentPage(bookingsRes.meta.page);
    setMembers(membersRes.data);
    setSessions(sessionsRes);
    setTotal(bookingsRes.meta.total);
  };

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
  }, [currentPage, periodFilter, searchValue, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [periodFilter, searchValue, statusFilter]);

  const bookingStats = useMemo(() => [
    {
      key: 'today',
      title: '今日预约',
      value: String(bookings.filter((b) => getPeriodFromDate(b.session?.startsAt || b.bookedAt) === '今天').length),
      hint: `${bookings.filter((b) => b.status === 'PENDING').length} 待确认`,
      tone: 'mint' as const,
      icon: iconMap.calendar,
    },
    {
      key: 'week',
      title: '本周预约',
      value: String(bookings.length),
      hint: `${bookings.filter((b) => b.status === 'CONFIRMED').length} 已确认`,
      tone: 'violet' as const,
      icon: iconMap.schedule,
    },
    {
      key: 'pending',
      title: '待确认',
      value: String(bookings.filter((b) => b.status === 'PENDING').length),
      hint: '需及时处理',
      tone: 'orange' as const,
      icon: iconMap.clock,
    },
    {
      key: 'checkin',
      title: '已完成',
      value: String(bookings.filter((b) => b.status === 'COMPLETED').length),
      hint: `${bookings.filter((b) => b.status === 'NO_SHOW').length} 未到场`,
      tone: 'pink' as const,
      icon: iconMap.check,
    },
  ], [bookings]);

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

  const openCreateModal = () => {
    setEditingBooking(null);
    form.setFieldsValue({
      memberId: undefined,
      sessionId: undefined,
      status: 'PENDING',
    });
    setIsFormOpen(true);
  };

  const openEditModal = (booking: Booking) => {
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
    try {
      await bookingsApi.delete(booking.id);
      await loadBookingsData();

      if (detailBooking?.id === booking.id) {
        setDetailBooking(null);
      }

      messageApi.success(`已删除预约 ${booking.bookingCode}`);
    } catch (err) {
      messageApi.error(getErrorMessage(err, '删除失败'));
    }
  };

  const handleStatusAdvance = async (booking: Booking) => {
    try {
      const nextStatus = getNextBookingStatus(booking.status);
      const updatedBooking = await bookingsApi.updateStatus(booking.id, nextStatus);
      await loadBookingsData(currentPage);

      if (detailBooking?.id === booking.id) {
        setDetailBooking(updatedBooking);
      }

      messageApi.success(`预约 ${booking.bookingCode} 已更新为${bookingStatusLabels[nextStatus]}`);
    } catch (err) {
      messageApi.error(getErrorMessage(err, '更新失败'));
    }
  };

  const openFilterModal = () => {
    setFilterDraft({ status: statusFilter });
    setIsFilterOpen(true);
  };

  const applyFilters = () => {
    setStatusFilter(filterDraft.status);
    setIsFilterOpen(false);
  };

  const resetFilters = () => {
    const nextDraft: BookingFilterDraft = { status: '全部' };
    setFilterDraft(nextDraft);
    setStatusFilter(nextDraft.status);
    setIsFilterOpen(false);
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
          subtitle="管理所有课程预约和签到记录。"
          extra={<ActionButton icon={<PlusOutlined />} onClick={openCreateModal}>新增预约</ActionButton>}
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
        subtitle="管理所有课程预约和签到记录。"
        extra={<ActionButton icon={<PlusOutlined />} onClick={openCreateModal}>新增预约</ActionButton>}
      />

      <BookingHeroStats items={bookingStats} />

      <BookingPeriodSelector
        eyebrow="BOOKING SELECTOR"
        title="预约日程"
        subtitle={bookingSelectorSubtitle}
        resultCountText={`共 ${total} 条`}
        periods={bookingPeriodItems}
        searchValue={searchValue}
        searchPlaceholder="按会员、课程、编号搜索预约"
        onPeriodChange={(period) => setPeriodFilter(period as BookingPeriod)}
        onSearchChange={setSearchValue}
        onOpenFilter={openFilterModal}
      />

      {bookings.length ? (
        <>
          <div className={`${widgetCls.recordList} ${pageCls.workSection}`}>
            {bookings.map((item) => (
              <BookingListCard
                key={item.id}
                memberName={item.member?.name || '未知会员'}
                statusLabel={bookingStatusLabels[item.status]}
                bookingCode={item.bookingCode}
                courseName={item.session?.course?.name || '未知课程'}
                sessionTimeText={formatTime(item.session?.startsAt || item.bookedAt)}
                sessionDateText={formatBookingDateLabel(item.session?.startsAt || item.bookedAt)}
                bookedAtText={formatDateTime(item.bookedAt)}
                coachName={item.session?.coach?.name || '-'}
                sourceText={item.source === 'ADMIN' ? '后台创建' : '小程序预约'}
                tone={getToneFromName(item.member?.name || '未知会员')}
                primaryActionLabel={getStatusActionLabel(item.status)}
                onPrimaryAction={() => handleStatusAdvance(item)}
                onViewDetail={() => setDetailBooking(item)}
              />
            ))}
          </div>
          <div className={pageCls.centerPagination}>
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
        <div className={`${pageCls.surface} ${widgetCls.detailCard} ${pageCls.surfaceTopSpace}`}>
          <EmptyState title="当前筛选下暂无预约" description="你可以重置筛选条件，或直接创建一条新的预约记录。" actionText="重置筛选" onAction={() => { setSearchValue(''); resetFilters(); }} />
        </div>
      )}

      <Modal
        className={pageCls.crudModal}
        title={editingBooking ? '编辑预约' : '新增预约'}
        open={isFormOpen}
        width={CRUD_MODAL_WIDTH}
        onCancel={closeFormModal}
        onOk={handleSaveBooking}
        confirmLoading={isSaving}
        okText={editingBooking ? '保存修改' : '新增预约'}
        cancelText="取消"
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
                      options={members.map((m) => ({ label: `${m.name} (${m.phone})`, value: m.id }))}
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
                <Select className={pageCls.settingsInput} options={bookingStatusOptions.map((item) => ({ label: bookingStatusLabels[item], value: item }))} />
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
        title="筛选预约"
        open={isFilterOpen}
        onCancel={() => setIsFilterOpen(false)}
        onOk={applyFilters}
        okText="应用筛选"
        cancelText="取消"
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
        open={detailBooking !== null}
        width={DETAIL_DRAWER_WIDTH}
        title={detailBooking?.bookingCode ?? '预约详情'}
        onClose={() => setDetailBooking(null)}
        extra={detailBooking ? (
          <div className={pageCls.drawerActionGroup}>
            <Button icon={<EditOutlined />} onClick={() => openEditModal(detailBooking)}>编辑</Button>
            <Button icon={<EyeOutlined />} onClick={() => handleStatusAdvance(detailBooking)}>{getStatusActionLabel(detailBooking.status)}</Button>
            <Popconfirm title="确认删除该预约吗？" okText="删除" cancelText="取消" onConfirm={() => handleDeleteBooking(detailBooking)}>
              <Button danger icon={<DeleteOutlined />}>删除</Button>
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
              <div className={widgetCls.detailOverviewStatGrid}>
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

            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="会员姓名">{detailBooking.member?.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="会员电话">{detailBooking.member?.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="预约编号">{detailBooking.bookingCode}</Descriptions.Item>
              <Descriptions.Item label="预约课程">{detailBooking.session?.course?.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="授课教练">{detailBooking.session?.coach?.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="上课时间">{formatDateTime(detailBooking.session?.startsAt || detailBooking.bookedAt)}</Descriptions.Item>
              <Descriptions.Item label="预约时间">{formatDateTime(detailBooking.bookedAt)}</Descriptions.Item>
              <Descriptions.Item label="状态">{bookingStatusLabels[detailBooking.status]}</Descriptions.Item>
            </Descriptions>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
