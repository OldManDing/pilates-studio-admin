import { AppstoreOutlined, DeleteOutlined, EditOutlined, EyeOutlined, CalendarOutlined, PlusOutlined, SearchOutlined, StarOutlined } from '@ant-design/icons';
import { Button, Descriptions, Drawer, Form, Input, Modal, Popconfirm, Select, message } from 'antd';
import { useMemo, useState } from 'react';
import ActionButton from '@/components/ActionButton';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import { courseStats, courses } from '@/mock';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';

const { TextArea } = Input;

const iconMap = {
  calendar: <CalendarOutlined />,
  app: <AppstoreOutlined />,
  percent: <CalendarOutlined />,
  star: <StarOutlined />
};

type CourseRecord = (typeof courses)[number] & { id: string };
type CourseFormValues = {
  name: string;
  type: string;
  level: string;
  coach: string;
  duration: string;
  capacity: string;
  weekly: string;
  scheduleText: string;
};

const initialCourses: CourseRecord[] = courses.map((course, index) => ({
  ...course,
  id: `course-${index + 1}`
}));

const defaultCourseFormValues: CourseFormValues = {
  name: '',
  type: initialCourses[0]?.type ?? 'Reformer',
  level: initialCourses[0]?.level ?? '初级',
  coach: '',
  duration: '50 分钟',
  capacity: '8 人',
  weekly: '每周 2 节',
  scheduleText: ''
};

const parseScheduleText = (value: string) => value.split(/\n|,|，/).map((item) => item.trim()).filter(Boolean);

