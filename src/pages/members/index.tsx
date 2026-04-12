import { DeleteOutlined, DownloadOutlined, EditOutlined, FilterOutlined, PlusOutlined, SearchOutlined, TeamOutlined, ThunderboltOutlined, UserAddOutlined, WarningOutlined } from '@ant-design/icons';
import { Button, Col, Descriptions, Drawer, Form, Input, InputNumber, Modal, Pagination, Popconfirm, Row, Select, Spin, message } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ActionButton from '@/components/ActionButton';
import EmptyState from '@/components/EmptyState';
import FilterModalFooter from '@/components/FilterModalFooter';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import SectionCard from '@/components/SectionCard';
import StatusTag from '@/components/StatusTag';
import { CRUD_MODAL_WIDTH, NARROW_DETAIL_DRAWER_WIDTH } from '@/styles/dimensions';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import { bookingStatusLabels, memberStatusLabels, type MemberStatus, type TransactionKind, type TransactionStatus } from '@/types';
import { membersApi, type Member } from '@/services/members';
import { membershipPlansApi, type MembershipPlan } from '@/services/membershipPlans';
import { type Booking } from '@/services/bookings';
import { type Transaction } from '@/services/transactions';
import { reportsApi } from '@/services/reports';
import { getErrorMessage } from '@/utils/errors';
import { getToneFromName } from '@/utils/tone';
import {
  MemberProfileOverviewCard,
  MemberProfileStats,
  MemberRecordCard,
} from './components';
import styles from './index.module.css';

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

const transactionStatusLabels: Record<TransactionStatus, string> = {
  COMPLETED: '已完成',
  PENDING: '待处理',
  PROCESSING: '处理中',
  REFUNDED: '已退款',
  FAILED: '失败',
};

