import { CalendarOutlined, DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Pagination,
  Popconfirm,
  Row,
  Select,
  Spin,
  Switch,
  message,
} from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ActionButton from '@/components/ActionButton';
import EmptyState from '@/components/EmptyState';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatCard from '@/components/StatCard';
import StatusTag from '@/components/StatusTag';
import { authApi } from '@/services/auth';
import { coachesApi, type Coach } from '@/services/coaches';
import { courseSessionsApi, type CourseSession } from '@/services/courseSessions';
import { coursesApi, type Course } from '@/services/courses';
import { CRUD_MODAL_WIDTH } from '@/styles/dimensions';
import pageCls from '@/styles/page.module.css';
import { getErrorMessage } from '@/utils/errors';
import { hasRequiredPermissions } from '@/utils/menu';
import styles from './index.module.css';

type SessionFormValues = {
  courseId: string;
  coachId?: string | null;
  startsAt: Dayjs;
  endsAt: Dayjs;
  capacity?: number;
  location?: string;
  isActive: boolean;
};

const formatDateTime = (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-');
const formatTime = (value?: string) => (value ? dayjs(value).format('HH:mm') : '-');
const getBookedCount = (session: CourseSession) => session.bookedCount ?? session._count?.bookings ?? 0;
const getSessionCoachLabel = (session: CourseSession) => {
  if (!session.coach?.name) {
    return '待安排';
  }

  return session.coachSource === 'COURSE_DEFAULT'
    ? `${session.coach.name}（课程默认）`
    : session.coach.name;
};

export default function SchedulePage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<SessionFormValues>();
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<CourseSession | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [courseFilter, setCourseFilter] = useState<string | undefined>();
  const [coachFilter, setCoachFilter] = useState<string | undefined>();
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>();
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf('day'), dayjs().add(14, 'day').endOf('day')]);
  const [updatingSessionId, setUpdatingSessionId] = useState<string | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [currentUserPermissions, setCurrentUserPermissions] = useState<string[]>([]);
  const [currentUserRoleCode, setCurrentUserRoleCode] = useState('');

  const canWriteCourses = currentUserRoleCode === 'OWNER' || hasRequiredPermissions(currentUserPermissions, ['WRITE:COURSES']);
  const canManageCourses = currentUserRoleCode === 'OWNER' || hasRequiredPermissions(currentUserPermissions, ['MANAGE:COURSES']);

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

  const loadOptions = useCallback(async () => {
    const [courseList, coachList] = await Promise.all([
      coursesApi.getAll(),
      coachesApi.getAll(),
    ]);
    setCourses(courseList);
    setCoaches(coachList);
  }, []);

  const loadSessions = useCallback(async (page = currentPage) => {
    try {
      setLoading(true);
      const response = await courseSessionsApi.getPaged({
        page,
        pageSize,
        from: range[0].toISOString(),
        to: range[1].toISOString(),
        courseId: courseFilter,
        coachId: coachFilter,
        isActive: activeFilter,
      });
      setSessions(response.data);
      setTotal(response.meta.total);
      setCurrentPage(page);
    } catch (err) {
      messageApi.error(getErrorMessage(err, '加载排课失败'));
    } finally {
      setLoading(false);
    }
  }, [activeFilter, coachFilter, courseFilter, currentPage, messageApi, pageSize, range]);

  useEffect(() => {
    void loadOptions().catch((err) => messageApi.error(getErrorMessage(err, '加载课程/教练选项失败')));
  }, [loadOptions, messageApi]);

  useEffect(() => {
    void loadSessions(1);
  }, [activeFilter, coachFilter, courseFilter, range]); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => {
    const activeCount = sessions.filter((item) => item.isActive).length;
    const booked = sessions.reduce((sum, item) => sum + getBookedCount(item), 0);
    const capacity = sessions.reduce((sum, item) => sum + item.capacity, 0);
    return [
      { title: '当前课节', value: String(total), hint: '筛选范围内总课节', tone: 'mint' as const },
      { title: '开放预约', value: String(activeCount), hint: '可在小程序展示', tone: 'violet' as const },
      { title: '已预约', value: String(booked), hint: '当前筛选内预约数', tone: 'orange' as const },
      { title: '容量利用', value: capacity ? `${Math.round((booked / capacity) * 100)}%` : '-', hint: '已预约 / 总容量', tone: 'pink' as const },
    ];
  }, [sessions, total]);

  const filterSummary = [
    courseFilter ? `课程：${courses.find((course) => course.id === courseFilter)?.name || '已选课程'}` : null,
    coachFilter ? `教练：${coaches.find((coach) => coach.id === coachFilter)?.name || '已选教练'}` : null,
    activeFilter !== undefined ? `状态：${activeFilter ? '开放预约' : '已暂停'}` : null,
  ].filter(Boolean);

  const openCreateModal = () => {
    if (!canWriteCourses) {
      messageApi.warning('当前账号没有排课写入权限');
      return;
    }
    setEditingSession(null);
    form.setFieldsValue({
      courseId: undefined,
      coachId: undefined,
      startsAt: dayjs().add(1, 'day').hour(10).minute(0).second(0),
      endsAt: dayjs().add(1, 'day').hour(11).minute(0).second(0),
      capacity: 8,
      location: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (session: CourseSession) => {
    if (!canWriteCourses) {
      messageApi.warning('当前账号没有排课编辑权限');
      return;
    }
    setEditingSession(session);
    form.setFieldsValue({
      courseId: session.courseId,
      coachId: session.coachId || undefined,
      startsAt: dayjs(session.startsAt),
      endsAt: dayjs(session.endsAt),
      capacity: session.capacity,
      location: session.location,
      isActive: session.isActive,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSession(null);
    form.resetFields();
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (!values.endsAt.isAfter(values.startsAt)) {
        form.setFields([{ name: 'endsAt', errors: ['结束时间必须晚于开始时间'] }]);
        return;
      }

      setSaving(true);
      const payload = {
        courseId: values.courseId,
        coachId: values.coachId || (editingSession ? null : undefined),
        startsAt: values.startsAt.toISOString(),
        endsAt: values.endsAt.toISOString(),
        capacity: values.capacity,
        location: values.location?.trim() || undefined,
        isActive: values.isActive,
      };

      if (editingSession) {
        await courseSessionsApi.update(editingSession.id, payload);
        messageApi.success('课节已更新，小程序预约页将同步最新排课');
      } else {
        await courseSessionsApi.create(payload);
        messageApi.success('课节已创建，可在小程序预约页展示');
      }
      closeModal();
      await loadSessions(currentPage);
    } catch (err) {
      messageApi.error(getErrorMessage(err, '保存排课失败'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (session: CourseSession) => {
    if (!canWriteCourses) {
      messageApi.warning('当前账号没有排课编辑权限');
      return;
    }
    try {
      setUpdatingSessionId(session.id);
      await courseSessionsApi.update(session.id, { isActive: !session.isActive });
      messageApi.success(session.isActive ? '课节已暂停展示' : '课节已开放预约');
      await loadSessions(currentPage);
    } catch (err) {
      messageApi.error(getErrorMessage(err, '更新课节状态失败'));
    } finally {
      setUpdatingSessionId(null);
    }
  };

  const handleDelete = async (session: CourseSession) => {
    if (!canManageCourses) {
      messageApi.warning('当前账号没有排课删除权限');
      return;
    }
    try {
      setDeletingSessionId(session.id);
      await courseSessionsApi.delete(session.id);
      messageApi.success('课节已删除');
      await loadSessions(currentPage);
    } catch (err) {
      messageApi.error(getErrorMessage(err, '删除课节失败'));
    } finally {
      setDeletingSessionId(null);
    }
  };

  return (
    <div className={`${pageCls.page} ${pageCls.workPage}`}>
      {contextHolder}
      <PageHeader
        title="排课管理"
        subtitle="维护小程序可预约课节、容量、地点和开放状态。"
        extra={(
          <div className={pageCls.pageHeaderActionGroup}>
            <ActionButton ghost icon={<ReloadOutlined />} onClick={() => loadSessions(currentPage)}>刷新</ActionButton>
            <ActionButton icon={<PlusOutlined />} onClick={openCreateModal} disabled={!canWriteCourses}>新增课节</ActionButton>
          </div>
        )}
      />

      <div className={pageCls.heroGrid}>
        {stats.map((item) => <StatCard key={item.title} {...item} icon={<CalendarOutlined />} />)}
      </div>

      <SectionCard title="课节列表" subtitle="小程序预约页只展示未来且开放预约的课节。">
        <Spin spinning={loading}>
          <div className={pageCls.sectionContentStack}>
            <div className={pageCls.sectionSummaryRow}>
              <div className={pageCls.sectionSummaryText}>
                {filterSummary.length
                  ? `已按${filterSummary.join('、')}筛选，当前匹配 ${total} 个课节。`
                  : `当前列表按排课时间排序，未来且开放预约的课节会同步展示到小程序预约页。`}
              </div>
              <div className={pageCls.statusMetaWrap}>
                <span className={pageCls.sectionMetaPill}>调整后自动同步</span>
                <span className={pageCls.sectionMetaPill}>停用后小程序隐藏</span>
              </div>
            </div>

            <div className={pageCls.toolbar}>
              <div className={`${pageCls.toolbarLeft} ${styles.scheduleFilters}`}>
                <DatePicker.RangePicker
                  showTime
                  className={styles.rangePicker}
                  value={range}
                  onChange={(value) => {
                    if (value?.[0] && value?.[1]) {
                      setRange([value[0], value[1]]);
                    }
                  }}
                />
                <Select
                  allowClear
                  placeholder="课程"
                  className={`${pageCls.toolbarSelect} ${styles.filterSelect}`}
                  value={courseFilter}
                  onChange={setCourseFilter}
                  options={courses.map((course) => ({ label: course.name, value: course.id }))}
                />
                <Select
                  allowClear
                  placeholder="教练"
                  className={`${pageCls.toolbarSelect} ${styles.filterSelect}`}
                  value={coachFilter}
                  onChange={setCoachFilter}
                  options={coaches.map((coach) => ({ label: coach.name, value: coach.id }))}
                />
                <Select
                  allowClear
                  placeholder="开放状态"
                  className={`${pageCls.toolbarSelect} ${styles.filterSelect}`}
                  value={activeFilter}
                  onChange={setActiveFilter}
                  options={[
                    { value: true, label: '开放预约' },
                    { value: false, label: '已暂停' },
                  ]}
                />
              </div>
            </div>

            {sessions.length ? (
              <>
                <div className={pageCls.sectionListStack}>
                  {sessions.map((session) => {
                    const bookedCount = getBookedCount(session);
                    const capacityText = `${bookedCount} / ${session.capacity}`;
                    const isFull = session.capacity > 0 && bookedCount >= session.capacity;

                    return (
                      <article key={session.id} className={styles.sessionCard}>
                        <div className={styles.sessionDateBlock}>
                          <div className={styles.sessionDay}>{dayjs(session.startsAt).format('MM-DD')}</div>
                          <div className={styles.sessionWeek}>{dayjs(session.startsAt).format('ddd')}</div>
                          <div className={styles.sessionTime}>{formatTime(session.startsAt)}</div>
                        </div>

                        <div className={styles.sessionMain}>
                          <div className={styles.sessionHeader}>
                            <div>
                              <h3 className={styles.sessionTitle}>{session.course?.name || '未命名课程'}</h3>
                              <div className={styles.sessionSub}>
                                {session.sessionCode || session.id} · {formatDateTime(session.startsAt)} - {formatTime(session.endsAt)}
                              </div>
                            </div>
                            <StatusTag status={session.isActive ? '开放预约' : '已暂停'} />
                          </div>

                          <div className={styles.sessionMetaGrid}>
                            <div className={styles.metaCard}>
                              <span className={styles.metaLabel}>教练</span>
                              <span className={styles.metaValue}>{getSessionCoachLabel(session)}</span>
                            </div>
                            <div className={styles.metaCard}>
                              <span className={styles.metaLabel}>地点</span>
                              <span className={styles.metaValue}>{session.location || '门店待分配'}</span>
                            </div>
                            <div className={styles.metaCard}>
                              <span className={styles.metaLabel}>容量</span>
                              <span className={isFull ? styles.metaValueDanger : styles.metaValue}>{capacityText}</span>
                            </div>
                          </div>
                        </div>

                        <aside className={styles.sessionActions}>
                          <Button
                            size="large"
                            className={pageCls.cardActionSecondary}
                            icon={<EditOutlined />}
                            onClick={() => openEditModal(session)}
                            disabled={!canWriteCourses}
                          >
                            编辑
                          </Button>
                          <Button
                            size="large"
                            className={session.isActive ? pageCls.cardActionWarning : pageCls.cardActionPrimary}
                            type={session.isActive ? 'default' : 'primary'}
                            onClick={() => handleToggle(session)}
                            loading={updatingSessionId === session.id}
                            disabled={!canWriteCourses || (updatingSessionId !== null && updatingSessionId !== session.id)}
                          >
                            {session.isActive ? '暂停' : '开放'}
                          </Button>
                          <Popconfirm
                            title="确认删除该课节？"
                            description="删除后小程序预约页将不再展示该课节。"
                            okText="删除"
                            cancelText="取消"
                            okButtonProps={{ danger: true }}
                            onConfirm={() => handleDelete(session)}
                          >
                            <Button
                              danger
                              size="large"
                              className={pageCls.cardActionSecondary}
                              icon={<DeleteOutlined />}
                              loading={deletingSessionId === session.id}
                              disabled={!canManageCourses || (deletingSessionId !== null && deletingSessionId !== session.id)}
                            >
                              删除
                            </Button>
                          </Popconfirm>
                        </aside>
                      </article>
                    );
                  })}
                </div>

                <div className={pageCls.sectionPagination}>
                  <Pagination
                    current={currentPage}
                    pageSize={pageSize}
                    total={total}
                    onChange={(page) => loadSessions(page)}
                    showSizeChanger={false}
                  />
                </div>
              </>
            ) : (
              <div className={pageCls.sectionEmptyState}>
                <EmptyState
                  title="暂无课节"
                  description="当前筛选范围内暂无排课。新增开放课节后，小程序预约页会同步展示。"
                  actionText={canWriteCourses ? '新增课节' : undefined}
                  onAction={canWriteCourses ? openCreateModal : undefined}
                />
              </div>
            )}
          </div>
        </Spin>
      </SectionCard>

      <Modal
        className={pageCls.crudModal}
        title={editingSession ? '编辑课节' : '新增课节'}
        open={isModalOpen}
        onCancel={closeModal}
        onOk={handleSave}
        confirmLoading={saving}
        okText={editingSession ? '保存修改' : '新增课节'}
        cancelText="取消"
        width={CRUD_MODAL_WIDTH}
        destroyOnHidden
        forceRender
      >
        <Form form={form} layout="vertical" className={pageCls.crudModalForm} initialValues={{ isActive: true }}>
          <Row gutter={18}>
            <Col xs={24} md={12}>
              <Form.Item name="courseId" label="课程" rules={[{ required: true, message: '请选择课程' }]}>
                <Select
                  className={pageCls.settingsInput}
                  placeholder="选择课程"
                  options={courses.map((course) => ({ label: course.name, value: course.id }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="coachId" label="教练" extra="不选则使用课程管理中绑定的默认教练。">
                <Select
                  allowClear
                  className={pageCls.settingsInput}
                  placeholder="选择教练（可选）"
                  options={coaches.map((coach) => ({ label: coach.name, value: coach.id }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="startsAt" label="开始时间" rules={[{ required: true, message: '请选择开始时间' }]}>
                <DatePicker className={`${pageCls.settingsInput} ${pageCls.fullWidthControl}`} showTime />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="endsAt" label="结束时间" rules={[{ required: true, message: '请选择结束时间' }]}>
                <DatePicker className={`${pageCls.settingsInput} ${pageCls.fullWidthControl}`} showTime />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="capacity" label="容量">
                <InputNumber className={`${pageCls.settingsInput} ${pageCls.fullWidthControl}`} min={1} precision={0} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="location" label="上课地点">
                <Input className={pageCls.settingsInput} placeholder="例如：一号教室 / Reformer 区" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="isActive" label="开放小程序预约" valuePropName="checked">
                <Switch checkedChildren="开放" unCheckedChildren="暂停" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
