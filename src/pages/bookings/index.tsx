import { CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, DeleteOutlined, EditOutlined, EyeOutlined, FilterOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Col, Descriptions, Drawer, Form, Input, Modal, Pagination, Popconfirm, Row, Select, Spin, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import ActionButton from '@/components/ActionButton';
import EmptyState from '@/components/EmptyState';
import MemberAvatar from '@/components/MemberAvatar';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import StatusTag from '@/components/StatusTag';
import { CRUD_MODAL_WIDTH, DETAIL_DRAWER_WIDTH } from '@/styles/dimensions';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import type { BookingStatus } from '@/types';
import { bookingsApi, type Booking } from '@/services/bookings';
import { membersApi, type Member } from '@/services/members';
import { courseSessionsApi, type CourseSession } from '@/services/courseSessions';
import { reportsApi } from '@/services/reports';
import { getErrorMessage } from '@/utils/errors';
import { getToneFromName } from '@/utils/tone';

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

const bookingStatusOptions: BookingStatus[] = ['待确认', '已确认', '已完成', '已取消'];
const bookingPeriods: BookingPeriod[] = ['今天', '明天', '本周'];

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
  if (status === '待确认') return '确认';
  if (status === '已确认') return '签到';
  if (status === '已完成') return '重新预约';
  return '恢复预约';
};

