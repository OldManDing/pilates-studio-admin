import { CheckCircleOutlined, ClockCircleOutlined, ReloadOutlined, StopOutlined } from '@ant-design/icons';
import { Button, Form, Input, Modal, Pagination, Select, Spin, Tabs, message } from 'antd';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ActionButton from '@/components/ActionButton';
import EmptyState from '@/components/EmptyState';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatCard from '@/components/StatCard';
import StatusTag from '@/components/StatusTag';
import { attendanceApi, type AttendanceRecord, type AttendanceStatus } from '@/services/attendance';
import { authApi } from '@/services/auth';
import { bookingsApi, type Booking } from '@/services/bookings';
import { CRUD_MODAL_WIDTH } from '@/styles/dimensions';
import pageCls from '@/styles/page.module.css';
import { bookingStatusLabels } from '@/types';
import { getErrorMessage } from '@/utils/errors';
import { hasRequiredPermissions } from '@/utils/menu';
import styles from './index.module.css';

type CheckInFormValues = {
  bookingId: string;
  notes?: string;
};

const attendanceStatusLabels: Record<AttendanceStatus, string> = {
  PENDING: '待签到',
  CHECKED_IN: '已签到',
  COMPLETED: '已完成',
  ABSENT: '未到',
  CANCELLED: '已取消',
};

const formatDateTime = (value?: string | null) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-');
const formatTime = (value?: string | null) => (value ? dayjs(value).format('HH:mm') : '-');

