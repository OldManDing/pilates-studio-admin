import { CalendarOutlined, DeleteOutlined, EditOutlined, EyeOutlined, HeartOutlined, PlusOutlined, SearchOutlined, StarOutlined, TeamOutlined } from '@ant-design/icons';
import { Button, Col, Descriptions, Drawer, Form, Input, Modal, Popconfirm, Row, Select, message } from 'antd';
import { useMemo, useState } from 'react';
import ActionButton from '@/components/ActionButton';
import MemberAvatar from '@/components/MemberAvatar';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import StatusTag from '@/components/StatusTag';
import { coachStats, coaches } from '@/mock';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import type { CoachStatus } from '@/types';

const { TextArea } = Input;

const iconMap = {
  team: <TeamOutlined />,
  star: <StarOutlined />,
  calendar: <CalendarOutlined />,
  heart: <HeartOutlined />
};

type CoachRecord = (typeof coaches)[number] & { id: string };
type CoachTone = CoachRecord['tone'];
type CoachFormValues = {
  name: string;
  status: CoachStatus;
  experience: string;
  rating: string;
  phone: string;
  email: string;
  specialtiesText: string;
  certificatesText: string;
  totalCourses: string;
  weeklyCourses: string;
  tone: CoachTone;
};

const initialCoaches: CoachRecord[] = coaches.map((coach, index) => ({
  ...coach,
  id: `coach-${index + 1}`
}));

const defaultCoachFormValues: CoachFormValues = {
  name: '',
  status: '在职',
  experience: '3 年经验',
  rating: '4.8',
  phone: '',
  email: '',
  specialtiesText: '',
  certificatesText: '',
  totalCourses: '120 节',
  weeklyCourses: '10 节',
  tone: 'mint'
};

const toneOptions: Array<{ label: string; value: CoachTone }> = [
  { label: '薄荷绿', value: 'mint' },
  { label: '柔雾紫', value: 'violet' },
  { label: '暖日橙', value: 'orange' },
  { label: '轻粉色', value: 'pink' }
];

const coachStatusOptions: CoachStatus[] = ['在职', '休假中'];

const parseListText = (value: string) => value.split(/\n|,|，/).map((item) => item.trim()).filter(Boolean);

