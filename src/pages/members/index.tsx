import { DeleteOutlined, DownloadOutlined, EditOutlined, FilterOutlined, PlusOutlined, SearchOutlined, TeamOutlined, ThunderboltOutlined, UserAddOutlined, WarningOutlined } from '@ant-design/icons';
import { Button, Col, Descriptions, Drawer, Form, Input, InputNumber, Modal, Pagination, Popconfirm, Row, Select, Spin, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import ActionButton from '@/components/ActionButton';
import EmptyState from '@/components/EmptyState';
import FilterModalFooter from '@/components/FilterModalFooter';
import MemberAvatar from '@/components/MemberAvatar';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import StatusTag from '@/components/StatusTag';
import { CRUD_MODAL_WIDTH, NARROW_DETAIL_DRAWER_WIDTH } from '@/styles/dimensions';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import { memberStatusLabels, type MemberStatus } from '@/types';
import { membersApi, type Member } from '@/services/members';
import { membershipPlansApi, type MembershipPlan } from '@/services/membershipPlans';
import { reportsApi } from '@/services/reports';
import { getErrorMessage } from '@/utils/errors';
import { getToneFromName } from '@/utils/tone';

const iconMap = {
  team: <TeamOutlined />,
  flash: <ThunderboltOutlined />,
  plus: <UserAddOutlined />,
  alert: <WarningOutlined />
};

type MemberFormValues = {
  name: string;
  phone: string;
  email?: string;
  planId?: string;
  status: MemberStatus;
  remainingCredits: number;
};

type MemberFilterDraft = {
  status: MemberStatus | '全部';
  planId: string;
};

const memberStatusOptions: MemberStatus[] = ['ACTIVE', 'PENDING', 'EXPIRED'];

export default function MembersPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<MemberFormValues>();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<MemberStatus | '全部'>('全部');
  const [planFilter, setPlanFilter] = useState<string>('全部');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState<MemberFilterDraft>({ status: '全部', planId: '全部' });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [detailMember, setDetailMember] = useState<Member | null>(null);
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    newMembersThisMonth: 0,
    expiringSoonCount: 0,
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await reportsApi.getMembers();
        const expiringSoonCount = await reportsApi.getMemberExpiringSoon(30).catch(() => 0);
        setStats({
          totalMembers: data.totalMembers,
          activeMembers: data.activeMembers,
          newMembersThisMonth: data.newMembersThisMonth,
          expiringSoonCount,
        });
      } catch (err) {
        messageApi.error(getErrorMessage(err, '加载会员统计失败'));
      }
    };
    fetchStats();
  }, []);

  // Fetch membership plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const plans = await membershipPlansApi.getAll();
        setMembershipPlans(plans);
      } catch (err) {
        messageApi.error(getErrorMessage(err, '加载会籍计划失败'));
      }
    };
    fetchPlans();
  }, []);

  // Fetch members
  const fetchMembers = async (page = 1) => {
    try {
      setLoading(true);
      const response = await membersApi.getAll(page, pageSize);
      setMembers(response.data);
      setTotal(response.meta.total);
      setCurrentPage(response.meta.page);
    } catch {
      messageApi.error('获取会员列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers(1);
  }, []);

  const filteredMembers = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase();

    return members.filter((member) => {
      const matchesKeyword =
        keyword.length === 0 ||
        member.name.toLowerCase().includes(keyword) ||
        member.phone.toLowerCase().includes(keyword) ||
        (member.email?.toLowerCase().includes(keyword) ?? false);
      const matchesStatus = statusFilter === '全部' || member.status === statusFilter;
      const matchesPlan = planFilter === '全部' || member.plan?.id === planFilter;

      return matchesKeyword && matchesStatus && matchesPlan;
    });
  }, [members, planFilter, searchValue, statusFilter]);

  const membersStats = useMemo(() => [
    { title: '总会员数', value: String(stats.totalMembers), hint: '↑ 7.2% 环比增长', tone: 'mint' as const, icon: 'team' as const },
    { title: '活跃会员', value: String(stats.activeMembers), hint: `活跃率 ${stats.totalMembers ? ((stats.activeMembers / stats.totalMembers) * 100).toFixed(1) : 0}%`, tone: 'violet' as const, icon: 'flash' as const },
    { title: '本月新增', value: String(stats.newMembersThisMonth), hint: '较上月新增', tone: 'pink' as const, icon: 'plus' as const },
    { title: '即将到期', value: String(stats.expiringSoonCount), hint: '需跟进续费', tone: 'orange' as const, icon: 'alert' as const },
  ], [stats]);

  const planOptions = useMemo(() =>
    Array.from(new Set(membershipPlans.map((plan) => plan.name))),
    [membershipPlans]
  );

  const openCreateModal = () => {
    setEditingMember(null);
    form.setFieldsValue({
      name: '',
      phone: '',
      email: '',
      planId: undefined,
      status: 'ACTIVE',
      remainingCredits: 0,
    });
    setIsFormOpen(true);
  };

  const openEditModal = (member: Member) => {
    setEditingMember(member);
    form.setFieldsValue({
      name: member.name,
      phone: member.phone,
      email: member.email,
      planId: member.plan?.id,
      status: member.status,
      remainingCredits: member.remainingCredits,
    });
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    setEditingMember(null);
    form.resetFields();
  };

  const handleSaveMember = async () => {
    const values = await form.validateFields();

    try {
      if (editingMember) {
        await membersApi.update(editingMember.id, values);
        messageApi.success('会员信息已更新');
      } else {
        await membersApi.create(values);
        messageApi.success('新会员已添加');
      }
      await fetchMembers(currentPage);
      closeFormModal();
    } catch (err) {
      messageApi.error(getErrorMessage(err, '保存失败'));
    }
  };

  const handleDeleteMember = async (member: Member) => {
    try {
      await membersApi.delete(member.id);
      await fetchMembers(currentPage);

      if (detailMember?.id === member.id) {
        setDetailMember(null);
      }

      messageApi.success(`已删除会员 ${member.name}`);
    } catch (err) {
      messageApi.error(getErrorMessage(err, '删除失败'));
    }
  };

  const handleExportMembers = () => {
    if (filteredMembers.length === 0) {
      messageApi.warning('当前没有可导出的会员记录');
      return;
    }

    const rows = [
      ['姓名', '手机号', '邮箱', '会籍类型', '会籍状态', '剩余课时', '加入日期'],
      ...filteredMembers.map((member) => [
        member.name,
        member.phone,
        member.email || '',
        member.plan?.name || '-',
        member.status,
        String(member.remainingCredits),
        new Date(member.joinedAt).toLocaleDateString('zh-CN'),
      ])
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'members-export.csv';
    link.click();
    URL.revokeObjectURL(url);

    messageApi.success('会员数据已导出');
  };

  const openFilterModal = () => {
    setFilterDraft({ status: statusFilter, planId: planFilter });
    setIsFilterOpen(true);
  };

  const applyFilters = () => {
    setStatusFilter(filterDraft.status);
    setPlanFilter(filterDraft.planId);
    setIsFilterOpen(false);
  };

  const resetFilters = () => {
    const nextDraft: MemberFilterDraft = { status: '全部', planId: '全部' };

    setFilterDraft(nextDraft);
    setStatusFilter(nextDraft.status);
    setPlanFilter(nextDraft.planId);
    setIsFilterOpen(false);
  };

  const handlePageChange = (page: number) => {
    fetchMembers(page);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('zh-CN');
    } catch {
      return dateStr;
    }
  };

  if (loading && members.length === 0) {
    return (
      <div className={`${pageCls.page} ${pageCls.workPage}`}>
        {contextHolder}
        <PageHeader
          title="会员管理"
          subtitle="管理所有会员信息和会籍状态。"
          extra={<ActionButton icon={<PlusOutlined />} onClick={openCreateModal}>新增会员</ActionButton>}
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
        title="会员管理"
        subtitle="管理所有会员信息和会籍状态。"
        extra={<ActionButton icon={<PlusOutlined />} onClick={openCreateModal}>新增会员</ActionButton>}
      />

      <div className={pageCls.heroGrid}>
        {membersStats.map((item) => (
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
            placeholder="按会员姓名、手机号或邮箱搜索"
            onChange={(event) => setSearchValue(event.target.value)}
          />
        </div>
        <div className={pageCls.toolbarRight}>
          <ActionButton icon={<FilterOutlined />} ghost onClick={openFilterModal}>筛选</ActionButton>
          <ActionButton icon={<DownloadOutlined />} ghost onClick={handleExportMembers}>导出</ActionButton>
        </div>
      </div>

      {filteredMembers.length ? (
        <>
          <div className={`${widgetCls.recordList} ${pageCls.workSection}`}>
            {filteredMembers.map((member) => (
              <div key={member.id} className={`${widgetCls.recordItem} ${widgetCls.workRecordItem} ${pageCls.surface} ${pageCls.memberRecordItem}`}>
                <div className={widgetCls.recordMeta}>
                  <MemberAvatar name={member.name} tone={getToneFromName(member.name)} />
                  <div className={pageCls.memberRecordHead}>
                    <div className={pageCls.memberRecordNameRow}>
                      <span className={pageCls.membersName}>{member.name}</span>
                      <StatusTag status={memberStatusLabels[member.status]} />
                    </div>
                    <div className={widgetCls.recordSub}>{member.phone}</div>
                    <div className={pageCls.membersSubtext}>{member.email || '-'}</div>
                  </div>
                </div>

                <div className={pageCls.memberRecordGrid}>
                  <div className={pageCls.memberRecordField}>
                    <div className={pageCls.memberRecordLabel}>会籍类型</div>
                    <div className={pageCls.memberRecordValue}>{member.plan?.name || '-'}</div>
                  </div>
                  <div className={pageCls.memberRecordField}>
                    <div className={pageCls.memberRecordLabel}>加入日期</div>
                    <div className={pageCls.memberRecordValue}>{formatDate(member.joinedAt)}</div>
                  </div>
                  <div className={pageCls.memberRecordField}>
                    <div className={pageCls.memberRecordLabel}>剩余课时</div>
                    <div className={pageCls.memberRecordValue}>{member.remainingCredits} 节</div>
                  </div>
                </div>

                <div className={widgetCls.detailActionGroup}>
                  <div className={pageCls.memberRemainingBadge}>剩余课时 {member.remainingCredits} 节</div>
                  <Button size="large" className={pageCls.cardActionHalf} icon={<EditOutlined />} onClick={() => openEditModal(member)}>编辑</Button>
                  <Button size="large" className={pageCls.cardActionHalf} onClick={() => setDetailMember(member)}>查看详情</Button>
                </div>
              </div>
            ))}
          </div>
          <div className={pageCls.centerPagination}>
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={total}
              onChange={handlePageChange}
              showSizeChanger={false}
            />
          </div>
        </>
      ) : (
        <div className={`${pageCls.surface} ${widgetCls.detailCard} ${pageCls.surfaceTopSpace}`}>
          <EmptyState title="暂无符合条件的会员" description="试试调整搜索词或清空筛选条件，也可以直接新增会员。" actionText="清空筛选" onAction={() => { setSearchValue(''); resetFilters(); }} />
        </div>
      )}

      <Modal
        className={pageCls.crudModal}
        title={editingMember ? '编辑会员' : '新增会员'}
        open={isFormOpen}
        width={CRUD_MODAL_WIDTH}
        onCancel={closeFormModal}
        onOk={handleSaveMember}
        okText={editingMember ? '保存修改' : '新增会员'}
        cancelText="取消"
        destroyOnHidden
      >
        <Form form={form} className={pageCls.crudModalForm} layout="vertical">
          <Row gutter={18}>
            <Col xs={24} md={12}>
              <Form.Item name="name" label="会员姓名" rules={[{ required: true, message: '请输入会员姓名' }]}>
                <Input className={pageCls.settingsInput} placeholder="例如：林若溪" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="phone" label="手机号" rules={[{ required: true, message: '请输入手机号' }]}>
                <Input className={pageCls.settingsInput} placeholder="例如：138****5612" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="email" label="邮箱" rules={[{ type: 'email', message: '请输入有效邮箱地址' }]}>
                <Input className={pageCls.settingsInput} placeholder="例如：member@demo.com" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="planId" label="会籍类型">
                <Select
                  className={pageCls.settingsInput}
                  placeholder="请选择会籍类型"
                  options={membershipPlans.map((plan) => ({ label: plan.name, value: plan.id }))}
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="status" label="会籍状态" rules={[{ required: true, message: '请选择会籍状态' }]}>
                 <Select
                   className={pageCls.settingsInput}
                   options={memberStatusOptions.map((item) => ({ label: memberStatusLabels[item], value: item }))}
                 />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="remainingCredits" label="剩余课时" rules={[{ required: true, message: '请输入剩余课时' }]}>
                <InputNumber className={`${pageCls.settingsInput} ${pageCls.fullWidthControl}`} min={0} precision={0} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title="筛选会员"
        open={isFilterOpen}
        onCancel={() => setIsFilterOpen(false)}
        onOk={applyFilters}
        okText="应用筛选"
        cancelText="取消"
        destroyOnHidden
        footer={<FilterModalFooter onReset={resetFilters} onCancel={() => setIsFilterOpen(false)} onApply={applyFilters} />}
      >
        <div className={pageCls.filterModalBody}>
          <div>
            <div className={`${widgetCls.smallText} ${pageCls.filterFieldLabel}`}>会籍状态</div>
            <Select
              value={filterDraft.status}
              className={pageCls.settingsInput}
              options={[{ label: '全部状态', value: '全部' }, ...memberStatusOptions.map((item) => ({ label: memberStatusLabels[item], value: item }))]}
              onChange={(value: MemberStatus | '全部') => setFilterDraft((current) => ({ ...current, status: value }))}
            />
          </div>
          <div>
            <div className={`${widgetCls.smallText} ${pageCls.filterFieldLabel}`}>会籍类型</div>
            <Select
              value={filterDraft.planId}
              className={pageCls.settingsInput}
              options={[{ label: '全部会籍', value: '全部' }, ...membershipPlans.map((plan) => ({ label: plan.name, value: plan.id }))]}
              onChange={(value: string) => setFilterDraft((current) => ({ ...current, planId: value }))}
            />
          </div>
        </div>
      </Modal>

      <Drawer
        open={detailMember !== null}
        width={NARROW_DETAIL_DRAWER_WIDTH}
        title={detailMember?.name ?? '会员详情'}
        onClose={() => setDetailMember(null)}
        extra={detailMember ? (
          <div className={pageCls.drawerActionGroup}>
            <Button icon={<EditOutlined />} onClick={() => openEditModal(detailMember)}>编辑</Button>
            <Popconfirm title="确认删除该会员吗？" okText="删除" cancelText="取消" onConfirm={() => handleDeleteMember(detailMember)}>
              <Button danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          </div>
        ) : null}
      >
        {detailMember ? (
          <div className={pageCls.detailContentStack}>
            <div className={widgetCls.detailOverviewPanel}>
              <div className={widgetCls.recordMeta}>
                <MemberAvatar name={detailMember.name} tone={getToneFromName(detailMember.name)} />
                <div>
                  <div className={`${widgetCls.recordTitle} ${pageCls.recordTitleRow}`}>
                    {detailMember.name}
                     <StatusTag status={memberStatusLabels[detailMember.status]} />
                  </div>
                  <div className={widgetCls.recordSub}>{detailMember.phone}</div>
                  <div className={widgetCls.recordSub}>{detailMember.email || '-'}</div>
                </div>
              </div>
              <div className={widgetCls.detailOverviewStatGrid}>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatMint}`}>
                  <div className={widgetCls.detailInsightLabel}>剩余课时</div>
                  <div className={widgetCls.detailOverviewStatValue}>{detailMember.remainingCredits} 节</div>
                </div>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatViolet}`}>
                  <div className={widgetCls.detailInsightLabel}>会籍类型</div>
                  <div className={`${widgetCls.detailOverviewStatValue} ${widgetCls.detailOverviewStatValueLarge}`}>{detailMember.plan?.name || '-'}</div>
                </div>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatOrange}`}>
                  <div className={widgetCls.detailInsightLabel}>加入日期</div>
                  <div className={`${widgetCls.detailOverviewStatValue} ${widgetCls.detailOverviewStatValueLarge}`}>{formatDate(detailMember.joinedAt)}</div>
                </div>
              </div>
            </div>

            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="姓名">{detailMember.name}</Descriptions.Item>
              <Descriptions.Item label="手机号">{detailMember.phone}</Descriptions.Item>
              <Descriptions.Item label="邮箱">{detailMember.email || '-'}</Descriptions.Item>
              <Descriptions.Item label="会籍类型">{detailMember.plan?.name || '-'}</Descriptions.Item>
               <Descriptions.Item label="会籍状态">{memberStatusLabels[detailMember.status]}</Descriptions.Item>
              <Descriptions.Item label="剩余课时">{detailMember.remainingCredits} 节</Descriptions.Item>
              <Descriptions.Item label="加入日期">{formatDate(detailMember.joinedAt)}</Descriptions.Item>
            </Descriptions>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