export default function AttendancePage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm<CheckInFormValues>();
  const [activeTab, setActiveTab] = useState('checkin');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [updatingRecordId, setUpdatingRecordId] = useState<string | null>(null);
  const [currentUserPermissions, setCurrentUserPermissions] = useState<string[]>([]);
  const [currentUserRoleCode, setCurrentUserRoleCode] = useState('');
  const openedQueryBookingIdRef = useRef('');

  const canWriteAttendance = currentUserRoleCode === 'OWNER' || hasRequiredPermissions(currentUserPermissions, ['WRITE:ATTENDANCE']);
  const queryBookingId = searchParams.get('bookingId')?.trim() || '';

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

  const loadCheckInBookings = useCallback(async () => {
    const [pending, confirmed] = await Promise.all([
      bookingsApi.getAll({ page: 1, pageSize: 100, status: 'PENDING' }),
      bookingsApi.getAll({ page: 1, pageSize: 100, status: 'CONFIRMED' }),
    ]);
    setBookings([...(pending.data || []), ...(confirmed.data || [])].sort((left, right) => {
      const leftTime = new Date(left.session?.startsAt || left.bookedAt).getTime();
      const rightTime = new Date(right.session?.startsAt || right.bookedAt).getTime();
      return leftTime - rightTime;
    }));
  }, []);

  const loadAttendance = useCallback(async (page = currentPage) => {
    const response = await attendanceApi.getAll({ page, pageSize });
    setAttendanceRecords(response.data);
    setTotal(response.meta.total);
    setCurrentPage(page);
  }, [currentPage, pageSize]);

  const loadData = useCallback(async (page = currentPage) => {
    try {
      setLoading(true);
      await Promise.all([loadCheckInBookings(), loadAttendance(page)]);
    } catch (err) {
      messageApi.error(getErrorMessage(err, '加载签到数据失败'));
    } finally {
      setLoading(false);
    }
  }, [currentPage, loadAttendance, loadCheckInBookings, messageApi]);

  useEffect(() => {
    void loadData(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!queryBookingId || openedQueryBookingIdRef.current === queryBookingId) {
      return;
    }

    const openCheckInForBooking = (bookingId: string) => {
      openedQueryBookingIdRef.current = bookingId;
      setActiveTab('checkin');
      form.setFieldsValue({ bookingId, notes: undefined });
      setIsCheckInOpen(true);
    };

    const matchedBooking = bookings.find((booking) => booking.id === queryBookingId);
    if (matchedBooking) {
      openCheckInForBooking(matchedBooking.id);
      return;
    }

    if (loading) {
      return;
    }

    let cancelled = false;

    void bookingsApi.getById(queryBookingId)
      .then((booking) => {
        if (cancelled) {
          return;
        }

        setBookings((current) => (
          current.some((item) => item.id === booking.id) ? current : [booking, ...current]
        ));
        openCheckInForBooking(booking.id);
      })
      .catch((err) => {
        if (!cancelled) {
          messageApi.error(getErrorMessage(err, '加载签到预约失败'));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [bookings, form, loading, messageApi, queryBookingId]);

  const stats = useMemo(() => {
    const checkedIn = attendanceRecords.filter((item) => item.status === 'CHECKED_IN').length;
    const completed = attendanceRecords.filter((item) => item.status === 'COMPLETED').length;
    return [
      { title: '待签到预约', value: String(bookings.length), hint: '待确认 / 已确认预约', tone: 'mint' as const },
      { title: '已签到', value: String(checkedIn), hint: '等待课后完成', tone: 'violet' as const },
      { title: '已完成', value: String(completed), hint: '形成训练记录', tone: 'orange' as const },
      { title: '出勤记录', value: String(total), hint: '后台出勤台账', tone: 'pink' as const },
    ];
  }, [attendanceRecords, bookings.length, total]);

  const bookingOptions = useMemo(() => bookings.map((booking) => ({
    value: booking.id,
    label: `${booking.bookingCode} · ${booking.member?.name || '-'} · ${booking.session?.course?.name || '-'}`,
  })), [bookings]);

  const handleCheckIn = async (booking?: Booking) => {
    if (!canWriteAttendance) {
      messageApi.warning('当前账号没有签到权限');
      return;
    }
    form.setFieldsValue({ bookingId: booking?.id, notes: undefined });
    setIsCheckInOpen(true);
  };

  const handleSaveCheckIn = async () => {
    let values: CheckInFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    try {
      setSaving(true);
      await attendanceApi.checkIn(values);
      messageApi.success('签到已完成并同步训练记录');
      setIsCheckInOpen(false);
      form.resetFields();
      await loadData(1);
    } catch (err) {
      messageApi.error(getErrorMessage(err, '签到失败'));
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (record: AttendanceRecord) => {
    if (!canWriteAttendance) {
      messageApi.warning('当前账号没有签到处理权限');
      return;
    }
    try {
      setUpdatingRecordId(record.id);
      await attendanceApi.complete(record.id, record.notes || undefined);
      messageApi.success('课程已标记完成');
      await loadData(currentPage);
    } catch (err) {
      messageApi.error(getErrorMessage(err, '完成课程失败'));
    } finally {
      setUpdatingRecordId(null);
    }
  };

  const handleMarkAbsent = async (record: AttendanceRecord) => {
    if (!canWriteAttendance) {
      messageApi.warning('当前账号没有签到处理权限');
      return;
    }
    try {
      setUpdatingRecordId(record.id);
      await attendanceApi.update(record.id, { status: 'ABSENT' });
      messageApi.success('已标记未到');
      await loadData(currentPage);
    } catch (err) {
      messageApi.error(getErrorMessage(err, '标记未到失败'));
    } finally {
      setUpdatingRecordId(null);
    }
  };

  if (loading && bookings.length === 0 && attendanceRecords.length === 0) {
    return (
      <div className={`${pageCls.page} ${pageCls.workPage}`}>
        {contextHolder}
        <PageHeader
          title="签到核销"
          subtitle="处理到店签到、课后完成和未到记录，确保训练记录与扣次一致。"
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
        title="签到核销"
        subtitle="处理到店签到、课后完成和未到记录，确保训练记录与扣次一致。"
        extra={(
          <div className={pageCls.pageHeaderActionGroup}>
            <ActionButton ghost icon={<ReloadOutlined />} onClick={() => loadData(currentPage)}>刷新</ActionButton>
            <ActionButton icon={<CheckCircleOutlined />} onClick={() => handleCheckIn()} disabled={!canWriteAttendance}>手动签到</ActionButton>
          </div>
        )}
      />

      <div className={pageCls.heroGrid}>
        {stats.map((item) => <StatCard key={item.title} {...item} icon={<ClockCircleOutlined />} />)}
      </div>

      <SectionCard title="上课执行台" subtitle="先完成签到，再在课后标记完成或未到。">
        <Spin spinning={loading}>
          <div className={pageCls.sectionContentStack}>
            <div className={pageCls.sectionSummaryRow}>
              <div className={pageCls.sectionSummaryText}>
                当前展示待签到预约与出勤记录，签到后会同步训练记录与扣次状态。
              </div>
              <div className={pageCls.statusMetaWrap}>
                <span className={pageCls.sectionMetaPill}>签到后同步训练记录</span>
                <span className={pageCls.sectionMetaPill}>未到会触发扣次规则</span>
              </div>
            </div>

            <Tabs
              className={styles.attendanceTabs}
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                {
                  key: 'checkin',
                  label: '待签到预约',
                  children: bookings.length ? (
                    <div className={pageCls.sectionListStack}>
                      {bookings.map((booking) => (
                        <article key={booking.id} className={styles.attendanceCard}>
                          <div className={styles.timeBlock}>
                            <div className={styles.timeValue}>{formatTime(booking.session?.startsAt || booking.bookedAt)}</div>
                            <div className={styles.dateValue}>{dayjs(booking.session?.startsAt || booking.bookedAt).format('MM-DD')}</div>
                          </div>

                          <div className={styles.attendanceMain}>
                            <div className={styles.attendanceHeader}>
                              <div>
                                <h3 className={styles.attendanceTitle}>{booking.member?.name || '未知会员'}</h3>
                                <div className={styles.attendanceSub}>{booking.bookingCode} · {booking.member?.phone || '-'}</div>
                              </div>
                              <StatusTag status={bookingStatusLabels[booking.status] || booking.status} />
                            </div>

                            <div className={styles.metaGrid}>
                              <div className={styles.metaCard}>
                                <span className={styles.metaLabel}>课程</span>
                                <span className={styles.metaValue}>{booking.session?.course?.name || '-'}</span>
                              </div>
                              <div className={styles.metaCard}>
                                <span className={styles.metaLabel}>教练</span>
                                <span className={styles.metaValue}>{booking.session?.coach?.name || '-'}</span>
                              </div>
                              <div className={styles.metaCard}>
                                <span className={styles.metaLabel}>上课时间</span>
                                <span className={styles.metaValue}>{formatDateTime(booking.session?.startsAt)}</span>
                              </div>
                            </div>
                          </div>

                          <aside className={styles.cardActions}>
                            <Button
                              size="large"
                              type="primary"
                              className={pageCls.cardActionPrimary}
                              onClick={() => handleCheckIn(booking)}
                              disabled={!canWriteAttendance}
                            >
                              签到
                            </Button>
                          </aside>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className={pageCls.sectionEmptyState}>
                      <EmptyState
                        title="暂无待签到预约"
                        description="待确认或已确认的预约会出现在这里。"
                        actionText={canWriteAttendance ? '手动签到' : undefined}
                        onAction={canWriteAttendance ? () => handleCheckIn() : undefined}
                      />
                    </div>
                  ),
                },
                {
                  key: 'records',
                  label: '出勤记录',
                  children: attendanceRecords.length ? (
                    <>
                      <div className={pageCls.sectionListStack}>
                        {attendanceRecords.map((record) => (
                          <article key={record.id} className={styles.attendanceCard}>
                            <div className={styles.timeBlock}>
                              <div className={styles.timeValue}>{formatTime(record.checkedInAt)}</div>
                              <div className={styles.dateValue}>{record.checkedInAt ? dayjs(record.checkedInAt).format('MM-DD') : '未签'}</div>
                            </div>

                            <div className={styles.attendanceMain}>
                              <div className={styles.attendanceHeader}>
                                <div>
                                  <h3 className={styles.attendanceTitle}>{record.member?.name || '未知会员'}</h3>
                                  <div className={styles.attendanceSub}>{record.booking?.bookingCode || record.bookingId} · {record.member?.phone || '-'}</div>
                                </div>
                                <StatusTag status={attendanceStatusLabels[record.status]} />
                              </div>

                              <div className={styles.metaGrid}>
                                <div className={styles.metaCard}>
                                  <span className={styles.metaLabel}>课程</span>
                                  <span className={styles.metaValue}>{record.session?.course?.name || '-'}</span>
                                </div>
                                <div className={styles.metaCard}>
                                  <span className={styles.metaLabel}>签到时间</span>
                                  <span className={styles.metaValue}>{formatDateTime(record.checkedInAt)}</span>
                                </div>
                                <div className={styles.metaCard}>
                                  <span className={styles.metaLabel}>完成时间</span>
                                  <span className={styles.metaValue}>{formatDateTime(record.completedAt)}</span>
                                </div>
                              </div>
                            </div>

                            <aside className={styles.cardActions}>
                              <Button
                                size="large"
                                className={pageCls.cardActionSecondary}
                                onClick={() => handleComplete(record)}
                                loading={updatingRecordId === record.id}
                                disabled={!canWriteAttendance || record.status !== 'CHECKED_IN' || (updatingRecordId !== null && updatingRecordId !== record.id)}
                              >
                                完成
                              </Button>
                              <Button
                                danger
                                size="large"
                                className={pageCls.cardActionWarning}
                                icon={<StopOutlined />}
                                onClick={() => handleMarkAbsent(record)}
                                loading={updatingRecordId === record.id}
                                disabled={!canWriteAttendance || record.status === 'COMPLETED' || (updatingRecordId !== null && updatingRecordId !== record.id)}
                              >
                                未到
                              </Button>
                            </aside>
                          </article>
                        ))}
                      </div>

                      <div className={pageCls.sectionPagination}>
                        <Pagination
                          current={currentPage}
                          pageSize={pageSize}
                          total={total}
                          onChange={(page) => loadData(page)}
                          showSizeChanger={false}
                        />
                      </div>
                    </>
                  ) : (
                    <div className={pageCls.sectionEmptyState}>
                      <EmptyState title="暂无出勤记录" description="完成签到后，记录会显示在这里。" />
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </Spin>
      </SectionCard>

      <Modal
        className={pageCls.crudModal}
        title="会员签到"
        open={isCheckInOpen}
        onCancel={() => setIsCheckInOpen(false)}
        onOk={handleSaveCheckIn}
        confirmLoading={saving}
        okText="确认签到"
        cancelText="取消"
        width={CRUD_MODAL_WIDTH}
        destroyOnHidden
        forceRender
      >
        <Form form={form} layout="vertical" className={pageCls.crudModalForm}>
          <Form.Item name="bookingId" label="预约记录" rules={[{ required: true, message: '请选择预约记录' }]}>
            <Select
              className={pageCls.settingsInput}
              showSearch
              placeholder="搜索预约编号、会员或课程"
              optionFilterProp="label"
              options={bookingOptions}
              notFoundContent="暂无可签到预约"
            />
          </Form.Item>
          <Form.Item name="notes" label="签到备注">
            <Input.TextArea className={pageCls.settingsInput} rows={3} placeholder="可记录补签、迟到、设备安排等运营备注" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