const createCourseId = () => `course-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function CoursesPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<CourseFormValues>();
  const [courseList, setCourseList] = useState<CourseRecord[]>(initialCourses);
  const [searchValue, setSearchValue] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('全部');
  const [levelFilter, setLevelFilter] = useState<string>('全部');
  const [editingCourse, setEditingCourse] = useState<CourseRecord | null>(null);
  const [detailCourse, setDetailCourse] = useState<CourseRecord | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

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
        course.coach.toLowerCase().includes(keyword);
      const matchesType = typeFilter === '全部' || course.type === typeFilter;
      const matchesLevel = levelFilter === '全部' || course.level === levelFilter;

      return matchesKeyword && matchesType && matchesLevel;
    });
  }, [courseList, levelFilter, searchValue, typeFilter]);

  const openCreateModal = () => {
    setEditingCourse(null);
    form.setFieldsValue(defaultCourseFormValues);
    setIsFormOpen(true);
  };

  const openEditModal = (course: CourseRecord) => {
    setEditingCourse(course);
    form.setFieldsValue({
      name: course.name,
      type: course.type,
      level: course.level,
      coach: course.coach,
      duration: course.duration,
      capacity: course.capacity,
      weekly: course.weekly,
      scheduleText: course.schedule.join('\n')
    });
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    setEditingCourse(null);
    form.resetFields();
  };

  const handleSaveCourse = async () => {
    const values = await form.validateFields();
    const nextCourse: CourseRecord = {
      id: editingCourse?.id ?? createCourseId(),
      name: values.name,
      type: values.type,
      level: values.level,
      coach: values.coach,
      duration: values.duration,
      capacity: values.capacity,
      weekly: values.weekly,
      schedule: parseScheduleText(values.scheduleText)
    };

    setCourseList((current) => {
      if (editingCourse) {
        return current.map((course) => (course.id === editingCourse.id ? nextCourse : course));
      }

      return [nextCourse, ...current];
    });

    if (detailCourse?.id === nextCourse.id) {
      setDetailCourse(nextCourse);
    }

    messageApi.success(editingCourse ? '课程信息已更新' : '课程已创建');
    closeFormModal();
  };

  const handleDeleteCourse = (course: CourseRecord) => {
    setCourseList((current) => current.filter((item) => item.id !== course.id));

    if (detailCourse?.id === course.id) {
      setDetailCourse(null);
    }

    messageApi.success(`已删除课程 ${course.name}`);
  };

  return (
    <div className={pageCls.page}>
      {contextHolder}
      <PageHeader
        title="课程管理"
        subtitle="管理所有课程设置和排期。"
        extra={<ActionButton icon={<PlusOutlined />} onClick={openCreateModal}>创建课程</ActionButton>}
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
        </div>
      </div>

      <div className={widgetCls.courseGrid}>
        {filteredCourses.map((course) => (
          <div key={course.id} className={widgetCls.detailCard}>
            <div className={widgetCls.detailHeader}>
              <div>
                <h3 className={widgetCls.detailTitle}>{course.name}</h3>
                <div className={widgetCls.chipRow} style={{ marginTop: 10 }}>
                  <span className={widgetCls.chipPrimary}>{course.type}</span>
                </div>
              </div>
              <span className={widgetCls.chipLevel}>{course.level}</span>
            </div>

            <div className={widgetCls.metricGrid}>
              <div className={widgetCls.metricCard}>
                <div className={widgetCls.metricLabel}>教练</div>
                <div className={widgetCls.metricValue}>{course.coach}</div>
              </div>
              <div className={widgetCls.metricCard}>
                <div className={widgetCls.metricLabel}>时长</div>
                <div className={widgetCls.metricValue}>{course.duration}</div>
              </div>
              <div className={widgetCls.metricCard}>
                <div className={widgetCls.metricLabel}>容量</div>
                <div className={widgetCls.metricValue}>{course.capacity}</div>
              </div>
            </div>

            <div className={widgetCls.infoStack} style={{ marginTop: 18 }}>
              <div>频次：{course.weekly}</div>
              <div className={widgetCls.chipRow}>
                {course.schedule.map((item) => (
                  <span key={item} className={widgetCls.chip}>{item}</span>
                ))}
              </div>
            </div>

            <div className={widgetCls.twoButtons}>
              <Button type="primary" size="large" className={pageCls.cardActionPrimary} icon={<EditOutlined />} onClick={() => openEditModal(course)}>编辑课程</Button>
              <Button size="large" className={pageCls.cardActionSecondary} icon={<EyeOutlined />} onClick={() => setDetailCourse(course)}>查看详情</Button>
            </div>
          </div>
        ))}
      </div>

      {filteredCourses.length === 0 ? (
        <div className={`${pageCls.surface} ${widgetCls.detailCard}`} style={{ marginTop: 16 }}>
          <div className={widgetCls.detailTitle}>暂无符合条件的课程</div>
          <div className={widgetCls.smallText} style={{ marginTop: 8 }}>修改搜索词或筛选条件后再试。</div>
        </div>
      ) : null}

      <Modal
        title={editingCourse ? '编辑课程' : '创建课程'}
        open={isFormOpen}
        onCancel={closeFormModal}
        onOk={handleSaveCourse}
        okText={editingCourse ? '保存修改' : '创建课程'}
        cancelText="取消"
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
          <Form.Item name="name" label="课程名称" rules={[{ required: true, message: '请输入课程名称' }]}>
            <Input className={pageCls.settingsInput} />
          </Form.Item>
          <Form.Item name="type" label="课程类型" rules={[{ required: true, message: '请输入课程类型' }]}>
            <Input className={pageCls.settingsInput} />
          </Form.Item>
          <Form.Item name="level" label="课程难度" rules={[{ required: true, message: '请输入课程难度' }]}>
            <Input className={pageCls.settingsInput} />
          </Form.Item>
          <Form.Item name="coach" label="授课教练" rules={[{ required: true, message: '请输入授课教练' }]}>
            <Input className={pageCls.settingsInput} />
          </Form.Item>
          <Form.Item name="duration" label="课程时长" rules={[{ required: true, message: '请输入课程时长' }]}>
            <Input className={pageCls.settingsInput} />
          </Form.Item>
          <Form.Item name="capacity" label="课程容量" rules={[{ required: true, message: '请输入课程容量' }]}>
            <Input className={pageCls.settingsInput} />
          </Form.Item>
          <Form.Item name="weekly" label="每周频次" rules={[{ required: true, message: '请输入每周频次' }]}>
            <Input className={pageCls.settingsInput} />
          </Form.Item>
          <Form.Item name="scheduleText" label="排期安排" rules={[{ required: true, message: '请输入排期安排' }]}>
            <TextArea className={pageCls.settingsInput} rows={4} placeholder="每行一个时间，例如：周一 08:00" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        open={detailCourse !== null}
        width={460}
        title={detailCourse?.name ?? '课程详情'}
        onClose={() => setDetailCourse(null)}
        extra={detailCourse ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button icon={<EditOutlined />} onClick={() => openEditModal(detailCourse)}>编辑</Button>
            <Popconfirm title="确认删除该课程吗？" okText="删除" cancelText="取消" onConfirm={() => handleDeleteCourse(detailCourse)}>
              <Button danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          </div>
        ) : null}
      >
        {detailCourse ? (
          <div style={{ display: 'grid', gap: 16 }}>
            <div className={widgetCls.detailOverviewPanel}>
              <div className={widgetCls.detailOverviewSummary}>
                <div className={widgetCls.recordTitle} style={{ marginBottom: 0 }}>{detailCourse.name}</div>
                <div className={widgetCls.chipRow}>
                  <span className={widgetCls.chipPrimary}>{detailCourse.type}</span>
                  <span className={widgetCls.chipLevel}>{detailCourse.level}</span>
                </div>
              </div>
              <div className={widgetCls.detailOverviewStatGrid}>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatMint}`}>
                  <div className={widgetCls.detailInsightLabel}>教练</div>
                  <div className={widgetCls.detailOverviewStatValue} style={{ fontSize: 'var(--font-size-xl)' }}>{detailCourse.coach}</div>
                </div>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatViolet}`}>
                  <div className={widgetCls.detailInsightLabel}>时长</div>
                  <div className={widgetCls.detailOverviewStatValue} style={{ fontSize: 'var(--font-size-xl)' }}>{detailCourse.duration}</div>
                </div>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatOrange}`}>
                  <div className={widgetCls.detailInsightLabel}>容量</div>
                  <div className={widgetCls.detailOverviewStatValue} style={{ fontSize: 'var(--font-size-xl)' }}>{detailCourse.capacity}</div>
                </div>
              </div>
            </div>

            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="课程名称">{detailCourse.name}</Descriptions.Item>
              <Descriptions.Item label="课程类型">{detailCourse.type}</Descriptions.Item>
              <Descriptions.Item label="课程难度">{detailCourse.level}</Descriptions.Item>
              <Descriptions.Item label="授课教练">{detailCourse.coach}</Descriptions.Item>
              <Descriptions.Item label="课程时长">{detailCourse.duration}</Descriptions.Item>
              <Descriptions.Item label="课程容量">{detailCourse.capacity}</Descriptions.Item>
              <Descriptions.Item label="每周频次">{detailCourse.weekly}</Descriptions.Item>
            </Descriptions>

            <div>
              <div className={widgetCls.smallText} style={{ marginBottom: 10 }}>排期安排</div>
              <div className={widgetCls.chipRow}>
                {detailCourse.schedule.map((item) => (
                  <span key={item} className={widgetCls.chip}>{item}</span>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