const createCoachId = () => `coach-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const CRUD_MODAL_WIDTH = 780;

export default function CoachesPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<CoachFormValues>();
  const [coachList, setCoachList] = useState<CoachRecord[]>(initialCoaches);
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<CoachStatus | '全部'>('全部');
  const [editingCoach, setEditingCoach] = useState<CoachRecord | null>(null);
  const [detailCoach, setDetailCoach] = useState<CoachRecord | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const filteredCoaches = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase();

    return coachList.filter((coach) => {
      const matchesKeyword =
        keyword.length === 0 ||
        coach.name.toLowerCase().includes(keyword) ||
        coach.email.toLowerCase().includes(keyword) ||
        coach.phone.toLowerCase().includes(keyword);
      const matchesStatus = statusFilter === '全部' || coach.status === statusFilter;

      return matchesKeyword && matchesStatus;
    });
  }, [coachList, searchValue, statusFilter]);

  const openCreateModal = () => {
    setEditingCoach(null);
    form.setFieldsValue(defaultCoachFormValues);
    setIsFormOpen(true);
  };

  const openEditModal = (coach: CoachRecord) => {
    setEditingCoach(coach);
    form.setFieldsValue({
      name: coach.name,
      status: coach.status,
      experience: coach.experience,
      rating: coach.rating,
      phone: coach.phone,
      email: coach.email,
      specialtiesText: coach.specialties.join('\n'),
      certificatesText: coach.certificates.join('\n'),
      totalCourses: coach.totalCourses,
      weeklyCourses: coach.weeklyCourses,
      tone: coach.tone
    });
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    setEditingCoach(null);
    form.resetFields();
  };

  const handleSaveCoach = async () => {
    const values = await form.validateFields();
    const nextCoach: CoachRecord = {
      id: editingCoach?.id ?? createCoachId(),
      name: values.name,
      status: values.status,
      experience: values.experience,
      rating: values.rating,
      phone: values.phone,
      email: values.email,
      specialties: parseListText(values.specialtiesText),
      certificates: parseListText(values.certificatesText),
      totalCourses: values.totalCourses,
      weeklyCourses: values.weeklyCourses,
      tone: values.tone
    };

    setCoachList((current) => {
      if (editingCoach) {
        return current.map((coach) => (coach.id === editingCoach.id ? nextCoach : coach));
      }

      return [nextCoach, ...current];
    });

    if (detailCoach?.id === nextCoach.id) {
      setDetailCoach(nextCoach);
    }

    messageApi.success(editingCoach ? '教练资料已更新' : '教练已添加');
    closeFormModal();
  };

  const handleDeleteCoach = (coach: CoachRecord) => {
    setCoachList((current) => current.filter((item) => item.id !== coach.id));

    if (detailCoach?.id === coach.id) {
      setDetailCoach(null);
    }

    messageApi.success(`已删除教练 ${coach.name}`);
  };

  return (
    <div className={pageCls.page}>
      {contextHolder}
      <PageHeader
        title="教练管理"
        subtitle="管理教练信息、排班和绩效。"
        extra={<ActionButton icon={<PlusOutlined />} onClick={openCreateModal}>新增教练</ActionButton>}
      />

      <div className={pageCls.heroGrid}>
        {coachStats.map((item) => (
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
            placeholder="按教练姓名、电话或邮箱搜索"
            onChange={(event) => setSearchValue(event.target.value)}
          />
        </div>
        <div className={pageCls.toolbarRight}>
          <Select
            size="large"
            value={statusFilter}
            style={{ minWidth: 140 }}
            className={pageCls.settingsInput}
            options={[{ label: '全部状态', value: '全部' }, ...coachStatusOptions.map((item) => ({ label: item, value: item }))]}
            onChange={(value: CoachStatus | '全部') => setStatusFilter(value)}
          />
        </div>
      </div>

      <div className={widgetCls.coachGrid}>
        {filteredCoaches.map((coach) => (
          <div key={coach.id} className={widgetCls.detailCard}>
            <div className={widgetCls.detailHeader}>
              <div className={widgetCls.recordMeta}>
                <MemberAvatar name={coach.name} tone={coach.tone} />
                <div>
                  <div className={widgetCls.recordTitle} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    {coach.name}
                    <StatusTag status={coach.status} />
                  </div>
                  <div className={widgetCls.recordSub}>{coach.experience} · 评分 {coach.rating}</div>
                </div>
              </div>
            </div>

            <div className={widgetCls.infoStack}>
              <div>电话：{coach.phone}</div>
              <div>邮箱：{coach.email}</div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div className={widgetCls.smallText}>专长领域</div>
              <div className={widgetCls.chipRow} style={{ marginTop: 8 }}>
                {coach.specialties.map((item) => (
                  <span key={item} className={widgetCls.chip}>{item}</span>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div className={widgetCls.smallText}>资质认证</div>
              <div className={widgetCls.chipRow} style={{ marginTop: 8 }}>
                {coach.certificates.map((item) => (
                  <span key={item} className={widgetCls.chip}>{item}</span>
                ))}
              </div>
            </div>

            <div className={widgetCls.metricGrid} style={{ marginTop: 18 }}>
              <div className={widgetCls.metricCard}>
                <div className={widgetCls.metricLabel}>总课程数</div>
                <div className={widgetCls.metricValue}>{coach.totalCourses}</div>
              </div>
              <div className={widgetCls.metricCard}>
                <div className={widgetCls.metricLabel}>本周课程</div>
                <div className={widgetCls.metricValue}>{coach.weeklyCourses}</div>
              </div>
              <div className={widgetCls.metricCard}>
                <div className={widgetCls.metricLabel}>满意度</div>
                <div className={widgetCls.metricValue}>{coach.rating}</div>
              </div>
            </div>

            <div className={widgetCls.twoButtons}>
              <Button type="primary" size="large" className={pageCls.cardActionHalf} icon={<EditOutlined />} onClick={() => openEditModal(coach)}>编辑资料</Button>
              <Button size="large" className={pageCls.cardActionHalf} icon={<EyeOutlined />} onClick={() => setDetailCoach(coach)}>查看详情</Button>
            </div>
          </div>
        ))}
      </div>

      {filteredCoaches.length === 0 ? (
        <div className={`${pageCls.surface} ${widgetCls.detailCard}`} style={{ marginTop: 16 }}>
          <div className={widgetCls.detailTitle}>暂无符合条件的教练</div>
          <div className={widgetCls.smallText} style={{ marginTop: 8 }}>可以调整搜索词，或者切换状态筛选。</div>
        </div>
      ) : null}

      <Modal
        className={pageCls.crudModal}
        title={editingCoach ? '编辑教练' : '新增教练'}
        open={isFormOpen}
        width={CRUD_MODAL_WIDTH}
        onCancel={closeFormModal}
        onOk={handleSaveCoach}
        okText={editingCoach ? '保存修改' : '新增教练'}
        cancelText="取消"
        destroyOnHidden
      >
        <Form form={form} className={pageCls.crudModalForm} layout="vertical">
          <Row gutter={18}>
            <Col xs={24} md={12}>
              <Form.Item name="name" label="教练姓名" rules={[{ required: true, message: '请输入教练姓名' }]}>
                <Input className={pageCls.settingsInput} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
                <Select className={pageCls.settingsInput} options={coachStatusOptions.map((item) => ({ label: item, value: item }))} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="experience" label="经验信息" rules={[{ required: true, message: '请输入经验信息' }]}>
                <Input className={pageCls.settingsInput} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="rating" label="评分" rules={[{ required: true, message: '请输入评分' }]}>
                <Input className={pageCls.settingsInput} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="phone" label="电话" rules={[{ required: true, message: '请输入电话' }]}>
                <Input className={pageCls.settingsInput} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="email" label="邮箱" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '请输入有效邮箱地址' }]}>
                <Input className={pageCls.settingsInput} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="totalCourses" label="总课程数" rules={[{ required: true, message: '请输入总课程数' }]}>
                <Input className={pageCls.settingsInput} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="weeklyCourses" label="本周课程" rules={[{ required: true, message: '请输入本周课程' }]}>
                <Input className={pageCls.settingsInput} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="tone" label="头像色系" rules={[{ required: true, message: '请选择头像色系' }]}>
                <Select className={pageCls.settingsInput} options={toneOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="specialtiesText" label="专长领域" rules={[{ required: true, message: '请输入至少一个专长领域' }]}>
                <TextArea className={pageCls.settingsInput} rows={4} placeholder="每行一个专长领域" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="certificatesText" label="资质认证" rules={[{ required: true, message: '请输入至少一个资质认证' }]}>
                <TextArea className={pageCls.settingsInput} rows={4} placeholder="每行一个资质认证" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Drawer
        open={detailCoach !== null}
        width={480}
        title={detailCoach?.name ?? '教练详情'}
        onClose={() => setDetailCoach(null)}
        extra={detailCoach ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button icon={<EditOutlined />} onClick={() => openEditModal(detailCoach)}>编辑</Button>
            <Popconfirm title="确认删除该教练吗？" okText="删除" cancelText="取消" onConfirm={() => handleDeleteCoach(detailCoach)}>
              <Button danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          </div>
        ) : null}
      >
        {detailCoach ? (
          <div style={{ display: 'grid', gap: 16 }}>
            <div className={widgetCls.detailOverviewPanel}>
              <div className={widgetCls.recordMeta}>
                <MemberAvatar name={detailCoach.name} tone={detailCoach.tone} />
                <div>
                  <div className={widgetCls.recordTitle} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {detailCoach.name}
                    <StatusTag status={detailCoach.status} />
                  </div>
                  <div className={widgetCls.recordSub}>{detailCoach.experience} · 评分 {detailCoach.rating}</div>
                  <div className={widgetCls.recordSub}>{detailCoach.phone}</div>
                </div>
              </div>
              <div className={widgetCls.detailOverviewStatGrid}>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatMint}`}>
                  <div className={widgetCls.detailInsightLabel}>总课程数</div>
                  <div className={widgetCls.detailOverviewStatValue}>{detailCoach.totalCourses}</div>
                </div>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatViolet}`}>
                  <div className={widgetCls.detailInsightLabel}>本周课程</div>
                  <div className={widgetCls.detailOverviewStatValue}>{detailCoach.weeklyCourses}</div>
                </div>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatOrange}`}>
                  <div className={widgetCls.detailInsightLabel}>满意度</div>
                  <div className={widgetCls.detailOverviewStatValue}>{detailCoach.rating}</div>
                </div>
              </div>
            </div>

            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="教练姓名">{detailCoach.name}</Descriptions.Item>
              <Descriptions.Item label="状态">{detailCoach.status}</Descriptions.Item>
              <Descriptions.Item label="经验信息">{detailCoach.experience}</Descriptions.Item>
              <Descriptions.Item label="评分">{detailCoach.rating}</Descriptions.Item>
              <Descriptions.Item label="电话">{detailCoach.phone}</Descriptions.Item>
              <Descriptions.Item label="邮箱">{detailCoach.email}</Descriptions.Item>
            </Descriptions>

            <div>
              <div className={widgetCls.smallText} style={{ marginBottom: 10 }}>专长领域</div>
              <div className={widgetCls.chipRow}>
                {detailCoach.specialties.map((item) => (
                  <span key={item} className={widgetCls.chip}>{item}</span>
                ))}
              </div>
            </div>

            <div>
              <div className={widgetCls.smallText} style={{ marginBottom: 10 }}>资质认证</div>
              <div className={widgetCls.chipRow}>
                {detailCoach.certificates.map((item) => (
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
