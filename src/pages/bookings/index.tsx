import { CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, DeleteOutlined, EditOutlined, EyeOutlined, FilterOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Descriptions, Drawer, Form, Input, Modal, Popconfirm, Segmented, Select, message } from 'antd';
import { useMemo, useState } from 'react';
import ActionButton from '@/components/ActionButton';
import MemberAvatar from '@/components/MemberAvatar';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import StatusTag from '@/components/StatusTag';
import { bookingList, bookingStats } from '@/mock';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import type { BookingStatus } from '@/types';

const iconMap = {
  calendar: <CalendarOutlined />,
  schedule: <CalendarOutlined />,
  clock: <ClockCircleOutlined />,
  check: <CheckCircleOutlined />
};

type BookingPeriod = '今天' | '明天' | '本周';
type BookingRecord = (typeof bookingList)[number] & { period: BookingPeriod };
type BookingFormValues = {
  name: string;
  code: string;
  course: string;
  coach: string;
  period: BookingPeriod;
  sessionTime: string;
  bookedAt: string;
  status: BookingStatus;
  tone: BookingRecord['tone'];
};
type BookingFilterDraft = {
  status: BookingStatus | '全部';
  coach: string;
};

const toneOptions: Array<{ label: string; value: BookingRecord['tone'] }> = [
  { label: '薄荷绿', value: 'mint' },
  { label: '柔雾紫', value: 'violet' },
  { label: '暖日橙', value: 'orange' },
  { label: '轻粉色', value: 'pink' }
];

const bookingStatusOptions: BookingStatus[] = ['待确认', '已确认', '已完成', '已取消'];
const bookingPeriods: BookingPeriod[] = ['今天', '明天', '本周'];

const initialBookings: BookingRecord[] = bookingList.map((item) => ({
  ...item,
  period: item.time.startsWith('明天') ? '明天' : item.time.startsWith('本周') ? '本周' : '今天'
}));

const defaultBookingFormValues: BookingFormValues = {
  name: '',
  code: '',
  course: '',
  coach: '',
  period: '今天',
  sessionTime: '08:00',
  bookedAt: '09:00',
  status: '待确认',
  tone: 'mint'
};

const getStatusActionLabel = (status: BookingStatus) => {
  if (status === '待确认') {
    return '确认';
  }

  if (status === '已确认') {
    return '签到';
  }

  if (status === '已完成') {
    return '重新预约';
  }

  return '恢复预约';
};

const getNextBookingStatus = (status: BookingStatus): BookingStatus => {
  if (status === '待确认') {
    return '已确认';
  }

  if (status === '已确认') {
    return '已完成';
  }

  return '待确认';
};

const getNextBookingSerial = (current: BookingRecord[]) => {
  const values = current.map((item) => Number(item.id.replace('BKG-', ''))).filter((value) => Number.isFinite(value));
  const nextValue = values.length > 0 ? Math.max(...values) + 1 : 1036;
  return String(nextValue);
};

