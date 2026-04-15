import { CalendarOutlined, DeleteOutlined, EditOutlined, FilterOutlined, HeartOutlined, PlusOutlined, SearchOutlined, StarOutlined, TeamOutlined } from '@ant-design/icons';
import { Button, Col, Descriptions, Drawer, Form, Input, Modal, Pagination, Popconfirm, Row, Select, Spin, message } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ActionButton from '@/components/ActionButton';
import EmptyState from '@/components/EmptyState';
import FilterModalFooter from '@/components/FilterModalFooter';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatCard from '@/components/StatCard';
import { CRUD_MODAL_WIDTH, DETAIL_DRAWER_WIDTH } from '@/styles/dimensions';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import { coachStatusLabels, type CoachStatus } from '@/types';
import { coachesApi, type Coach } from '@/services/coaches';
import { getErrorMessage } from '@/utils/errors';
import { getToneFromName } from '@/utils/tone';
import { CoachProfileOverviewCard, CoachProfileStats, CoachRecordCard, type CoachProfileStatItem } from './components';

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

type CoachFilterDraft = {
  status: CoachStatus | '全部';
};

const coachStatusOptions: CoachStatus[] = ['ACTIVE', 'ON_LEAVE', 'INACTIVE'];

const parseListText = (value: string) => value.split(/\n|,|，/).map((item) => item.trim()).filter(Boolean);

const formatCoachRating = (rating?: number) => (typeof rating === 'number' ? rating.toFixed(1) : '-');

const getDisplayListText = (
  items: Array<{ value: string }> | undefined,
  emptyText: string,
  limit = 3,
) => {
  const values = (items || []).map((item) => item.value).filter(Boolean);

  if (!values.length) {
    return emptyText;
  }

  return values.slice(0, limit).join(' · ');
};

const getCoachSummaryText = (coach: Coach) => {
  if (coach.bio?.trim()) {
    return coach.bio.trim();
  }

  const specialtiesText = getDisplayListText(coach.specialties, '', 3);

  if (specialtiesText) {
    return `${coach.experience || '经验信息待补充'}，当前主授 ${specialtiesText}。`;
  }

  return coach.experience || '暂未填写个人简介，可在编辑教练时补充。';
};

