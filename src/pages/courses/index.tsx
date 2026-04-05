import { AppstoreOutlined, CalendarOutlined, DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, SearchOutlined, StarOutlined } from '@ant-design/icons';
import { Button, Col, Descriptions, Drawer, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Spin, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import ActionButton from '@/components/ActionButton';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import { coursesApi, type Course } from '@/services/courses';
import { coachesApi, type Coach } from '@/services/coaches';
import { reportsApi } from '@/services/reports';

const iconMap = {
  calendar: <CalendarOutlined />,
  app: <AppstoreOutlined />,
  percent: <CalendarOutlined />,
  star: <StarOutlined />
};

type CourseFormValues = {
  name: string;
  type: string;
  level: string;
  coachId?: string;
  durationMinutes: number;
  capacity: number;
  isActive: boolean;
};

const CRUD_MODAL_WIDTH = 780;

export default function CoursesPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<CourseFormValues>();
  const [courseList, setCourseList] = useState<Course[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('全部');
  const [levelFilter, setLevelFilter] = useState<string>('全部');
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [detailCourse, setDetailCourse] = useState<Course | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalCourses: 0,
    weeklySessions: 0,
    avgOccupancy: '87%',
    popularCourse: '-',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [coursesData, coachesData, reportsData] = await Promise.all([
          coursesApi.getAll(),
          coachesApi.getAll(),
          reportsApi.getBookings(
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            new Date().toISOString().split('T')[0]
          ).catch(() => null),
        ]);
        setCourseList(coursesData);
        setCoaches(coachesData);

        const totalCourses = coursesData.length;
        const weeklySessions = coursesData.reduce((sum, c) => sum + (c._count?.sessions || 0), 0);
        const popularCourse = totalCourses > 0
          ? coursesData.reduce((max, c) => ((c._count?.sessions || 0) > (max._count?.sessions || 0) ? c : max), coursesData[0])?.name || '-'
          : '-';

        setStats({
          totalCourses,
          weeklySessions,
          avgOccupancy: '87%',
          popularCourse,
        });
      } catch (err) {
        messageApi.error('获取课程数据失败');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const refreshCourses = async (silent = false) => {
    try {
      if (!silent) setIsRefreshing(true);
      const refreshed = await coursesApi.getAll();
      setCourseList(refreshed);

      const totalCourses = refreshed.length;
      const weeklySessions = refreshed.reduce((sum, c) => sum + (c._count?.sessions || 0), 0);
      const popularCourse = totalCourses > 0
        ? refreshed.reduce((max, c) => ((c._count?.sessions || 0) > (max._count?.sessions || 0) ? c : max), refreshed[0])?.name || '-'
        : '-';

      setStats((current) => ({
        ...current,
        totalCourses,
        weeklySessions,
        popularCourse,
      }));
    } catch (err: any) {
      messageApi.error(err.message || '刷新课程失败');
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  };

  const courseTypeOptions = useMemo(
    () => Array.from(new Set(courseList.map((course) => course.type))),
    [courseList]
  );

  const courseLevelOptions = useMemo(
    () => Array.from(new Set(courseList.map((course) => course.level))),
    [courseList]
  );

  const filteredCourses = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase();

    return courseList.filter((course) => {
      const matchesKeyword =
        keyword.length === 0 ||
        course.name.toLowerCase().includes(keyword) ||
        (course.coach?.name || '').toLowerCase().includes(keyword);
      const matchesType = typeFilter === '全部' || course.type === typeFilter;
      const matchesLevel = levelFilter === '全部' || course.level === levelFilter;

      return matchesKeyword && matchesType && matchesLevel;
    });
  }, [courseList, levelFilter, searchValue, typeFilter]);

  const courseStats = useMemo(() => [
    { title: '课程总数', value: String(stats.totalCourses), hint: '覆盖常规课程', tone: 'mint' as const, icon: 'calendar' as const },
    { title: '本周课程', value: String(stats.weeklySessions), hint: '已排期课时', tone: 'violet' as const, icon: 'app' as const },
    { title: '平均上座率', value: stats.avgOccupancy, hint: '↑ 5.3% vs 上周', tone: 'orange' as const, icon: 'percent' as const },
    { title: '最受欢迎', value: stats.popularCourse, hint: '满座率最高', tone: 'pink' as const, icon: 'star' as const },
  ], [stats]);

  const openCreateModal = () => {
    setEditingCourse(null);
    form.setFieldsValue({
      name: '',
      type: '',
      level: '初级',
      coachId: undefined,
      durationMinutes: 50,
      capacity: 8,
      isActive: true,
    });
    setIsFormOpen(true);
  };

  const openEditModal = (course: Course) => {
    setEditingCourse(course);
    form.setFieldsValue({
      name: course.name,
      type: course.type,
      level: course.level,
      coachId: course.coach?.id,
      durationMinutes: course.durationMinutes,
      capacity: course.capacity,
      isActive: course.isActive,
    });
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    setEditingCourse(null);
    form.resetFields();
  };

  const handleSaveCourse = async () => {
    try {
      setIsSaving(true);
      const values = await form.validateFields();

      if (editingCourse) {
        await coursesApi.update(editingCourse.id, values);
        messageApi.success('课程信息已更新');
      } else {
        await coursesApi.create(values);
        messageApi.success('课程已创建');
      }

      const refreshed = await coursesApi.getAll();
      setCourseList(refreshed);

      if (detailCourse && editingCourse) {
        const updated = refreshed.find((c) => c.id === detailCourse.id) || null;
        setDetailCourse(updated);
      }

      closeFormModal();
    } catch (err: any) {
      messageApi.error(err.message || '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCourse = async (course: Course) => {
    try {
      await coursesApi.delete(course.id);
      setCourseList((current) => current.filter((item) => item.id !== course.id));

      if (detailCourse?.id === course.id) {
        setDetailCourse(null);
      }

      messageApi.success(`已删除课程 ${course.name}`);
    } catch (err: any) {
      messageApi.error(err.message || '删除失败');
    }
  };

  if (loading && courseList.length === 0) {
    return (
      <div className={pageCls.page}>
        {contextHolder}
        <PageHeader
          title="课程管理"
          subtitle="管理所有课程设置和排期。"
          extra={<ActionButton icon={<PlusOutlined />} onClick={openCreateModal}>新增课程</ActionButton>}
        />
        <div className={`${pageCls.centeredState} ${pageCls.centeredStateTall}`}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  return (
    <div className={pageCls.page}>
      {contextHolder}
      <PageHeader
        title="课程管理"
        subtitle="管理所有课程设置和排期。"
        extra={(
          <div className={`${pageCls.pageHeaderActionGroup} ${pageCls.pageHeaderActionGroupWide}`}>
            <div className={pageCls.splitButtonGroup}>
              <ActionButton ghost loading={isRefreshing} onClick={() => refreshCourses()}>
                刷新列表
              </ActionButton>
              <ActionButton icon={<PlusOutlined />} onClick={openCreateModal}>新增课程</ActionButton>
            </div>
          </div>
        )}
      />

      <div className={pageCls.heroGrid}>
        {courseStats.map((item) => (
          <StatCard key={item.title} {...item} icon={iconMap[item.icon]} />
        ))}
      </div>

      <div className={pageCls.toolbar}>
        <div className={pageCls.toolbarLeft}>
          <Input
            className={pageCls.toolbarSearch}
            size="large"
            value={searchValue}
            prefix={<SearchOutlined />}
            placeholder="按课程名称或教练搜索"
            onChange={(event) => setSearchValue(event.target.value)}
          />
        </div>
        <div className={pageCls.toolbarRight}>
            <Select
              value={typeFilter}
              size="large"
            style={{ minWidth: 140 }}
            className={pageCls.settingsInput}
            options={[{ label: '全部类型', value: '全部' }, ...courseTypeOptions.map((item) => ({ label: item, value: item }))]}
            onChange={(value: string) => setTypeFilter(value)}
          />
          <Select
            value={levelFilter}
            size="large"
            style={{ minWidth: 140 }}
            className={pageCls.settingsInput}
            options={[{ label: '全部难度', value: '全部' }, ...courseLevelOptions.map((item) => ({ label: item, value: item }))]}
            onChange={(value: string) => setLevelFilter(value)}
            />
            <Button
              size="large"
              className={pageCls.toolbarGhostAction}
              onClick={() => {
                setSearchValue('');
                setTypeFilter('全部');
                setLevelFilter('全部');
              }}
            >
              重置筛选
            </Button>
          </div>
        </div>

      <div className={widgetCls.courseGrid}>
        {filteredCourses.map((course) => (
          <div key={course.id} className={widgetCls.detailCard}>
            <div className={widgetCls.detailHeader}>
              <div>
                <h3 className={widgetCls.detailTitle}>{course.name}</h3>
                <div className={`${widgetCls.chipRow} ${pageCls.topSpaceSm}`}>
                  <span className={widgetCls.chipPrimary}>{course.type}</span>
                  {!course.isActive && <span className={widgetCls.chipLevel}>已停用</span>}
                </div>
              </div>
              <span className={widgetCls.chipLevel}>{course.level}</span>
            </div>

            <div className={widgetCls.metricGrid}>
              <div className={widgetCls.metricCard}>
                <div className={widgetCls.metricLabel}>教练</div>
                <div className={widgetCls.metricValue}>{course.coach?.name || '-'}</div>
              </div>
              <div className={widgetCls.metricCard}>
                <div className={widgetCls.metricLabel}>时长</div>
                <div className={widgetCls.metricValue}>{course.durationMinutes} 分钟</div>
              </div>
              <div className={widgetCls.metricCard}>
                <div className={widgetCls.metricLabel}>容量</div>
                <div className={widgetCls.metricValue}>{course.capacity} 人</div>
              </div>
            </div>

            <div className={`${widgetCls.twoButtons} ${pageCls.courseCardActionGroup}`}>
              <Button
                type="primary"
                size="middle"
                className={`${pageCls.cardActionPrimary} ${pageCls.courseCardActionBtn}`}
                icon={<EditOutlined />}
                onClick={() => openEditModal(course)}
              >
                编辑课程
              </Button>
              <Button
                size="middle"
                className={`${pageCls.cardActionSecondary} ${pageCls.courseCardActionBtn} ${pageCls.courseCardActionSecondary}`}
                icon={<EyeOutlined />}
                onClick={() => setDetailCourse(course)}
              >
                查看详情
              </Button>
            </div>
          </div>
        ))}
      </div>

      {filteredCourses.length === 0 ? (
        <div className={`${pageCls.surface} ${widgetCls.detailCard} ${pageCls.surfaceTopSpace}`}>
          <div className={widgetCls.detailTitle}>暂无符合条件的课程</div>
          <div className={`${widgetCls.smallText} ${pageCls.topSpaceSm}`}>修改搜索词或筛选条件后再试。</div>
        </div>
      ) : null}

      <Modal
        className={pageCls.crudModal}
        title={editingCourse ? '编辑课程' : '新增课程'}
        open={isFormOpen}
        width={CRUD_MODAL_WIDTH}
        onCancel={closeFormModal}
        onOk={handleSaveCourse}
        confirmLoading={isSaving}
        okText={editingCourse ? '保存修改' : '新增课程'}
        cancelText="取消"
        destroyOnHidden
      >
        <Form form={form} className={pageCls.crudModalForm} layout="vertical">
          <Row gutter={18}>
            <Col xs={24} md={12}>
              <Form.Item name="name" label="课程名称" rules={[{ required: true, message: '请输入课程名称' }]}>
                <Input className={pageCls.settingsInput} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="type" label="课程类型" rules={[{ required: true, message: '请输入课程类型' }]}>
                <Input className={pageCls.settingsInput} placeholder="例如：Reformer" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="level" label="课程难度" rules={[{ required: true, message: '请选择课程难度' }]}>
                <Select
                  className={pageCls.settingsInput}
                  options={[
                    { label: '初级', value: '初级' },
                    { label: '中级', value: '中级' },
                    { label: '高级', value: '高级' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="coachId" label="授课教练" rules={[{ required: true, message: '请选择授课教练' }]}>
                <Select
                  className={pageCls.settingsInput}
                  placeholder="请选择教练"
                  options={coaches.map((coach) => ({ label: coach.name, value: coach.id }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="durationMinutes" label="课程时长（分钟）" rules={[{ required: true, message: '请输入课程时长' }]}>
                <InputNumber className={pageCls.settingsInput} style={{ width: '100%' }} min={1} precision={0} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="capacity" label="课程容量（人）" rules={[{ required: true, message: '请输入课程容量' }]}>
                <InputNumber className={pageCls.settingsInput} style={{ width: '100%' }} min={1} precision={0} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="isActive" label="课程状态" rules={[{ required: true, message: '请选择课程状态' }]}>
                <Select
                  className={pageCls.settingsInput}
                  options={[
                    { label: '正常', value: true },
                    { label: '已停用', value: false },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Drawer
        open={detailCourse !== null}
        width={460}
        title={detailCourse?.name ?? '课程详情'}
        onClose={() => setDetailCourse(null)}
        extra={detailCourse ? (
          <div className={pageCls.drawerActionGroup}>
            <Button className={pageCls.courseDrawerAction} icon={<EditOutlined />} onClick={() => openEditModal(detailCourse)}>编辑</Button>
            <Popconfirm title="确认删除该课程吗？" okText="删除" cancelText="取消" onConfirm={() => handleDeleteCourse(detailCourse)}>
              <Button className={pageCls.courseDrawerAction} danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          </div>
        ) : null}
      >
        {detailCourse ? (
          <div className={pageCls.detailContentStack}>
            <div className={widgetCls.detailOverviewPanel}>
              <div className={widgetCls.detailOverviewSummary}>
                <div className={widgetCls.recordTitle}>{detailCourse.name}</div>
                <div className={widgetCls.chipRow}>
                  <span className={widgetCls.chipPrimary}>{detailCourse.type}</span>
                  <span className={widgetCls.chipLevel}>{detailCourse.level}</span>
                </div>
              </div>
              <div className={widgetCls.detailOverviewStatGrid}>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatMint}`}>
                  <div className={widgetCls.detailInsightLabel}>教练</div>
                  <div className={widgetCls.detailOverviewStatValue} style={{ fontSize: 'var(--font-size-xl)' }}>{detailCourse.coach?.name || '-'}</div>
                </div>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatViolet}`}>
                  <div className={widgetCls.detailInsightLabel}>时长</div>
                  <div className={widgetCls.detailOverviewStatValue} style={{ fontSize: 'var(--font-size-xl)' }}>{detailCourse.durationMinutes} 分钟</div>
                </div>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatOrange}`}>
                  <div className={widgetCls.detailInsightLabel}>容量</div>
                  <div className={widgetCls.detailOverviewStatValue} style={{ fontSize: 'var(--font-size-xl)' }}>{detailCourse.capacity} 人</div>
                </div>
              </div>
            </div>

            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="课程名称">{detailCourse.name}</Descriptions.Item>
              <Descriptions.Item label="课程类型">{detailCourse.type}</Descriptions.Item>
              <Descriptions.Item label="课程难度">{detailCourse.level}</Descriptions.Item>
              <Descriptions.Item label="授课教练">{detailCourse.coach?.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="课程时长">{detailCourse.durationMinutes} 分钟</Descriptions.Item>
              <Descriptions.Item label="课程容量">{detailCourse.capacity} 人</Descriptions.Item>
              <Descriptions.Item label="课程状态">{detailCourse.isActive ? '正常' : '已停用'}</Descriptions.Item>
            </Descriptions>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