export default function BookingsPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<BookingFormValues>();
  const [bookings, setBookings] = useState<BookingRecord[]>(initialBookings);
  const [periodFilter, setPeriodFilter] = useState<BookingPeriod>('今天');
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | '全部'>('全部');
  const [coachFilter, setCoachFilter] = useState<string>('全部');
  const [filterDraft, setFilterDraft] = useState<BookingFilterDraft>({ status: '全部', coach: '全部' });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<BookingRecord | null>(null);
  const [detailBooking, setDetailBooking] = useState<BookingRecord | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const coachOptions = useMemo(
    () => Array.from(new Set(bookings.map((booking) => booking.coach))),
    [bookings]
  );

  const filteredBookings = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase();

    return bookings.filter((booking) => {
      const matchesPeriod = booking.period === periodFilter;
      const matchesKeyword =
        keyword.length === 0 ||
        booking.name.toLowerCase().includes(keyword) ||
        booking.course.toLowerCase().includes(keyword) ||
        booking.code.toLowerCase().includes(keyword) ||
        booking.id.toLowerCase().includes(keyword);
      const matchesStatus = statusFilter === '全部' || booking.status === statusFilter;
      const matchesCoach = coachFilter === '全部' || booking.coach === coachFilter;

      return matchesPeriod && matchesKeyword && matchesStatus && matchesCoach;
    });
  }, [bookings, coachFilter, periodFilter, searchValue, statusFilter]);

  const openCreateModal = () => {
    setEditingBooking(null);
    form.setFieldsValue(defaultBookingFormValues);
    setIsFormOpen(true);
  };

  const openEditModal = (booking: BookingRecord) => {
    setEditingBooking(booking);
    form.setFieldsValue({
      name: booking.name,
      code: booking.code,
      course: booking.course,
      coach: booking.coach,
      period: booking.period,
      sessionTime: booking.time.replace(`${booking.period} `, ''),
      bookedAt: booking.bookedAt,
      status: booking.status,
      tone: booking.tone
    });
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    setEditingBooking(null);
    form.resetFields();
  };

  const handleSaveBooking = async () => {
    const values = await form.validateFields();

    const serial = editingBooking ? editingBooking.id.replace('BKG-', '') : getNextBookingSerial(bookings);
    const nextBooking: BookingRecord = {
      id: editingBooking?.id ?? `BKG-${serial}`,
      name: values.name,
      status: values.status,
      code: values.code.trim() || `NO.${serial}`,
      course: values.course,
      time: `${values.period} ${values.sessionTime}`,
      coach: values.coach,
      bookedAt: values.bookedAt,
      tone: values.tone,
      period: values.period
    };

    setBookings((current) => {
      if (editingBooking) {
        return current.map((booking) => (booking.id === editingBooking.id ? nextBooking : booking));
      }

      return [nextBooking, ...current];
    });

    if (detailBooking?.id === nextBooking.id) {
      setDetailBooking(nextBooking);
    }

    messageApi.success(editingBooking ? '预约信息已更新' : '预约已创建');
    closeFormModal();
  };

  const handleDeleteBooking = (booking: BookingRecord) => {
    setBookings((current) => current.filter((item) => item.id !== booking.id));

    if (detailBooking?.id === booking.id) {
      setDetailBooking(null);
    }

    messageApi.success(`已删除预约 ${booking.code}`);
  };

  const handleStatusAdvance = (booking: BookingRecord) => {
    const nextStatus = getNextBookingStatus(booking.status);
    const nextBooking: BookingRecord = { ...booking, status: nextStatus };

    setBookings((current) => current.map((item) => (item.id === booking.id ? nextBooking : item)));

    if (detailBooking?.id === booking.id) {
      setDetailBooking(nextBooking);
    }

    messageApi.success(`预约 ${booking.code} 已更新为${nextStatus}`);
  };

  const openFilterModal = () => {
    setFilterDraft({ status: statusFilter, coach: coachFilter });
    setIsFilterOpen(true);
  };

  const applyFilters = () => {
    setStatusFilter(filterDraft.status);
    setCoachFilter(filterDraft.coach);
    setIsFilterOpen(false);
  };

  const resetFilters = () => {
    const nextDraft: BookingFilterDraft = { status: '全部', coach: '全部' };

    setFilterDraft(nextDraft);
    setStatusFilter(nextDraft.status);
    setCoachFilter(nextDraft.coach);
    setIsFilterOpen(false);
  };

  return (
    <div className={pageCls.page}>
      {contextHolder}
      <PageHeader
        title="预约管理"
        subtitle="管理所有课程预约和签到记录。"
        extra={<ActionButton icon={<PlusOutlined />} onClick={openCreateModal}>新建预约</ActionButton>}
      />

      <div className={pageCls.heroGrid}>
        {bookingStats.map((item) => (
          <StatCard key={item.title} {...item} icon={iconMap[item.icon]} />
        ))}
      </div>

      <div className={pageCls.toolbar}>
        <div className={pageCls.toolbarLeft}>
          <div className={pageCls.segmentedSoft}>
            <Segmented<BookingPeriod>
              size="large"
              options={bookingPeriods}
              value={periodFilter}
              onChange={(value) => setPeriodFilter(value)}
            />
          </div>
          <Input
            className={pageCls.toolbarSearch}
            size="large"
            value={searchValue}
            prefix={<SearchOutlined />}
            placeholder="按会员、课程、编号搜索预约"
            onChange={(event) => setSearchValue(event.target.value)}
          />
        </div>
        <div className={pageCls.toolbarRight}>
          <ActionButton icon={<FilterOutlined />} ghost onClick={openFilterModal}>筛选</ActionButton>
        </div>
      </div>

      <div className={widgetCls.recordList}>
        {filteredBookings.map((item) => (
          <div key={item.id} className={`${widgetCls.recordItem} ${pageCls.surface}`}>
            <div className={widgetCls.recordMeta}>
              <MemberAvatar name={item.name} tone={item.tone} />
              <div>
                <div className={widgetCls.recordTitle} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  {item.name}
                  <StatusTag status={item.status} />
                </div>
                <div className={widgetCls.recordSub}>{item.code}</div>
                <div className={widgetCls.recordSub}>{item.course} · {item.time}</div>
              </div>
            </div>

            <div className={widgetCls.infoStack}>
              <div>教练：{item.coach}</div>
              <div>预约时间：{item.bookedAt}</div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Button type="primary" size="large" className={pageCls.cardActionHalf} onClick={() => handleStatusAdvance(item)}>
                {getStatusActionLabel(item.status)}
              </Button>
              <Button size="large" className={pageCls.cardActionHalf} onClick={() => setDetailBooking(item)}>详情</Button>
            </div>
          </div>
        ))}
      </div>

      {filteredBookings.length === 0 ? (
        <div className={`${pageCls.surface} ${widgetCls.detailCard}`} style={{ marginTop: 16 }}>
          <div className={widgetCls.detailTitle}>当前筛选下暂无预约</div>
          <div className={widgetCls.smallText} style={{ marginTop: 8 }}>你可以重置筛选，或直接创建一条新的预约记录。</div>
          <div className={widgetCls.twoButtons}>
            <Button size="large" className={pageCls.cardActionHalf} onClick={() => setSearchValue('')}>清空搜索</Button>
            <Button type="primary" size="large" className={pageCls.cardActionHalf} onClick={resetFilters}>重置筛选</Button>
          </div>
        </div>
      ) : null}

      <Modal
        title={editingBooking ? '编辑预约' : '新建预约'}
        open={isFormOpen}
        onCancel={closeFormModal}
        onOk={handleSaveBooking}
        okText={editingBooking ? '保存修改' : '创建预约'}
        cancelText="取消"
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
          <Form.Item name="name" label="会员姓名" rules={[{ required: true, message: '请输入会员姓名' }]}>
            <Input className={pageCls.settingsInput} />
          </Form.Item>
          <Form.Item name="code" label="展示编号">
            <Input className={pageCls.settingsInput} placeholder="例如：NO.1036，可留空自动生成" />
          </Form.Item>
          <Form.Item name="course" label="预约课程" rules={[{ required: true, message: '请输入预约课程' }]}>
            <Input className={pageCls.settingsInput} />
          </Form.Item>
          <Form.Item name="coach" label="授课教练" rules={[{ required: true, message: '请输入授课教练' }]}>
            <Input className={pageCls.settingsInput} />
          </Form.Item>
          <Form.Item name="period" label="预约范围" rules={[{ required: true, message: '请选择预约范围' }]}>
            <Select className={pageCls.settingsInput} options={bookingPeriods.map((item) => ({ label: item, value: item }))} />
          </Form.Item>
          <Form.Item name="sessionTime" label="上课时间" rules={[{ required: true, message: '请输入上课时间' }]}>
            <Input className={pageCls.settingsInput} placeholder="例如：18:30" />
          </Form.Item>
          <Form.Item name="bookedAt" label="预约时间" rules={[{ required: true, message: '请输入预约时间' }]}>
            <Input className={pageCls.settingsInput} placeholder="例如：09:42" />
          </Form.Item>
          <Form.Item name="status" label="预约状态" rules={[{ required: true, message: '请选择预约状态' }]}>
            <Select className={pageCls.settingsInput} options={bookingStatusOptions.map((item) => ({ label: item, value: item }))} />
          </Form.Item>
          <Form.Item name="tone" label="头像色系" rules={[{ required: true, message: '请选择头像色系' }]}>
            <Select className={pageCls.settingsInput} options={toneOptions} />
          </Form.Item>
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
        <div style={{ display: 'grid', gap: 16, marginTop: 20 }}>
          <div>
            <div className={widgetCls.smallText} style={{ marginBottom: 8 }}>预约状态</div>
            <Select
              value={filterDraft.status}
              className={pageCls.settingsInput}
              style={{ width: '100%' }}
              options={[{ label: '全部状态', value: '全部' }, ...bookingStatusOptions.map((item) => ({ label: item, value: item }))]}
              onChange={(value: BookingStatus | '全部') => setFilterDraft((current) => ({ ...current, status: value }))}
            />
          </div>
          <div>
            <div className={widgetCls.smallText} style={{ marginBottom: 8 }}>授课教练</div>
            <Select
              value={filterDraft.coach}
              className={pageCls.settingsInput}
              style={{ width: '100%' }}
              options={[{ label: '全部教练', value: '全部' }, ...coachOptions.map((item) => ({ label: item, value: item }))]}
              onChange={(value: string) => setFilterDraft((current) => ({ ...current, coach: value }))}
            />
          </div>
        </div>
      </Modal>

      <Drawer
        open={detailBooking !== null}
        width={480}
        title={detailBooking?.code ?? '预约详情'}
        onClose={() => setDetailBooking(null)}
        extra={detailBooking ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button icon={<EditOutlined />} onClick={() => openEditModal(detailBooking)}>编辑</Button>
            <Button icon={<EyeOutlined />} onClick={() => handleStatusAdvance(detailBooking)}>{getStatusActionLabel(detailBooking.status)}</Button>
            <Popconfirm title="确认删除该预约吗？" okText="删除" cancelText="取消" onConfirm={() => handleDeleteBooking(detailBooking)}>
              <Button danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          </div>
        ) : null}
      >
        {detailBooking ? (
          <div style={{ display: 'grid', gap: 16 }}>
            <div className={widgetCls.detailOverviewPanel}>
              <div className={widgetCls.recordMeta}>
                <MemberAvatar name={detailBooking.name} tone={detailBooking.tone} />
                <div>
                  <div className={widgetCls.recordTitle} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {detailBooking.name}
                    <StatusTag status={detailBooking.status} />
                  </div>
                  <div className={widgetCls.recordSub}>{detailBooking.code}</div>
                  <div className={widgetCls.recordSub}>{detailBooking.course} · {detailBooking.time}</div>
                </div>
              </div>
              <div className={widgetCls.detailOverviewStatGrid}>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatMint}`}>
                  <div className={widgetCls.detailInsightLabel}>教练</div>
                  <div className={widgetCls.detailOverviewStatValue} style={{ fontSize: 'var(--font-size-xl)' }}>{detailBooking.coach}</div>
                </div>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatViolet}`}>
                  <div className={widgetCls.detailInsightLabel}>预约范围</div>
                  <div className={widgetCls.detailOverviewStatValue} style={{ fontSize: 'var(--font-size-xl)' }}>{detailBooking.period}</div>
                </div>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatOrange}`}>
                  <div className={widgetCls.detailInsightLabel}>预约时间</div>
                  <div className={widgetCls.detailOverviewStatValue} style={{ fontSize: 'var(--font-size-xl)' }}>{detailBooking.bookedAt}</div>
                </div>
              </div>
            </div>

            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="会员姓名">{detailBooking.name}</Descriptions.Item>
              <Descriptions.Item label="预约编号">{detailBooking.id}</Descriptions.Item>
              <Descriptions.Item label="展示编号">{detailBooking.code}</Descriptions.Item>
              <Descriptions.Item label="预约课程">{detailBooking.course}</Descriptions.Item>
              <Descriptions.Item label="授课教练">{detailBooking.coach}</Descriptions.Item>
              <Descriptions.Item label="上课时间">{detailBooking.time}</Descriptions.Item>
              <Descriptions.Item label="预约时间">{detailBooking.bookedAt}</Descriptions.Item>
              <Descriptions.Item label="状态">{detailBooking.status}</Descriptions.Item>
            </Descriptions>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
