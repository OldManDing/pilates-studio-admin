import { CalendarOutlined, DeleteOutlined, EditOutlined, EyeOutlined, HeartOutlined, PlusOutlined, SearchOutlined, StarOutlined, TeamOutlined } from '@ant-design/icons';
import { Button, Col, Descriptions, Drawer, Form, Input, Modal, Popconfirm, Row, Select, Spin, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import ActionButton from '@/components/ActionButton';
import MemberAvatar from '@/components/MemberAvatar';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import StatusTag from '@/components/StatusTag';
import { CRUD_MODAL_WIDTH, DETAIL_DRAWER_WIDTH } from '@/styles/dimensions';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import type { CoachStatus } from '@/types';
import { coachesApi, type Coach } from '@/services/coaches';
import { getErrorMessage } from '@/utils/errors';
import { getToneFromName } from '@/utils/tone';

const { TextArea } = Input;

const iconMap = {
  team: <TeamOutlined />,
  star: <StarOutlined />,
  calendar: <CalendarOutlined />,
  heart: <HeartOutlined />
};

type CoachFormValues = {
  name: string;
  status: CoachStatus;
  experience?: string;
  phone: string;
  email?: string;
  bio?: string;
  specialtiesText: string;
  certificatesText: string;
};

const coachStatusLabels: Record<CoachStatus, string> = {
  ACTIVE: '在职',
  ON_LEAVE: '休假中',
  INACTIVE: '停用',
};

const coachStatusOptions: CoachStatus[] = ['ACTIVE', 'ON_LEAVE', 'INACTIVE'];

const parseListText = (value: string) => value.split(/\n|,|，/).map((item) => item.trim()).filter(Boolean);

export default function CoachesPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<CoachFormValues>();
  const [coachList, setCoachList] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<CoachStatus | '全部'>('全部');
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
  const [detailCoach, setDetailCoach] = useState<Coach | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [stats, setStats] = useState({
    totalCoaches: 0,
    activeCoaches: 0,
    avgRating: '4.8',
    totalSessions: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const coachesData = await coachesApi.getAll();
        setCoachList(coachesData);

        const activeCoaches = coachesData.filter(c => c.status === 'ACTIVE').length;
        const avgRating = coachesData.length > 0
          ? (coachesData.reduce((sum, c) => sum + (c.rating || 0), 0) / coachesData.length).toFixed(1)
          : '0.0';

        // 尝试获取第一个教练的统计数据作为示例
        let totalSessions = 0;
        if (coachesData.length > 0) {
          try {
            const firstStats = await coachesApi.getStats(coachesData[0].id);
            totalSessions = firstStats.stats.totalSessions;
          } catch {
            // 后端接口可能不可用
          }
        }

        setStats({
          totalCoaches: coachesData.length,
          activeCoaches,
          avgRating,
          totalSessions,
        });
      } catch (err) {
        messageApi.error('获取教练数据失败');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredCoaches = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase();

    return coachList.filter((coach) => {
      const matchesKeyword =
        keyword.length === 0 ||
        coach.name.toLowerCase().includes(keyword) ||
        (coach.email?.toLowerCase().includes(keyword) ?? false) ||
        coach.phone.toLowerCase().includes(keyword);
      const matchesStatus = statusFilter === '全部' || coach.status === statusFilter;

      return matchesKeyword && matchesStatus;
    });
  }, [coachList, searchValue, statusFilter]);

  const coachStats = useMemo(() => [
    { title: '教练总数', value: String(stats.totalCoaches), hint: `在职 ${stats.activeCoaches} / 休假 ${stats.totalCoaches - stats.activeCoaches}`, tone: 'mint' as const, icon: 'team' as const },
    { title: '平均评分', value: stats.avgRating, hint: '基于学员评价', tone: 'violet' as const, icon: 'star' as const },
    { title: '本周课程', value: String(stats.totalSessions), hint: '人均排课', tone: 'orange' as const, icon: 'calendar' as const },
    { title: '学员满意度', value: '96%', hint: '↑ 1.9% 环比', tone: 'pink' as const, icon: 'heart' as const },
  ], [stats]);

  const openCreateModal = () => {
    setEditingCoach(null);
    form.setFieldsValue({
      name: '',
      status: 'ACTIVE',
      phone: '',
      email: '',
      experience: '',
      bio: '',
      specialtiesText: '',
      certificatesText: '',
    });
    setIsFormOpen(true);
  };

  const openEditModal = (coach: Coach) => {
    setEditingCoach(coach);
    form.setFieldsValue({
      name: coach.name,
      status: coach.status,
      phone: coach.phone,
      email: coach.email,
      experience: coach.experience,
      bio: coach.bio,
      specialtiesText: coach.specialties?.map(s => s.value).join('\n') || '',
      certificatesText: coach.certificates?.map(c => c.value).join('\n') || '',
    });
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    setEditingCoach(null);
    form.resetFields();
  };

  const handleSaveCoach = async () => {
    try {
      const values = await form.validateFields();
      const data = {
        name: values.name,
        status: values.status,
        phone: values.phone,
        email: values.email,
        experience: values.experience,
        bio: values.bio,
        specialties: parseListText(values.specialtiesText),
        certificates: parseListText(values.certificatesText),
      };

      if (editingCoach) {
        await coachesApi.update(editingCoach.id, data);
        messageApi.success('教练资料已更新');
      } else {
        await coachesApi.create(data);
        messageApi.success('教练已添加');
      }

      const refreshed = await coachesApi.getAll();
      setCoachList(refreshed);

      if (detailCoach && editingCoach) {
        const updated = refreshed.find((c) => c.id === detailCoach.id) || null;
        setDetailCoach(updated);
      }

      closeFormModal();
    } catch (err) {
      messageApi.error(getErrorMessage(err, '保存失败'));
    }
  };

  const handleDeleteCoach = async (coach: Coach) => {
    try {
      await coachesApi.delete(coach.id);
      setCoachList((current) => current.filter((item) => item.id !== coach.id));

      if (detailCoach?.id === coach.id) {
        setDetailCoach(null);
      }

      messageApi.success(`已删除教练 ${coach.name}`);
    } catch (err) {
      messageApi.error(getErrorMessage(err, '删除失败'));
    }
  };

  if (loading && coachList.length === 0) {
    return (
      <div className={`${pageCls.page} ${pageCls.workPage}`}>
        {contextHolder}
        <PageHeader
          title="教练管理"
          subtitle="管理教练信息、排班和绩效。"
          extra={<ActionButton icon={<PlusOutlined />} onClick={openCreateModal}>新增教练</ActionButton>}
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
            className={`${pageCls.settingsInput} ${pageCls.toolbarSelect}`}
            options={[{ label: '全部状态', value: '全部' }, ...coachStatusOptions.map((item) => ({ label: coachStatusLabels[item], value: item }))]}
            onChange={(value: CoachStatus | '全部') => setStatusFilter(value)}
          />
        </div>
      </div>

      <div className={widgetCls.coachGrid}>
        {filteredCoaches.map((coach) => (
          <div key={coach.id} className={widgetCls.detailCard}>
            <div className={widgetCls.detailHeader}>
              <div className={widgetCls.recordMeta}>
                <MemberAvatar name={coach.name} tone={getToneFromName(coach.name)} />
                <div>
                  <div className={`${widgetCls.recordTitle} ${pageCls.recordTitleRow}`}>
                    {coach.name}
                    <StatusTag status={coachStatusLabels[coach.status] || coach.status} />
                  </div>
                  <div className={widgetCls.recordSub}>
                    {coach.experience || '暂无经验信息'} · 评分 {coach.rating || '-'}
                  </div>
                </div>
              </div>
            </div>

            <div className={widgetCls.infoStack}>
              <div>电话：{coach.phone}</div>
              <div>邮箱：{coach.email || '-'}</div>
            </div>

            <div className={widgetCls.twoButtons}>
              <Button type="primary" size="large" className={pageCls.cardActionHalf} icon={<EditOutlined />} onClick={() => openEditModal(coach)}>编辑资料</Button>
              <Button size="large" className={pageCls.cardActionHalf} icon={<EyeOutlined />} onClick={() => setDetailCoach(coach)}>查看详情</Button>
            </div>
          </div>
        ))}
      </div>

      {filteredCoaches.length === 0 ? (
          <div className={`${pageCls.surface} ${widgetCls.detailCard} ${pageCls.surfaceTopSpace}`}>
            <div className={widgetCls.detailTitle}>暂无符合条件的教练</div>
            <div className={`${widgetCls.smallText} ${pageCls.topSpaceSm}`}>可以调整搜索词，或者切换状态筛选。</div>
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
                <Select className={pageCls.settingsInput} options={coachStatusOptions.map((item) => ({ label: coachStatusLabels[item], value: item }))} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="phone" label="电话" rules={[{ required: true, message: '请输入电话' }]}>
                <Input className={pageCls.settingsInput} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="email" label="邮箱" rules={[{ type: 'email', message: '请输入有效邮箱地址' }]}>
                <Input className={pageCls.settingsInput} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="experience" label="经验信息">
                <Input className={pageCls.settingsInput} placeholder="例如：5 年经验" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="bio" label="个人简介">
                <Input className={pageCls.settingsInput} placeholder="简短的个人介绍" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="specialtiesText" label="专长领域">
                <TextArea className={pageCls.settingsInput} rows={4} placeholder="每行一个专长领域，例如：Reformer&#10;Mat&#10;Prenatal" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="certificatesText" label="资质认证">
                <TextArea className={pageCls.settingsInput} rows={4} placeholder="每行一个资质认证，例如：BASI Pilates&#10;PMA 认证" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Drawer
        open={detailCoach !== null}
        width={DETAIL_DRAWER_WIDTH}
        title={detailCoach?.name ?? '教练详情'}
        onClose={() => setDetailCoach(null)}
        extra={detailCoach ? (
          <div className={pageCls.drawerActionGroup}>
            <Button icon={<EditOutlined />} onClick={() => openEditModal(detailCoach)}>编辑</Button>
            <Popconfirm title="确认删除该教练吗？" okText="删除" cancelText="取消" onConfirm={() => handleDeleteCoach(detailCoach)}>
              <Button danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          </div>
        ) : null}
      >
        {detailCoach ? (
          <div className={pageCls.detailContentStackSpacious}>
            {/* 头部信息 */}
            <div className={widgetCls.detailOverviewPanel}>
              <div className={widgetCls.recordMeta}>
                <MemberAvatar name={detailCoach.name} tone={getToneFromName(detailCoach.name)} />
                <div>
                  <div className={`${widgetCls.recordTitle} ${pageCls.recordTitleRow}`}>
                    {detailCoach.name}
                    <StatusTag status={coachStatusLabels[detailCoach.status] || detailCoach.status} />
                  </div>
                  <div className={widgetCls.recordSub}>{detailCoach.email || '-'}</div>
                </div>
              </div>
              <div className={widgetCls.detailOverviewStatGrid}>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatMint}`}>
                  <div className={widgetCls.detailInsightLabel}>评分</div>
                  <div className={widgetCls.detailOverviewStatValue}>{detailCoach.rating || '-'}</div>
                </div>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatViolet}`}>
                  <div className={widgetCls.detailInsightLabel}>状态</div>
                  <div className={widgetCls.detailOverviewStatValue}>{coachStatusLabels[detailCoach.status] || detailCoach.status}</div>
                </div>
              </div>
            </div>

            {/* 联系信息 */}
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="电话">{detailCoach.phone}</Descriptions.Item>
              <Descriptions.Item label="邮箱">{detailCoach.email || '-'}</Descriptions.Item>
              <Descriptions.Item label="经验">{detailCoach.experience || '-'}</Descriptions.Item>
            </Descriptions>

            {/* 个人简介 */}
            {detailCoach.bio && (
              <div>
                <div className={`${widgetCls.smallText} ${pageCls.filterFieldLabel}`}>个人简介</div>
                <div className={widgetCls.detailOverviewText}>{detailCoach.bio}</div>
              </div>
            )}

            {/* 专长领域 */}
            {detailCoach.specialties?.length ? (
              <div>
                <div className={`${widgetCls.smallText} ${pageCls.filterFieldLabel}`}>专长领域</div>
                <div className={widgetCls.chipRow}>
                  {detailCoach.specialties.map((item) => (
                    <span key={item.value} className={widgetCls.chip}>{item.value}</span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* 资质认证 */}
            {detailCoach.certificates?.length ? (
              <div>
                <div className={`${widgetCls.smallText} ${pageCls.filterFieldLabel}`}>资质认证</div>
                <div className={widgetCls.chipRow}>
                  {detailCoach.certificates.map((item) => (
                    <span key={item.value} className={widgetCls.chip}>{item.value}</span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