export default function CoachesPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<CoachFormValues>();
  const [coachList, setCoachList] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<CoachStatus | '全部'>('全部');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState<CoachFilterDraft>({ status: '全部' });
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
  const [detailCoach, setDetailCoach] = useState<Coach | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({
    totalCoaches: 0,
    activeCoaches: 0,
    avgRating: '4.8',
    ratedCoaches: 0,
    profileReadyCount: 0,
  });

  const syncCoachStats = useCallback((matchingCoaches: Coach[], totalCount: number) => {
    const activeCoaches = matchingCoaches.filter((coach) => coach.status === 'ACTIVE').length;
    const avgRating = matchingCoaches.length > 0
      ? (matchingCoaches.reduce((sum, coach) => sum + (coach.rating || 0), 0) / matchingCoaches.length).toFixed(1)
      : '0.0';
    const ratedCoaches = matchingCoaches.filter((coach) => (coach.rating || 0) > 0).length;
    const profileReadyCount = matchingCoaches.filter((coach) => Boolean(coach.experience) && Boolean(coach.specialties?.length)).length;

    setStats({
      totalCoaches: totalCount,
      activeCoaches,
      avgRating,
      ratedCoaches,
      profileReadyCount,
    });
  }, []);

  const fetchCoaches = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const [response, allCoaches] = await Promise.all([
        coachesApi.getPaged({
          page,
          pageSize,
          search: searchValue.trim() || undefined,
          status: statusFilter === '全部' ? undefined : statusFilter,
        }),
        coachesApi.getAll(),
      ]);
      const coachesData = response.data;
      setCoachList(coachesData);
      setCurrentPage(response.meta.page);
      setTotal(response.meta.total);

      const keyword = searchValue.trim();
      const matchingCoaches = allCoaches.filter((coach) => {
        const matchesSearch = !keyword
          || coach.name.includes(keyword)
          || coach.phone.includes(keyword)
          || (coach.email || '').includes(keyword);
        const matchesStatus = statusFilter === '全部' || coach.status === statusFilter;
        return matchesSearch && matchesStatus;
      });

      syncCoachStats(matchingCoaches, response.meta.total);
    } catch (err) {
      messageApi.error('获取教练数据失败');
    } finally {
      setLoading(false);
    }
  }, [messageApi, pageSize, searchValue, statusFilter, syncCoachStats]);

  useEffect(() => {
    void fetchCoaches(currentPage);
  }, [currentPage, fetchCoaches]);

  const coachStats = useMemo(() => [
    { title: '教练总数', value: String(stats.totalCoaches), hint: `在职 ${stats.activeCoaches} / 休假 ${stats.totalCoaches - stats.activeCoaches}`, tone: 'mint' as const, icon: 'team' as const },
    { title: '平均评分', value: stats.avgRating, hint: '基于学员评价', tone: 'violet' as const, icon: 'star' as const },
    { title: '已评分教练', value: String(stats.ratedCoaches), hint: '已有学员反馈', tone: 'orange' as const, icon: 'calendar' as const },
    { title: '档案完整', value: String(stats.profileReadyCount), hint: '含经验与专长', tone: 'pink' as const, icon: 'heart' as const },
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

      const refreshed = await coachesApi.getPaged({
        page: currentPage,
        pageSize: 10,
        search: searchValue.trim() || undefined,
        status: statusFilter === '全部' ? undefined : statusFilter,
      });
      const allMatchingCoaches = await coachesApi.getAll();
      setCoachList(refreshed.data);
      setTotal(refreshed.meta.total);
      syncCoachStats(
        allMatchingCoaches.filter((coach) => {
          const keyword = searchValue.trim();
          const matchesSearch = !keyword
            || coach.name.includes(keyword)
            || coach.phone.includes(keyword)
            || (coach.email || '').includes(keyword);
          const matchesStatus = statusFilter === '全部' || coach.status === statusFilter;
          return matchesSearch && matchesStatus;
        }),
        refreshed.meta.total,
      );

      if (detailCoach && editingCoach) {
        const updated = refreshed.data.find((c) => c.id === detailCoach.id) || null;
        setDetailCoach(updated);
      }

      closeFormModal();
    } catch (err) {
      messageApi.error(getErrorMessage(err, '保存失败'));
    }
  };

  const handleDeleteCoach = async (coach: Coach) => {
    const previousList = coachList;
    try {
      setCoachList((current) => current.filter((item) => item.id !== coach.id));
      await coachesApi.delete(coach.id);
      await fetchCoaches(currentPage);

      if (detailCoach?.id === coach.id) {
        setDetailCoach(null);
      }

      messageApi.success(`已删除教练 ${coach.name}`);
    } catch (err) {
      setCoachList(previousList);
      messageApi.error(getErrorMessage(err, '删除失败'));
    }
  };

  const detailCoachStatItems: CoachProfileStatItem[] = detailCoach ? [
    {
      key: 'rating',
      label: '学员评分',
      value: formatCoachRating(detailCoach.rating),
      hint: `当前状态 ${coachStatusLabels[detailCoach.status]}`,
    },
    {
      key: 'specialties',
      label: '专长方向',
      value: `${detailCoach.specialties?.length || 0} 项`,
      hint: getDisplayListText(detailCoach.specialties, '待补充擅长方向', 2),
    },
    {
      key: 'certificates',
      label: '资质认证',
      value: `${detailCoach.certificates?.length || 0} 项`,
      hint: getDisplayListText(detailCoach.certificates, '待补充资质认证', 2),
    },
  ] : [];

  const coachFilterLabels = [
    searchValue.trim() ? `关键词“${searchValue.trim()}”` : null,
    statusFilter !== '全部' ? `状态：${coachStatusLabels[statusFilter]}` : null,
  ].filter(Boolean);

  const coachCountText = `当前共 ${total} 位教练`;
  const coachResultSummary = coachFilterLabels.length
    ? `已按${coachFilterLabels.join('、')}筛选。`
    : '可继续查看详情、编辑资料或调整状态。';

  const openFilterModal = () => {
    setFilterDraft({ status: statusFilter });
    setIsFilterOpen(true);
  };

  const applyFilters = () => {
    setStatusFilter(filterDraft.status);
    setCurrentPage(1);
    setIsFilterOpen(false);
  };

  const resetFilters = () => {
    const nextDraft: CoachFilterDraft = { status: '全部' };
    setFilterDraft(nextDraft);
    setStatusFilter(nextDraft.status);
    setIsFilterOpen(false);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    setCurrentPage(1);
  };

  if (loading && coachList.length === 0) {
    return (
      <div className={`${pageCls.page} ${pageCls.workPage}`}>
        {contextHolder}
        <PageHeader
          title="教练管理"
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
        extra={<ActionButton icon={<PlusOutlined />} onClick={openCreateModal}>新增教练</ActionButton>}
      />

      <div className={pageCls.heroGrid}>
        {coachStats.map((item) => (
          <StatCard key={item.title} {...item} icon={iconMap[item.icon]} />
        ))}
      </div>

      <SectionCard
        title="教练列表"
      >
        <div className={pageCls.sectionContentStack}>
          <div className={pageCls.sectionSummaryRow}>
            <div className={pageCls.sectionSummaryText}>{coachResultSummary}</div>
            <span className={pageCls.sectionMetaPill}>{coachCountText}</span>
          </div>

          <div className={pageCls.toolbar}>
            <div className={pageCls.toolbarLeft}>
              <Input
                className={pageCls.toolbarSearch}
                size="large"
                value={searchValue}
                prefix={<SearchOutlined />}
                placeholder="按教练姓名、电话或邮箱搜索"
                onChange={(event) => handleSearchChange(event.target.value)}
              />
            </div>
            <div className={pageCls.toolbarRight}>
              <ActionButton icon={<FilterOutlined />} ghost onClick={openFilterModal}>筛选条件</ActionButton>
            </div>
          </div>

          {coachList.length ? (
            <>
              <div className={`${widgetCls.recordList} ${pageCls.sectionListStack}`}>
                {coachList.map((coach) => (
                  <CoachRecordCard
                    key={coach.id}
                    name={coach.name}
                    coachCodeText={coach.coachCode || '未设置编号'}
                    statusLabel={coachStatusLabels[coach.status] || coach.status}
                    experienceText={coach.experience || '经验信息待补充'}
                    phoneText={coach.phone}
                    ratingText={formatCoachRating(coach.rating)}
                    specialtiesText={getDisplayListText(coach.specialties, '待补充擅长方向', 2)}
                    tone={getToneFromName(coach.name)}
                    onEdit={() => openEditModal(coach)}
                    onViewDetail={() => setDetailCoach(coach)}
                  />
                ))}
              </div>
              <div className={pageCls.sectionPagination}>
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={total}
                  onChange={setCurrentPage}
                  showSizeChanger={false}
                />
              </div>
            </>
          ) : (
            <div className={pageCls.sectionEmptyState}>
              <EmptyState
                title="暂无符合条件的教练"
                description="调整搜索词或筛选条件后再试。"
                actionText="重置筛选"
                onAction={() => {
                  setSearchValue('');
                  resetFilters();
                }}
              />
            </div>
          )}
        </div>
      </SectionCard>

      <Modal
        title="筛选条件"
        open={isFilterOpen}
        onCancel={() => setIsFilterOpen(false)}
        onOk={applyFilters}
        destroyOnHidden
        footer={<FilterModalFooter onReset={resetFilters} onCancel={() => setIsFilterOpen(false)} onApply={applyFilters} />}
      >
        <div className={pageCls.filterModalBody}>
          <div>
            <div className={`${widgetCls.smallText} ${pageCls.filterFieldLabel}`}>教练状态</div>
            <Select
              size="large"
              value={filterDraft.status}
              className={`${pageCls.settingsInput} ${pageCls.fullWidthControl}`}
              options={[{ label: '全部状态', value: '全部' }, ...coachStatusOptions.map((item) => ({ label: coachStatusLabels[item], value: item }))]}
              onChange={(value: CoachStatus | '全部') => setFilterDraft((current) => ({ ...current, status: value }))}
            />
          </div>
        </div>
      </Modal>

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
                <Input className={pageCls.settingsInput} placeholder="请输入经验信息" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="bio" label="个人简介">
                <TextArea className={pageCls.settingsInput} rows={4} placeholder="请输入个人简介" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="specialtiesText" label="专长领域">
                <TextArea className={pageCls.settingsInput} rows={4} placeholder="每行一个专长领域" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="certificatesText" label="资质认证">
                <TextArea className={pageCls.settingsInput} rows={4} placeholder="每行一个资质认证" />
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
            <Popconfirm title="确认删除该教练吗？" okText="删除" cancelText="取消" okButtonProps={{ danger: true }} onConfirm={() => handleDeleteCoach(detailCoach)}>
              <Button className={pageCls.cardActionWarning} icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          </div>
      ) : null}
      >
        {detailCoach ? (
          <div className={pageCls.detailContentStack}>
            <CoachProfileOverviewCard
              name={detailCoach.name}
              coachCodeText={detailCoach.coachCode || '未设置编号'}
              statusLabel={coachStatusLabels[detailCoach.status] || detailCoach.status}
              phoneText={detailCoach.phone}
              emailText={detailCoach.email || '-'}
              experienceText={detailCoach.experience || '经验信息待补充'}
              ratingText={formatCoachRating(detailCoach.rating)}
              specialtiesText={getDisplayListText(detailCoach.specialties, '待补充擅长方向', 3)}
              summaryText={getCoachSummaryText(detailCoach)}
              tone={getToneFromName(detailCoach.name)}
            />

            <CoachProfileStats items={detailCoachStatItems} />

            <SectionCard title="教练档案">
              <Descriptions column={1} size="small" bordered className={pageCls.detailDescriptions}>
                <Descriptions.Item label="教练编号">{detailCoach.coachCode || '-'}</Descriptions.Item>
                <Descriptions.Item label="教练姓名">{detailCoach.name}</Descriptions.Item>
                <Descriptions.Item label="状态">{coachStatusLabels[detailCoach.status] || detailCoach.status}</Descriptions.Item>
                <Descriptions.Item label="手机号">{detailCoach.phone}</Descriptions.Item>
                <Descriptions.Item label="邮箱">{detailCoach.email || '-'}</Descriptions.Item>
                <Descriptions.Item label="经验">{detailCoach.experience || '-'}</Descriptions.Item>
                <Descriptions.Item label="评分">{formatCoachRating(detailCoach.rating)}</Descriptions.Item>
              </Descriptions>
            </SectionCard>

            {detailCoach.bio || detailCoach.specialties?.length || detailCoach.certificates?.length ? (
              <SectionCard title="专业信息" subtitle="集中展示简介、专长与资质，方便快速判断教练定位与资料完备度。">
                <div className={pageCls.workSection}>
                  {detailCoach.bio ? (
                    <div>
                      <div className={`${widgetCls.smallText} ${pageCls.filterFieldLabel}`}>个人简介</div>
                      <div className={widgetCls.detailOverviewText}>{detailCoach.bio}</div>
                    </div>
                  ) : null}

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
              </SectionCard>
            ) : null}
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