const transactionKindLabels: Record<TransactionKind, string> = {
  MEMBERSHIP_PURCHASE: '会籍购买',
  MEMBERSHIP_RENEWAL: '会籍续费',
  CLASS_PACKAGE_PURCHASE: '课程套餐',
  PRIVATE_CLASS_PURCHASE: '私教课程',
  REFUND: '退款',
  ADJUSTMENT: '调整',
};

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
  const [detailBookings, setDetailBookings] = useState<Booking[]>([]);
  const [detailTransactions, setDetailTransactions] = useState<Transaction[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
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
  }, [messageApi]);

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
  }, [messageApi]);

  // Fetch members
  const fetchMembers = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const response = await membersApi.getAll(page, pageSize, {
        search: searchValue.trim() || undefined,
        status: statusFilter === '全部' ? undefined : statusFilter,
        planId: planFilter === '全部' ? undefined : planFilter,
      });
      setMembers(response.data);
      setTotal(response.meta.total);
      setCurrentPage(response.meta.page);
    } catch {
      messageApi.error('获取会员列表失败');
    } finally {
      setLoading(false);
    }
  }, [messageApi, pageSize, planFilter, searchValue, statusFilter]);

  useEffect(() => {
    void fetchMembers(1);
  }, [fetchMembers]);

  useEffect(() => {
    if (!detailMember) {
      setDetailBookings([]);
      setDetailTransactions([]);
      setDetailLoading(false);
      return;
    }

    let cancelled = false;

    const fetchDetailActivity = async () => {
      try {
        setDetailLoading(true);
        const [bookings, transactions] = await Promise.all([
          membersApi.getBookings(detailMember.id) as Promise<Booking[]>,
          membersApi.getTransactions(detailMember.id) as Promise<Transaction[]>,
        ]);

        if (cancelled) return;

        setDetailBookings((bookings || []).slice(0, 5));
        setDetailTransactions((transactions || []).slice(0, 5));
      } catch (err) {
        if (!cancelled) {
          messageApi.error(getErrorMessage(err, '加载会员近期记录失败'));
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    };

    fetchDetailActivity();

    return () => {
      cancelled = true;
    };
  }, [detailMember, messageApi]);

  const membersStats = useMemo(() => [
    { title: '总会员数', value: String(stats.totalMembers), hint: '↑ 7.2% 环比增长', tone: 'mint' as const, icon: 'team' as const },
    { title: '活跃会员', value: String(stats.activeMembers), hint: `活跃率 ${stats.totalMembers ? ((stats.activeMembers / stats.totalMembers) * 100).toFixed(1) : 0}%`, tone: 'violet' as const, icon: 'flash' as const },
    { title: '本月新增', value: String(stats.newMembersThisMonth), hint: '较上月新增', tone: 'pink' as const, icon: 'plus' as const },
    { title: '即将到期', value: String(stats.expiringSoonCount), hint: '需跟进续费', tone: 'orange' as const, icon: 'alert' as const },
  ], [stats]);

  const currentPlanLabel = planFilter === '全部'
    ? null
    : membershipPlans.find((plan) => plan.id === planFilter)?.name || '已选会籍';

  const memberFilterLabels = [
    searchValue.trim() ? `关键词“${searchValue.trim()}”` : null,
    statusFilter !== '全部' ? `状态：${memberStatusLabels[statusFilter]}` : null,
    currentPlanLabel ? `会籍：${currentPlanLabel}` : null,
  ].filter(Boolean);

  const membersCountText = `当前共 ${total} 位会员`;
  const membersResultSummary = memberFilterLabels.length
    ? `已按${memberFilterLabels.join('、')}筛选，当前匹配 ${total} 位会员。`
    : `当前共 ${total} 位会员，可继续查看档案、编辑资料或导出当前结果。`;

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
    if (members.length === 0) {
      messageApi.warning('当前没有可导出的会员记录');
      return;
    }

    const rows = [
      ['姓名', '手机号', '邮箱', '会籍类型', '会籍状态', '剩余课时', '加入日期'],
      ...members.map((member) => [
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

  const formatDateTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amountCents: number) => `¥${(amountCents / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getMemberTierLabel = (member: Member) => {
    if (member.plan?.name?.includes('金')) return 'GOLD';
    if (member.plan?.name?.includes('年')) return 'ANNUAL';
    if (member.remainingCredits >= 20) return 'PREMIUM';
    return 'ACTIVE';
  };

  const getMemberProgressPercent = (member: Member) => {
    if (member.remainingCredits <= 0) return 0;
    return Math.min(100, Math.max(12, Math.round((member.remainingCredits / 40) * 100)));
  };

  const getMemberSummaryStats = (member: Member) => [
    {
      key: 'credits',
      label: '剩余课时',
      value: `${member.remainingCredits}`,
      hint: member.remainingCredits > 0 ? '仍可继续预约课程' : '建议尽快补充课时',
    },
    {
      key: 'joined',
      label: '加入时间',
      value: formatDate(member.joinedAt),
      hint: member.memberCode || '会员编号待补充',
    },
    {
      key: 'plan',
      label: '当前会籍',
      value: member.plan?.name || '-',
      hint: memberStatusLabels[member.status],
    },
  ];

  if (loading && members.length === 0) {
    return (
      <div className={`${pageCls.page} ${pageCls.workPage}`}>
        {contextHolder}
        <PageHeader
          title="会员管理"
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
        extra={<ActionButton icon={<PlusOutlined />} onClick={openCreateModal}>新增会员</ActionButton>}
      />

      <div className={pageCls.heroGrid}>
        {membersStats.map((item) => (
          <StatCard key={item.title} {...item} icon={iconMap[item.icon]} />
        ))}
      </div>

      <SectionCard
        title="会员列表"
      >
        <div className={pageCls.sectionContentStack}>
          <div className={pageCls.sectionSummaryRow}>
            <div className={pageCls.sectionSummaryText}>{membersResultSummary}</div>
            <span className={pageCls.sectionMetaPill}>{membersCountText}</span>
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
              <ActionButton icon={<FilterOutlined />} ghost onClick={openFilterModal}>筛选条件</ActionButton>
              <ActionButton icon={<DownloadOutlined />} ghost onClick={handleExportMembers}>导出</ActionButton>
            </div>
          </div>

          {members.length ? (
            <>
              <div className={`${widgetCls.recordList} ${pageCls.sectionListStack}`}>
                {members.map((member) => (
                  <MemberRecordCard
                    key={member.id}
                    id={member.id}
                    name={member.name}
                    phone={member.phone}
                    email={member.email || '-'}
                    planName={member.plan?.name || '-'}
                    joinedDateText={formatDate(member.joinedAt)}
                    remainingCreditsText={`剩余课时 ${member.remainingCredits} 节`}
                    memberCodeText={member.memberCode || 'MEMBER'}
                    statusLabel={memberStatusLabels[member.status]}
                    tone={getToneFromName(member.name)}
                    onEdit={() => openEditModal(member)}
                    onViewDetail={() => setDetailMember(member)}
                  />
                ))}
              </div>
              <div className={pageCls.sectionPagination}>
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
            <div className={pageCls.sectionEmptyState}>
              <EmptyState
                title="暂无符合条件的会员"
                description="调整搜索词或筛选条件后再试。"
                actionText="清空筛选"
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
                <Input className={pageCls.settingsInput} placeholder="请输入会员姓名" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="phone" label="手机号" rules={[{ required: true, message: '请输入手机号' }]}>
                <Input className={pageCls.settingsInput} placeholder="请输入手机号" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="email" label="邮箱" rules={[{ type: 'email', message: '请输入有效邮箱地址' }]}>
                <Input className={pageCls.settingsInput} placeholder="请输入邮箱" />
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
        title="筛选条件"
        open={isFilterOpen}
        onCancel={() => setIsFilterOpen(false)}
        onOk={applyFilters}
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
            <MemberProfileOverviewCard
              name={detailMember.name}
              phone={detailMember.phone}
              email={detailMember.email || '-'}
              memberCodeText={detailMember.memberCode || 'MEMBER'}
              tierLabel={getMemberTierLabel(detailMember)}
              planName={detailMember.plan?.name || '未分配会籍'}
              statusLabel={memberStatusLabels[detailMember.status]}
              joinedDateText={formatDate(detailMember.joinedAt)}
              remainingCreditsText={`${detailMember.remainingCredits} 节`}
              progressPercent={getMemberProgressPercent(detailMember)}
              progressLabel={`剩余课时 ${detailMember.remainingCredits} 节`}
              tone={getToneFromName(detailMember.name)}
              onPrimaryAction={() => openEditModal(detailMember)}
            />

            <MemberProfileStats items={getMemberSummaryStats(detailMember)} />

            <SectionCard title="基础档案" subtitle="保留管理员所需的完整字段，便于快速核对与后续编辑。">
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="姓名">{detailMember.name}</Descriptions.Item>
                <Descriptions.Item label="会员编号">{detailMember.memberCode || '-'}</Descriptions.Item>
                <Descriptions.Item label="手机号">{detailMember.phone}</Descriptions.Item>
                <Descriptions.Item label="邮箱">{detailMember.email || '-'}</Descriptions.Item>
                <Descriptions.Item label="会籍类型">{detailMember.plan?.name || '-'}</Descriptions.Item>
                <Descriptions.Item label="会籍状态">{memberStatusLabels[detailMember.status]}</Descriptions.Item>
                <Descriptions.Item label="剩余课时">{detailMember.remainingCredits} 节</Descriptions.Item>
                <Descriptions.Item label="加入日期">{formatDate(detailMember.joinedAt)}</Descriptions.Item>
              </Descriptions>
            </SectionCard>

            <SectionCard title="近期预约" subtitle="展示最近预约记录，方便跟进到课、取消与课程偏好。">
              {detailLoading ? (
                <div className={pageCls.centeredStatePadded}><Spin /></div>
              ) : detailBookings.length ? (
                <div className={`${widgetCls.recordList} ${styles.activityList}`}>
                  {detailBookings.map((booking) => (
                    <div key={booking.id} className={`${widgetCls.recordItem} ${widgetCls.workRecordItem}`}>
                      <div className={widgetCls.recordMeta}>
                        <div>
                          <div className={`${widgetCls.recordTitle} ${pageCls.recordTitleRow}`}>
                            {booking.session?.course?.name || '未知课程'}
                            <StatusTag status={bookingStatusLabels[booking.status]} />
                          </div>
                          <div className={widgetCls.recordSub}>{booking.bookingCode}</div>
                          <div className={widgetCls.recordSub}>{formatDateTime(booking.session?.startsAt || booking.bookedAt)} · 教练 {booking.session?.coach?.name || '-'}</div>
                        </div>
                      </div>
                      <div className={widgetCls.infoStack}>
                        <div>来源：{booking.source === 'MINI_PROGRAM' ? '小程序' : '后台'}</div>
                        <div>预约时间：{formatDateTime(booking.bookedAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="暂无预约记录" description="该会员最近还没有预约课程，后续有记录后会展示在这里。" />
              )}
            </SectionCard>

            <SectionCard title="近期交易" subtitle="展示会籍购买、续费与课时相关交易，便于核对营收与跟进说明。">
              {detailLoading ? (
                <div className={pageCls.centeredStatePadded}><Spin /></div>
              ) : detailTransactions.length ? (
                <div className={`${widgetCls.recordList} ${styles.activityList}`}>
                  {detailTransactions.map((transaction) => (
                    <div key={transaction.id} className={`${widgetCls.recordItem} ${widgetCls.workRecordItem}`}>
                      <div className={widgetCls.recordMeta}>
                        <div>
                          <div className={`${widgetCls.recordTitle} ${pageCls.recordTitleRow}`}>
                            {transactionKindLabels[transaction.kind]}
                            <StatusTag status={transactionStatusLabels[transaction.status]} />
                          </div>
                          <div className={widgetCls.recordSub}>{transaction.transactionCode}</div>
                          <div className={widgetCls.recordSub}>{transaction.plan?.name || '未关联会籍'} · {formatDateTime(transaction.happenedAt)}</div>
                        </div>
                      </div>
                      <div className={styles.transactionAside}>
                        <span className={widgetCls.chipPrimary}>{formatCurrency(transaction.amountCents)}</span>
                        {transaction.notes ? <span className={widgetCls.chip}>{transaction.notes}</span> : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="暂无交易记录" description="该会员最近没有可展示的会籍或课时交易记录。" />
              )}
            </SectionCard>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
