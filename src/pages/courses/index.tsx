import { AppstoreOutlined, CalendarOutlined, DeleteOutlined, EditOutlined, PlusOutlined, StarOutlined } from '@ant-design/icons';
import { Button, Col, Descriptions, Drawer, Form, Input, InputNumber, Modal, Pagination, Popconfirm, Row, Select, Spin, message } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ActionButton from '@/components/ActionButton';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatCard from '@/components/StatCard';
import { COURSE_DETAIL_DRAWER_WIDTH, CRUD_MODAL_WIDTH } from '@/styles/dimensions';
import pageCls from '@/styles/page.module.css';
import { coursesApi, type Course } from '@/services/courses';
import { coachesApi, type Coach } from '@/services/coaches';
import { reportsApi } from '@/services/reports';
import { getErrorMessage } from '@/utils/errors';
import {
  CourseBrowseShell,
  CourseDetailOverviewCard,
  type CourseListCardProps,
} from './components';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({
    totalCourses: 0,
    weeklySessions: 0,
    avgOccupancy: '87%',
    popularCourse: '-',
  });

  const fetchCourses = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const [coursesResponse, coachesData, reportsData] = await Promise.all([
          coursesApi.getPaged({
            page,
            pageSize,
            search: searchValue.trim() || undefined,
            type: typeFilter === '全部' ? undefined : typeFilter,
            level: levelFilter === '全部' ? undefined : levelFilter,
          }),
          coachesApi.getAll(),
          reportsApi.getBookings(
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            new Date().toISOString().split('T')[0]
          ).catch(() => null),
        ]);
        const coursesData = coursesResponse.data;
        setCourseList(coursesData);
        setCurrentPage(coursesResponse.meta.page);
        setTotal(coursesResponse.meta.total);
        setCoaches(coachesData);

        const totalCourses = coursesData.length;
        const weeklySessions = coursesData.reduce((sum, c) => sum + (c._count?.sessions || 0), 0);
        const popularCourse = totalCourses > 0
          ? coursesData.reduce((max, c) => ((c._count?.sessions || 0) > (max._count?.sessions || 0) ? c : max), coursesData[0])?.name || '-'
          : '-';

        // 从报告数据计算真实的上座率
        let avgOccupancy = '-';
        if (reportsData && reportsData.totalBookings > 0) {
          const occupancyRate = ((reportsData.confirmedBookings / reportsData.totalBookings) * 100).toFixed(1);
          avgOccupancy = `${occupancyRate}%`;
        }

        setStats({
          totalCourses: coursesResponse.meta.total,
          weeklySessions,
          avgOccupancy,
          popularCourse,
        });
      } catch (err) {
        messageApi.error('获取课程数据失败');
      } finally {
        setLoading(false);
      }
  }, [levelFilter, messageApi, pageSize, searchValue, typeFilter]);

  useEffect(() => {
    void fetchCourses(currentPage);
  }, [currentPage, fetchCourses]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchValue, typeFilter, levelFilter]);

  const courseTypeOptions = useMemo(
    () => Array.from(new Set(courseList.map((course) => course.type))),
    [courseList]
  );

  const courseLevelOptions = useMemo(
    () => Array.from(new Set(courseList.map((course) => course.level))),
    [courseList]
  );

  const resetFilters = () => {
    setSearchValue('');
    setTypeFilter('全部');
    setLevelFilter('全部');
  };

  const courseStats = useMemo(() => [
    { title: '课程总数', value: String(stats.totalCourses), hint: '覆盖常规课程', tone: 'mint' as const, icon: 'calendar' as const },
    { title: '本周课程', value: String(stats.weeklySessions), hint: '已排期课时', tone: 'violet' as const, icon: 'app' as const },
    { title: '平均上座率', value: stats.avgOccupancy, hint: '↑ 5.3% vs 上周', tone: 'orange' as const, icon: 'percent' as const },
    { title: '最受欢迎', value: stats.popularCourse, hint: '满座率最高', tone: 'pink' as const, icon: 'star' as const },
  ], [stats]);

  const courseBrowseSubtitle =
    searchValue.trim().length > 0 || typeFilter !== '全部' || levelFilter !== '全部'
      ? '已根据关键词、课程类型与难度缩小范围，保留全部课程维护与详情操作。'
      : '按课程名称、课程类型与难度快速浏览课程，保持后台配置与查看路径清晰统一。';

  const courseCardItems: CourseListCardProps[] = courseList.map((course) => ({
    id: course.id,
    codeText: course.courseCode || 'COURSE',
    name: course.name,
    summaryText: course.isActive
      ? '当前课程可继续用于排期与课程维护。'
      : '当前课程已停用，仍保留基础档案与历史排期。',
    typeLabel: course.type,
    levelLabel: course.level,
    statusLabel: course.isActive ? '正常开课' : '已停用',
    statusTone: course.isActive ? 'active' : 'inactive',
    coachName: course.coach?.name || '未安排教练',
    durationText: `${course.durationMinutes} 分钟`,
    capacityText: `${course.capacity} 人`,
    sessionCountText: `已排 ${course._count?.sessions || 0} 节`,
    onEdit: () => openEditModal(course),
    onViewDetail: () => setDetailCourse(course),
  }));

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
    let values: CourseFormValues;

    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    try {
      setIsSaving(true);
      if (editingCourse) {
        await coursesApi.update(editingCourse.id, values);
        messageApi.success('课程信息已更新');
      } else {
        await coursesApi.create(values);
        messageApi.success('课程已创建');
      }

      const refreshed = await coursesApi.getPaged({
        page: currentPage,
        pageSize,
        search: searchValue.trim() || undefined,
        type: typeFilter === '全部' ? undefined : typeFilter,
        level: levelFilter === '全部' ? undefined : levelFilter,
      });
      setCourseList(refreshed.data);
      setTotal(refreshed.meta.total);

      const totalCourses = refreshed.meta.total;
      const weeklySessions = refreshed.data.reduce((sum, c) => sum + (c._count?.sessions || 0), 0);
      const popularCourse = totalCourses > 0
        ? refreshed.data.reduce((max, c) => ((c._count?.sessions || 0) > (max._count?.sessions || 0) ? c : max), refreshed.data[0])?.name || '-'
        : '-';

      setStats((current) => ({
        ...current,
        totalCourses,
        weeklySessions,
        popularCourse,
      }));

      if (editingCourse && detailCourse?.id === editingCourse.id) {
        const updated = refreshed.data.find((c) => c.id === editingCourse.id) || null;
        setDetailCourse(updated);
      }

      closeFormModal();
    } catch (err) {
      messageApi.error(getErrorMessage(err, '保存失败'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCourse = async (course: Course) => {
    try {
      await coursesApi.delete(course.id);
      const refreshed = await coursesApi.getPaged({
        page: currentPage,
        pageSize,
        search: searchValue.trim() || undefined,
        type: typeFilter === '全部' ? undefined : typeFilter,
        level: levelFilter === '全部' ? undefined : levelFilter,
      });
      setCourseList(refreshed.data);
      setTotal(refreshed.meta.total);

      const totalCourses = refreshed.meta.total;
      const weeklySessions = refreshed.data.reduce((sum, c) => sum + (c._count?.sessions || 0), 0);
      const popularCourse = totalCourses > 0
        ? refreshed.data.reduce((max, c) => ((c._count?.sessions || 0) > (max._count?.sessions || 0) ? c : max), refreshed.data[0])?.name || '-'
        : '-';

      setStats((current) => ({
        ...current,
        totalCourses,
        weeklySessions,
        popularCourse,
      }));

      if (detailCourse?.id === course.id) {
        setDetailCourse(null);
      }

      messageApi.success(`已删除课程 ${course.name}`);
    } catch (err) {
      messageApi.error(getErrorMessage(err, '删除失败'));
    }
  };

  if (loading && courseList.length === 0) {
    return (
      <div className={`${pageCls.page} ${pageCls.workPage}`}>
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
    <div className={`${pageCls.page} ${pageCls.workPage}`}>
      {contextHolder}
      <PageHeader
        title="课程管理"
        subtitle="管理所有课程设置和排期。"
        extra={<ActionButton icon={<PlusOutlined />} onClick={openCreateModal}>新增课程</ActionButton>}
      />

      <div className={pageCls.heroGrid}>
        {courseStats.map((item) => (
          <StatCard key={item.title} {...item} icon={iconMap[item.icon]} />
        ))}
      </div>

      <CourseBrowseShell
        eyebrow="COURSE BROWSE"
        title="课程浏览"
        subtitle={courseBrowseSubtitle}
        resultCountText={`共 ${total} 门`}
        searchValue={searchValue}
        searchPlaceholder="按课程名称或教练搜索"
        typeValue={typeFilter}
        typeOptions={[{ label: '全部类型', value: '全部' }, ...courseTypeOptions.map((item) => ({ label: item, value: item }))]}
        levelValue={levelFilter}
        levelOptions={[{ label: '全部难度', value: '全部' }, ...courseLevelOptions.map((item) => ({ label: item, value: item }))]}
        resetLabel="重置筛选"
        emptyTitle="暂无符合条件的课程"
        emptyDescription="修改搜索词或筛选条件后再试。"
        courses={courseCardItems}
        onSearchChange={setSearchValue}
        onTypeChange={setTypeFilter}
        onLevelChange={setLevelFilter}
        onReset={resetFilters}
      />
      {courseList.length ? (
        <div className={pageCls.centerPagination}>
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={total}
            onChange={setCurrentPage}
            showSizeChanger={false}
          />
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
                <InputNumber className={`${pageCls.settingsInput} ${pageCls.fullWidthControl}`} min={1} precision={0} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="capacity" label="课程容量（人）" rules={[{ required: true, message: '请输入课程容量' }]}>
                <InputNumber className={`${pageCls.settingsInput} ${pageCls.fullWidthControl}`} min={1} precision={0} />
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
        width={COURSE_DETAIL_DRAWER_WIDTH}
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
            <CourseDetailOverviewCard
              eyebrow={detailCourse.courseCode || 'COURSE'}
              name={detailCourse.name}
              summaryText={detailCourse.isActive
                ? `当前已排 ${detailCourse._count?.sessions || 0} 节，可继续维护课程设置与排期关系。`
                : `课程当前已停用，保留 ${detailCourse._count?.sessions || 0} 节关联排期记录。`}
              typeLabel={detailCourse.type}
              levelLabel={detailCourse.level}
              statusLabel={detailCourse.isActive ? '正常开课' : '已停用'}
              statusTone={detailCourse.isActive ? 'active' : 'inactive'}
              coachName={detailCourse.coach?.name || '未安排教练'}
              durationText={`${detailCourse.durationMinutes} 分钟`}
              capacityText={`${detailCourse.capacity} 人`}
              sessionCountText={`已排 ${detailCourse._count?.sessions || 0} 节`}
            />

            <SectionCard
              title="课程档案"
              subtitle="保留后台管理所需的核心字段，便于核对课程基础配置与当前启用状态。"
            >
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="课程编号">{detailCourse.courseCode || '-'}</Descriptions.Item>
                <Descriptions.Item label="课程名称">{detailCourse.name}</Descriptions.Item>
                <Descriptions.Item label="课程类型">{detailCourse.type}</Descriptions.Item>
                <Descriptions.Item label="课程难度">{detailCourse.level}</Descriptions.Item>
                <Descriptions.Item label="授课教练">{detailCourse.coach?.name || '-'}</Descriptions.Item>
                <Descriptions.Item label="课程时长">{detailCourse.durationMinutes} 分钟</Descriptions.Item>
                <Descriptions.Item label="课程容量">{detailCourse.capacity} 人</Descriptions.Item>
                <Descriptions.Item label="已排课时">{detailCourse._count?.sessions || 0} 节</Descriptions.Item>
                <Descriptions.Item label="课程状态">{detailCourse.isActive ? '正常' : '已停用'}</Descriptions.Item>
              </Descriptions>
            </SectionCard>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
