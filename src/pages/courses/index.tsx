import { AppstoreOutlined, CalendarOutlined, DeleteOutlined, EditOutlined, PlusOutlined, StarOutlined } from '@ant-design/icons';
import { Button, Col, Descriptions, Drawer, Form, Input, InputNumber, Modal, Pagination, Popconfirm, Row, Select, Spin, message } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import ActionButton from '@/components/ActionButton';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatCard from '@/components/StatCard';
import { COURSE_DETAIL_DRAWER_WIDTH, CRUD_MODAL_WIDTH } from '@/styles/dimensions';
import pageCls from '@/styles/page.module.css';
import { coursesApi, type Course } from '@/services/courses';
import { coachesApi, type Coach } from '@/services/coaches';
import { authApi } from '@/services/auth';
import { getErrorMessage } from '@/utils/errors';
import { hasRequiredPermissions } from '@/utils/menu';
import { useDebouncedValue } from '@/utils/useDebouncedValue';
import {
  CourseBrowseShell,
  CourseDetailOverviewCard,
  type CourseListCardProps,
} from './components';
import styles from './index.module.css';

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
  coverImageUrl?: string;
  isActive: boolean;
};

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.readAsDataURL(file);
  });
}

const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024;

function validateImageFile(file: File) {
  if (!file.type.startsWith('image/')) {
    return '仅支持上传图片文件';
  }

  if (file.size > MAX_IMAGE_FILE_SIZE) {
    return '图片文件过大，请上传 5MB 以内图片';
  }

  return '';
}

const DEFAULT_COURSE_TYPE_OPTIONS = [
  'MAT',
  'REFORMER',
  'CADILLAC',
  'CHAIR',
  'BARREL',
  'PRIVATE',
  'YOGA',
  'FLOW',
  'STRETCH',
];