const getNextBookingStatus = (status: BookingStatus): BookingStatus => {
  if (status === '待确认') return '已确认';
  if (status === '已确认') return '已完成';
  return '待确认';
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
  const [stats, setStats] = useState({
    todayBookings: 0,
    weeklyBookings: 0,
    pendingConfirm: 0,
    checkInRate: '94%',
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const today = new Date().toISOString().split('T')[0];
        const weekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const [bookingsRes, membersRes, sessionsRes, reportsData] = await Promise.all([
          bookingsApi.getAll({ page: 1, pageSize: 100, from: today, to: weekLater }),
          membersApi.getAll(1, 100),
          courseSessionsApi.getUpcoming().catch(() => []),
          reportsApi.getBookings(today, weekLater).catch(() => null),
        ]);

        setBookings(bookingsRes.data);
        setTotal(bookingsRes.meta.total);
        setMembers(membersRes.data);
        setSessions(sessionsRes);

        setStats({
          todayBookings: bookingsRes.data.filter(b => getPeriodFromDate(b.session?.startsAt || b.bookedAt) === '今天').length,
          weeklyBookings: bookingsRes.meta.total,
          pendingConfirm: bookingsRes.data.filter(b => b.status === '待确认').length,
          checkInRate: '94%',
        });
      } catch (err) {
        messageApi.error('获取预约数据失败');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const fetchBookings = async (page = 1) => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const weekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const res = await bookingsApi.getAll({ page, pageSize, from: today, to: weekLater });
      setBookings(res.data);
      setTotal(res.meta.total);
      setCurrentPage(res.meta.page);
    } catch (err) {
      messageApi.error('获取预约列表失败');
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase();

    return bookings.filter((booking) => {
      const period = getPeriodFromDate(booking.session?.startsAt || booking.bookedAt);
      const matchesPeriod = period === periodFilter;
      const matchesKeyword =
        keyword.length === 0 ||
        booking.member?.name?.toLowerCase().includes(keyword) ||
        booking.session?.course?.name?.toLowerCase().includes(keyword) ||
        booking.bookingCode?.toLowerCase().includes(keyword);
      const matchesStatus = statusFilter === '全部' || booking.status === statusFilter;

      return matchesPeriod && matchesKeyword && matchesStatus;
    });
  }, [bookings, periodFilter, searchValue, statusFilter]);

  const bookingStats = useMemo(() => [
    { title: '今日预约', value: String(stats.todayBookings), hint: `${stats.pendingConfirm} 待确认`, tone: 'mint' as const, icon: 'calendar' as const },
    { title: '本周预约', value: String(stats.weeklyBookings), hint: '满座率 87%', tone: 'violet' as const, icon: 'schedule' as const },
    { title: '待确认', value: String(stats.pendingConfirm), hint: '需及时处理', tone: 'orange' as const, icon: 'clock' as const },
    { title: '签到率', value: stats.checkInRate, hint: '↑ 2.1% vs 上周', tone: 'pink' as const, icon: 'check' as const },
  ], [stats]);

  const openCreateModal = () => {
    setEditingBooking(null);
    form.setFieldsValue({
      memberId: undefined,
      sessionId: undefined,
      status: '待确认',
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
        messageApi.success('预约状态已更新');
      } else {
        await bookingsApi.create({
          memberId: values.memberId,
          sessionId: values.sessionId,
          source: 'ADMIN',
        });
        messageApi.success('预约已创建');
      }

      await fetchBookings(currentPage);
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
      await fetchBookings(currentPage);

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
      await bookingsApi.updateStatus(booking.id, nextStatus);
      await fetchBookings(currentPage);

      if (detailBooking?.id === booking.id) {
        setDetailBooking({ ...detailBooking, status: nextStatus });
      }

      messageApi.success(`预约 ${booking.bookingCode} 已更新为${nextStatus}`);
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
    fetchBookings(page);
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

      <div className={pageCls.heroGrid}>
        {bookingStats.map((item) => (
          <StatCard key={item.title} {...item} icon={iconMap[item.icon]} />
        ))}
      </div>

      <div className={pageCls.toolbar}>
        <div className={pageCls.toolbarLeft}>
          <div className={pageCls.splitButtonGroup}>
            {bookingPeriods.map((period) => {
              const active = periodFilter === period;
              return (
                <Button
                  key={period}
                  type={active ? 'primary' : 'default'}
                  className={`${pageCls.bookingDateTab} ${active ? pageCls.bookingDateTabActive : ''}`}
                  onClick={() => setPeriodFilter(period)}
                >
                  {period}
                </Button>
              );
            })}
          </div>

          <div className={pageCls.bookingSearchRow}>
            <Input
              className={pageCls.toolbarSearch}
              size="large"
              value={searchValue}
              prefix={<SearchOutlined />}
              placeholder="按会员、课程、编号搜索预约"
              onChange={(event) => setSearchValue(event.target.value)}
            />
            <ActionButton icon={<FilterOutlined />} ghost onClick={openFilterModal}>筛选</ActionButton>
          </div>
        </div>
      </div>

      {filteredBookings.length ? (
        <>
          <div className={`${widgetCls.recordList} ${pageCls.workSection}`}>
            {filteredBookings.map((item) => (
              <div key={item.id} className={`${widgetCls.recordItem} ${widgetCls.workRecordItem} ${pageCls.surface}`}>
                <div className={widgetCls.recordMeta}>
                  <MemberAvatar name={item.member?.name || '未知'} tone={getToneFromName(item.member?.name || '未知')} />
                  <div>
                    <div className={`${widgetCls.recordTitle} ${pageCls.recordTitleRow}`}>
                      {item.member?.name || '未知会员'}
                      <StatusTag status={item.status} />
                    </div>
                    <div className={widgetCls.recordSub}>{item.bookingCode}</div>
                    <div className={widgetCls.recordSub}>{item.session?.course?.name || '未知课程'} · {formatDateTime(item.session?.startsAt || item.bookedAt)}</div>
                  </div>
                </div>

                <div className={widgetCls.infoStack}>
                  <div>教练：{item.session?.coach?.name || '-'}</div>
                  <div>预约时间：{formatTime(item.bookedAt)}</div>
                </div>

                <div className={pageCls.actionRowWrap}>
                  <Button type="primary" size="large" className={pageCls.cardActionHalf} onClick={() => handleStatusAdvance(item)}>
                    {getStatusActionLabel(item.status)}
                  </Button>
                  <Button size="large" className={pageCls.cardActionHalf} onClick={() => setDetailBooking(item)}>详情</Button>
                </div>
              </div>
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
            <Col xs={24} md={12}>
              <Form.Item name="status" label="预约状态" rules={[{ required: true, message: '请选择预约状态' }]}>
                <Select className={pageCls.settingsInput} options={bookingStatusOptions.map((item) => ({ label: bookingStatusLabels[item], value: item }))} />
              </Form.Item>
            </Col>
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
        footer={[
          <Button key="reset" onClick={resetFilters}>重置</Button>,
          <Button key="cancel" onClick={() => setIsFilterOpen(false)}>取消</Button>,
          <Button key="submit" type="primary" onClick={applyFilters}>应用筛选</Button>
        ]}
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
                      <StatusTag status={bookingStatusLabels[detailBooking.status] || detailBooking.status} />
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
              <Descriptions.Item label="状态">{bookingStatusLabels[detailBooking.status] || detailBooking.status}</Descriptions.Item>
            </Descriptions>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