export default function CoursesPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<CourseFormValues>();
  const [courseList, setCourseList] = useState<Course[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const debouncedSearchValue = useDebouncedValue(searchValue, 350);
  const [typeFilter, setTypeFilter] = useState<string>('全部');
  const [levelFilter, setLevelFilter] = useState<string>('全部');
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [detailCourse, setDetailCourse] = useState<Course | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const courseImageInputRef = useRef<HTMLInputElement | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [currentUserPermissions, setCurrentUserPermissions] = useState<string[]>([]);
  const [currentUserRoleCode, setCurrentUserRoleCode] = useState('');
  const [stats, setStats] = useState({
    totalCourses: 0,
    weeklySessions: 0,
    avgOccupancy: '87%',
    popularCourse: '-',
  });
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

  const fetchCourses = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const [coursesResponse, allCoursesData, coachesData] = await Promise.all([
          coursesApi.getPaged({
            page,
            pageSize,
            search: debouncedSearchValue.trim() || undefined,
            type: typeFilter === '全部' ? undefined : typeFilter,
            level: levelFilter === '全部' ? undefined : levelFilter,
          }),
          coursesApi.getAll(),
          coachesApi.getAll(),
        ]);
        const coursesData = coursesResponse.data;
        setCourseList(coursesData);
        setAllCourses(allCoursesData);
        setCurrentPage(coursesResponse.meta.page);
        setTotal(coursesResponse.meta.total);
        setCoaches(coachesData);

        const totalCourses = allCoursesData.length;
        const weeklySessions = allCoursesData.reduce((sum, c) => sum + (c._count?.sessions || 0), 0);
        const popularCourse = totalCourses > 0
          ? allCoursesData.reduce((max, c) => ((c._count?.sessions || 0) > (max._count?.sessions || 0) ? c : max), allCoursesData[0])?.name || '-'
          : '-';

        const activeCourses = allCoursesData.filter((course) => course.isActive).length;
        const avgOccupancy = totalCourses > 0
          ? `${((activeCourses / totalCourses) * 100).toFixed(1)}%`
          : '-';

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
  }, [debouncedSearchValue, levelFilter, messageApi, pageSize, typeFilter]);

  useEffect(() => {
    void fetchCourses(currentPage);
  }, [currentPage, fetchCourses]);

  const courseTypeOptions = useMemo(
    () => Array.from(new Set(allCourses.map((course) => course.type))),
    [allCourses]
  );

  const normalizedCourseTypeOptions = useMemo(
    () => Array.from(new Set([...DEFAULT_COURSE_TYPE_OPTIONS, ...courseTypeOptions])),
    [courseTypeOptions],
  );

  const courseLevelOptions = useMemo(
    () => Array.from(new Set(allCourses.map((course) => course.level))),
    [allCourses]
  );

  const resetFilters = () => {
    setSearchValue('');
    setTypeFilter('全部');
    setLevelFilter('全部');
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    setCurrentPage(1);
  };

  const handleTypeChange = (value: string) => {
    setTypeFilter(value);
    setCurrentPage(1);
  };

  const handleLevelChange = (value: string) => {
    setLevelFilter(value);
    setCurrentPage(1);
  };

  const courseStats = useMemo(() => [
    { title: '课程总数', value: String(stats.totalCourses), hint: '当前课程池', tone: 'mint' as const, icon: 'calendar' as const },
    { title: '本周课程', value: String(stats.weeklySessions), hint: '本周排期课时', tone: 'violet' as const, icon: 'app' as const },
    { title: '开课活跃度', value: stats.avgOccupancy, hint: '启用课程占比', tone: 'orange' as const, icon: 'percent' as const },
    { title: '重点课程', value: stats.popularCourse, hint: '优先关注排期', tone: 'pink' as const, icon: 'star' as const },
  ], [stats]);

  const courseBrowseSubtitle =
    searchValue.trim().length > 0 || typeFilter !== '全部' || levelFilter !== '全部'
      ? '已按条件筛选。'
      : '查看课程与排期概况。';

  const courseCardItems: CourseListCardProps[] = courseList.map((course) => ({
    id: course.id,
    codeText: course.courseCode || '未设置编号',
    name: course.name,
    summaryText: course.isActive
      ? '可继续排期与维护。'
      : '当前已停用，保留档案。',
    typeLabel: course.type,
    levelLabel: course.level,
    statusLabel: course.isActive ? '正常开课' : '已停用',
    statusTone: course.isActive ? 'active' : 'inactive',
    coachName: course.coach?.name || '未安排教练',
    durationText: `${course.durationMinutes} 分钟`,
    capacityText: `${course.capacity} 人`,
    sessionCountText: `已排 ${course._count?.sessions || 0} 节`,
    primaryActionLabel: course.isActive ? '调整排期' : '恢复设置',
    primaryActionDisabled: !canWriteCourses,
    onEdit: () => openEditModal(course),
    onViewDetail: () => setDetailCourse(course),
  }));

  const openCreateModal = () => {
    if (!canWriteCourses) {
      messageApi.warning('当前账号只有查看权限，不能上传课程图片或新增课程');
      return;
    }

    setEditingCourse(null);
    form.setFieldsValue({
      name: '',
      type: DEFAULT_COURSE_TYPE_OPTIONS[0],
      level: '初级',
      coachId: undefined,
      durationMinutes: 50,
      capacity: 8,
      coverImageUrl: '',
      isActive: true,
    });
    setIsFormOpen(true);
  };

  const openEditModal = (course: Course) => {
    if (!canWriteCourses) {
      messageApi.warning('当前账号没有课程编辑权限');
      return;
    }

    setEditingCourse(course);
    form.setFieldsValue({
      name: course.name,
      type: course.type,
      level: course.level,
      coachId: course.coach?.id,
      durationMinutes: course.durationMinutes,
      capacity: course.capacity,
      coverImageUrl: course.coverImageUrl || '',
      isActive: course.isActive,
    });
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    setEditingCourse(null);
    form.resetFields();
  };

  const handleSelectCourseImage = () => {
    if (!canWriteCourses) {
      messageApi.warning('当前账号没有课程编辑权限');
      return;
    }

    courseImageInputRef.current?.click();
  };

  const handleCourseImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const validationMessage = validateImageFile(file);
      if (validationMessage) {
        messageApi.warning(validationMessage);
        return;
      }

      const imageUrl = await readFileAsDataUrl(file);
      form.setFieldValue('coverImageUrl', imageUrl);
      messageApi.success('课程图片已载入，保存后生效');
    } catch (err) {
      messageApi.error(getErrorMessage(err, '课程图片读取失败'));
    } finally {
      event.target.value = '';
    }
  };

  const handleSaveCourse = async () => {
    if (!canWriteCourses) {
      messageApi.warning('当前账号没有课程编辑权限');
      return;
    }

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

      const [refreshed, refreshedAllCourses] = await Promise.all([
        coursesApi.getPaged({
          page: currentPage,
          pageSize,
          search: searchValue.trim() || undefined,
          type: typeFilter === '全部' ? undefined : typeFilter,
          level: levelFilter === '全部' ? undefined : levelFilter,
        }),
        coursesApi.getAll(),
      ]);
      setCourseList(refreshed.data);
      setAllCourses(refreshedAllCourses);
      setTotal(refreshed.meta.total);

      const totalCourses = refreshedAllCourses.length;
      const weeklySessions = refreshedAllCourses.reduce((sum, c) => sum + (c._count?.sessions || 0), 0);
      const popularCourse = totalCourses > 0
        ? refreshedAllCourses.reduce((max, c) => ((c._count?.sessions || 0) > (max._count?.sessions || 0) ? c : max), refreshedAllCourses[0])?.name || '-'
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
    if (!canManageCourses) {
      messageApi.warning('当前账号没有课程删除权限');
      return;
    }

    try {
      await coursesApi.delete(course.id);
      const [refreshed, refreshedAllCourses] = await Promise.all([
        coursesApi.getPaged({
          page: currentPage,
          pageSize,
          search: searchValue.trim() || undefined,
          type: typeFilter === '全部' ? undefined : typeFilter,
          level: levelFilter === '全部' ? undefined : levelFilter,
        }),
        coursesApi.getAll(),
      ]);
      setCourseList(refreshed.data);
      setAllCourses(refreshedAllCourses);
      setTotal(refreshed.meta.total);

      const totalCourses = refreshedAllCourses.length;
      const weeklySessions = refreshedAllCourses.reduce((sum, c) => sum + (c._count?.sessions || 0), 0);
      const popularCourse = totalCourses > 0
        ? refreshedAllCourses.reduce((max, c) => ((c._count?.sessions || 0) > (max._count?.sessions || 0) ? c : max), refreshedAllCourses[0])?.name || '-'
        : '-';

      const activeCourses = refreshedAllCourses.filter((course) => course.isActive).length;
      const avgOccupancy = totalCourses > 0
        ? `${((activeCourses / totalCourses) * 100).toFixed(1)}%`
        : '-';

      setStats((current) => ({
        ...current,
        totalCourses,
        weeklySessions,
        avgOccupancy,
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
          extra={<ActionButton icon={<PlusOutlined />} onClick={openCreateModal} disabled={!canWriteCourses}>新增课程</ActionButton>}
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
        extra={<ActionButton icon={<PlusOutlined />} onClick={openCreateModal} disabled={!canWriteCourses}>新增课程</ActionButton>}
      />

      <div className={pageCls.heroGrid}>
        {courseStats.map((item) => (
          <StatCard key={item.title} {...item} icon={iconMap[item.icon]} />
        ))}
      </div>

      <CourseBrowseShell
        title="课程工作台"
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
        onSearchChange={handleSearchChange}
        onTypeChange={handleTypeChange}
        onLevelChange={handleLevelChange}
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
        okButtonProps={{ disabled: !canWriteCourses }}
        okText={editingCourse ? '保存修改' : '新增课程'}
        cancelText="取消"
        zIndex={1600}
        forceRender
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
                <Select
                  className={pageCls.settingsInput}
                  showSearch
                  placeholder="请选择课程类型"
                  options={normalizedCourseTypeOptions.map((item) => ({ label: item, value: item }))}
                />
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
                <InputNumber className={`${pageCls.settingsInput} ${pageCls.fullWidthControl}`} min={1} precision={0} controls={false} size="large" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="capacity" label="课程容量（人）" rules={[{ required: true, message: '请输入课程容量' }]}>
                <InputNumber className={`${pageCls.settingsInput} ${pageCls.fullWidthControl}`} min={1} precision={0} controls={false} size="large" />
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
            <Col span={24}>
              <Form.Item name="coverImageUrl" label="课程图片">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input
                    ref={courseImageInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleCourseImageChange}
                  />
                  <Button onClick={handleSelectCourseImage} disabled={!canWriteCourses}>上传课程图片</Button>
                  <Form.Item noStyle shouldUpdate>
                    {() => {
                      const imageUrl = form.getFieldValue('coverImageUrl');
                      return imageUrl ? (
                        <img src={imageUrl} alt="课程图片预览" style={{ width: '100%', maxWidth: 220, borderRadius: 12, border: '1px solid var(--border-subtle)' }} />
                      ) : null;
                    }}
                  </Form.Item>
                </div>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Drawer
        rootClassName={pageCls.responsiveDetailDrawer}
        open={detailCourse !== null}
        width={COURSE_DETAIL_DRAWER_WIDTH}
        title={detailCourse?.name ?? '课程详情'}
        onClose={() => setDetailCourse(null)}
        extra={detailCourse ? (
          <div className={pageCls.drawerActionGroup}>
            <Button className={pageCls.courseDrawerAction} icon={<EditOutlined />} onClick={() => openEditModal(detailCourse)} disabled={!canWriteCourses}>编辑</Button>
            <Popconfirm title="确认删除该课程吗？" okText="删除" cancelText="取消" okButtonProps={{ danger: true }} onConfirm={() => handleDeleteCourse(detailCourse)}>
              <Button className={`${pageCls.courseDrawerAction} ${pageCls.cardActionWarning}`} icon={<DeleteOutlined />} disabled={!canManageCourses}>删除</Button>
            </Popconfirm>
          </div>
        ) : null}
      >
        {detailCourse ? (
          <div className={pageCls.detailContentStack}>
            <CourseDetailOverviewCard
              eyebrow={detailCourse.courseCode || '未设置编号'}
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

            {detailCourse.coverImageUrl ? (
              <SectionCard title="课程图片" subtitle="当前课程展示图片。">
                <img src={detailCourse.coverImageUrl} alt={detailCourse.name} className={styles.courseImagePreview} />
              </SectionCard>
            ) : null}

            <SectionCard
              title="课程档案"
              subtitle="保留后台管理所需的核心字段，便于核对课程基础配置与当前启用状态。"
            >
              <Descriptions column={1} size="small" bordered className={pageCls.detailDescriptions}>
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
