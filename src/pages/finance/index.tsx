import {
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FilterOutlined,
  LineChartOutlined,
  PieChartOutlined,
  PlusOutlined,
  SearchOutlined,
  WalletOutlined
} from '@ant-design/icons';
import { Button, Col, Descriptions, Drawer, Form, Input, InputNumber, Modal, Row, Select, Spin, message } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ActionButton from '@/components/ActionButton';
import { createChartTooltip } from '@/components/ChartTooltip';
import EmptyState from '@/components/EmptyState';
import FilterModalFooter from '@/components/FilterModalFooter';
import MemberAvatar from '@/components/MemberAvatar';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatCard from '@/components/StatCard';
import StatusTag from '@/components/StatusTag';
import { CRUD_MODAL_WIDTH, NARROW_DETAIL_DRAWER_WIDTH } from '@/styles/dimensions';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import { membersApi, type Member } from '@/services/members';
import { transactionsApi, type Transaction } from '@/services/transactions';
import { reportsApi } from '@/services/reports';
import type { AccentTone, TransactionStatus, TransactionKind } from '@/types';
import { getErrorMessage } from '@/utils/errors';
import { formatCurrency, getToneColor } from '@/utils/format';
import { useIsMobile } from '@/utils/useResponsive';
import { axisTick, chartGrid } from '@/utils/chartTheme';
import { getToneFromName } from '@/utils/tone';

const iconMap = {
  wallet: <WalletOutlined />,
  pay: <WalletOutlined />,
  line: <LineChartOutlined />,
  pie: <PieChartOutlined />
};

const statusMap: Record<TransactionStatus, string> = {
  COMPLETED: '已完成',
  PENDING: '待处理',
  PROCESSING: '处理中',
  REFUNDED: '已退款',
  FAILED: '失败',
};

const kindMap: Record<TransactionKind, string> = {
  MEMBERSHIP_PURCHASE: '会籍购买',
  MEMBERSHIP_RENEWAL: '会籍续费',
  CLASS_PACKAGE_PURCHASE: '课程套餐',
  PRIVATE_CLASS_PURCHASE: '私教课程',
  REFUND: '退款',
  ADJUSTMENT: '调整',
};

type TransactionFormValues = {
  memberId?: string;
  kind: TransactionKind;
  status: TransactionStatus;
  amount: number;
  notes?: string;
};

type TransactionFilterDraft = {
  status: string;
  kind: string;
};

const transactionStatusOptions = Object.entries(statusMap).map(([k, v]) => ({ label: v, value: k }));
const transactionKindOptions = Object.entries(kindMap).map(([k, v]) => ({ label: v, value: k }));

const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;

const transactionKindToneMap: Record<TransactionKind, AccentTone> = {
  MEMBERSHIP_PURCHASE: 'mint',
  MEMBERSHIP_RENEWAL: 'violet',
  CLASS_PACKAGE_PURCHASE: 'pink',
  PRIVATE_CLASS_PURCHASE: 'orange',
  REFUND: 'violet',
  ADJUSTMENT: 'violet',
};

export default function FinancePage() {
  const isMobile = useIsMobile();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<TransactionFormValues>();
  const [transactionList, setTransactionList] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('全部');
  const [kindFilter, setKindFilter] = useState<string>('全部');
  const [filterDraft, setFilterDraft] = useState<TransactionFilterDraft>({ status: '全部', kind: '全部' });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [detailTransaction, setDetailTransaction] = useState<Transaction | null>(null);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [revenueStructure, setRevenueStructure] = useState<Array<{ name: string; value: number; fill: string }>>([]);
  const [financeBar, setFinanceBar] = useState<Array<{ month: string; revenue: number }>>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    refundedAmount: 0,
    pendingAmount: 0,
    netRevenue: 0,
  });

  const fetchTransactions = useCallback(async (page = 1, pageSize = 100) => {
    try {
      const from = new Date(Date.now() - SIX_MONTHS_MS).toISOString().split('T')[0];
      const to = new Date().toISOString().split('T')[0];
      const [txRes, summaryRes, reportsRes] = await Promise.all([
        transactionsApi.getAll({ page, pageSize, from, to }),
        transactionsApi.getSummary().catch(() => ({ totalRevenueCents: 0, pendingAmountCents: 0, refundedAmountCents: 0, todayRevenueCents: 0 })),
        reportsApi.getTransactions(from, to).catch(() => null),
      ]);

      setTransactionList(txRes.data);

      const totalRevenue = summaryRes.totalRevenueCents / 100;
      const refundedAmount = summaryRes.refundedAmountCents / 100;
      const pendingAmount = summaryRes.pendingAmountCents / 100;
      setStats({
        totalRevenue,
        refundedAmount,
        pendingAmount,
        netRevenue: totalRevenue - refundedAmount,
      });

      // Build pie chart data from reports
      if (reportsRes?.transactionsByKind) {
        const structure = reportsRes.transactionsByKind.map((item: any) => {
          const tone = transactionKindToneMap[item.kind as TransactionKind] || 'mint';
          const colors = getToneColor(tone);

          return {
            name: kindMap[item.kind as TransactionKind] || item.kind,
            value: Number(item._sum?.amountCents || 0) / 100,
            fill: colors.solid,
          };
        });

        setRevenueStructure(structure);
      }

      // Build bar chart data (aggregate by month from transactions)
      const monthlyData: Record<string, { revenue: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${d.getMonth() + 1}月`;
        monthlyData[key] = { revenue: 0 };
      }
      txRes.data.forEach((tx) => {
        const date = new Date(tx.happenedAt);
        const key = `${date.getMonth() + 1}月`;
        if (monthlyData[key]) {
          const amount = tx.amountCents / 100;
          monthlyData[key].revenue += amount;
        }
      });
      const barData = Object.entries(monthlyData).map(([month, values]) => ({
        month,
        revenue: Math.round(values.revenue),
      }));
      setFinanceBar(barData);
      return txRes.data;
    } catch (err) {
      messageApi.error('获取财务数据失败');
      return [] as Transaction[];
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    setLoading(true);
    void fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const firstPage = await membersApi.getAll(1, 100);
        setMembers(firstPage.data || []);
      } catch {
        // keep transaction UI usable even if member lookup fails
      }
    };

    fetchMembers();
  }, []);

  const filteredTransactions = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase();

    return transactionList.filter((item) => {
      const matchesKeyword =
        keyword.length === 0 ||
        (item.member?.name || '').toLowerCase().includes(keyword) ||
        (kindMap[item.kind] || item.kind).toLowerCase().includes(keyword) ||
        String(item.amountCents).includes(keyword) ||
        item.happenedAt.includes(keyword);
      const matchesStatus = statusFilter === '全部' || item.status === statusFilter;
      const matchesKind = kindFilter === '全部' || item.kind === kindFilter;

      return matchesKeyword && matchesStatus && matchesKind;
    });
  }, [searchValue, statusFilter, kindFilter, transactionList]);

  const visibleTransactions = useMemo(() => {
    if (showAllTransactions || searchValue.trim().length > 0 || statusFilter !== '全部' || kindFilter !== '全部') {
      return filteredTransactions;
    }
    return filteredTransactions.slice(0, 4);
  }, [filteredTransactions, searchValue, showAllTransactions, statusFilter, kindFilter]);

  const financeStats = useMemo(() => [
    {
      title: '累计营收',
      value: formatCurrency(stats.totalRevenue),
      hint: '来源：交易汇总',
      tone: 'mint' as const,
      icon: 'wallet' as const,
    },
    {
      title: '待处理金额',
      value: formatCurrency(stats.pendingAmount),
      hint: '待结算交易',
      tone: 'orange' as const,
      icon: 'pay' as const,
    },
    {
      title: '净营收',
      value: formatCurrency(stats.netRevenue),
      hint: '营收 - 退款',
      tone: 'violet' as const,
      icon: 'line' as const,
    },
    {
      title: '退款占比',
      value: stats.totalRevenue > 0 ? `${((stats.refundedAmount / stats.totalRevenue) * 100).toFixed(1)}%` : '0%',
      hint: '退款监控',
      tone: 'pink' as const,
      icon: 'pie' as const,
    },
  ], [stats]);

  const transactionFilterLabels = [
    searchValue.trim() ? `关键词“${searchValue.trim()}”` : null,
    statusFilter !== '全部' ? `状态：${statusMap[statusFilter as TransactionStatus] || statusFilter}` : null,
    kindFilter !== '全部' ? `类型：${kindMap[kindFilter as TransactionKind] || kindFilter}` : null,
  ].filter(Boolean);

  const exportTransactions = (rows: Transaction[], fileName: string, successMessage: string) => {
    if (rows.length === 0) {
      messageApi.warning('当前没有可导出的交易记录');
      return;
    }

    const csvRows = [
      ['会员姓名', '交易类型', '交易状态', '交易日期', '金额'],
      ...rows.map((item) => [
        item.member?.name || '-',
        kindMap[item.kind] || item.kind,
        statusMap[item.status] || item.status,
        new Date(item.happenedAt).toLocaleDateString('zh-CN'),
        formatCurrency(item.amountCents / 100),
      ])
    ];

    const csv = csvRows
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);

    messageApi.success(successMessage);
  };

  const handleExportReport = () => {
    exportTransactions(filteredTransactions, 'finance-transactions-report.csv', '财务报表已导出');
  };

  const handleExportVisibleTransactions = () => {
    exportTransactions(filteredTransactions, 'recent-transactions.csv', '最近交易已导出');
  };

  const openCreateModal = () => {
    setEditingTransaction(null);
    form.setFieldsValue({
      memberId: undefined,
      kind: 'MEMBERSHIP_PURCHASE',
      status: 'COMPLETED',
      amount: 0,
      notes: '',
    });
    setIsFormOpen(true);
  };

  const openEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    form.setFieldsValue({
      memberId: transaction.memberId,
      kind: transaction.kind,
      status: transaction.status,
      amount: transaction.amountCents / 100,
      notes: transaction.notes || '',
    });
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    setEditingTransaction(null);
    form.resetFields();
  };

  const handleSaveTransaction = async () => {
    try {
      const values = await form.validateFields();
      const data = {
        memberId: values.memberId,
        kind: values.kind,
        status: values.status,
        amountCents: Math.round(values.amount * 100),
        notes: values.notes,
      };

      if (editingTransaction) {
        await transactionsApi.update(editingTransaction.id, data);
        messageApi.success('交易记录已更新');
      } else {
        await transactionsApi.create(data);
        messageApi.success('交易记录已创建');
      }

      const refreshedTransactions = await fetchTransactions();

      if (detailTransaction && editingTransaction) {
        const updated = refreshedTransactions.find((t) => t.id === detailTransaction.id) || null;
        setDetailTransaction(updated);
      }

      setShowAllTransactions(true);
      closeFormModal();
    } catch (err) {
      messageApi.error(getErrorMessage(err, '保存失败'));
    }
  };

  const openFilterModal = () => {
    setFilterDraft({ status: statusFilter, kind: kindFilter });
    setIsFilterOpen(true);
  };

  const applyFilters = () => {
    setStatusFilter(filterDraft.status);
    setKindFilter(filterDraft.kind);
    setShowAllTransactions(true);
    setIsFilterOpen(false);
  };

  const resetFilters = () => {
    const nextDraft: TransactionFilterDraft = { status: '全部', kind: '全部' };
    setFilterDraft(nextDraft);
    setStatusFilter(nextDraft.status);
    setKindFilter(nextDraft.kind);
    setSearchValue('');
    setShowAllTransactions(false);
    setIsFilterOpen(false);
  };

  const handleViewAll = () => {
    const hasActiveQuery = searchValue.trim().length > 0 || statusFilter !== '全部' || kindFilter !== '全部';

    if (hasActiveQuery) {
      resetFilters();
      messageApi.success('已恢复查看全部最近交易');
      return;
    }

    setShowAllTransactions((current) => !current);
  };

  const transactionCountText = `当前共 ${filteredTransactions.length} 笔交易`;
  const transactionResultSummary = transactionFilterLabels.length
    ? `已按${transactionFilterLabels.join('、')}筛选。`
    : showAllTransactions
      ? '当前展示全部最近交易，支持继续筛选、编辑与查看详情。'
      : '默认展示最近交易，可展开查看全部。';
  const viewAllLabel = searchValue.trim().length > 0 || statusFilter !== '全部' || kindFilter !== '全部'
    ? '查看全部'
    : showAllTransactions
      ? '收起列表'
      : '查看全部';

  const FinanceTrendTooltip = createChartTooltip({
    labelMap: { revenue: '营收' },
    valueFormatter: (value) => (typeof value === 'number' ? formatCurrency(value) : value)
  });

  const FinanceStructureTooltip = createChartTooltip({
    labelMap: { value: '金额' },
    titleFormatter: (_, payload) => (typeof payload[0]?.name === 'string' ? payload[0].name : '营收构成'),
    valueFormatter: (value) => (typeof value === 'number' ? formatCurrency(value) : value)
  });

  if (loading && transactionList.length === 0) {
    return (
      <div className={`${pageCls.page} ${pageCls.workPage}`}>
        {contextHolder}
        <PageHeader
          title="财务报表"
          extra={<ActionButton icon={<DownloadOutlined />} onClick={handleExportReport}>导出报表</ActionButton>}
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
        title="财务报表"
        extra={<ActionButton icon={<DownloadOutlined />} onClick={handleExportReport}>导出报表</ActionButton>}
      />

      <div className={pageCls.heroGrid}>
        {financeStats.map((item) => (
          <StatCard key={item.title} {...item} icon={iconMap[item.icon]} />
        ))}
      </div>

      <div className={pageCls.financeTwoCol}>
        <SectionCard title="营收趋势" subtitle="过去 7 个月营收变化">
          <div className={pageCls.chartPanelTall}>
            <ResponsiveContainer>
              <BarChart data={financeBar} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="financeRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--mint)" stopOpacity={0.96} />
                    <stop offset="100%" stopColor="var(--control-primary-end)" stopOpacity={0.78} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={chartGrid} strokeDasharray="3 5" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} interval={isMobile ? 1 : 0} tick={axisTick} />
                <YAxis axisLine={false} tickLine={false} tick={axisTick} />
                <Tooltip cursor={{ fill: 'var(--mint-soft)' }} content={<FinanceTrendTooltip />} />
                <Bar dataKey="revenue" fill="url(#financeRevenue)" radius={[10, 10, 0, 0]} barSize={isMobile ? 16 : 24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="营收构成" subtitle="按交易类型拆分">
          <div className={pageCls.chartPanelTall}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={revenueStructure}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={isMobile ? 52 : 74}
                  outerRadius={isMobile ? 82 : 108}
                  paddingAngle={3}
                  stroke="rgba(255,255,255,0.9)"
                >
                  {revenueStructure.map((item) => (
                    <Cell key={item.name} fill={item.fill} />
                  ))}
                </Pie>
                <Tooltip content={<FinanceStructureTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className={widgetCls.recordList}>
            {revenueStructure.map((item) => (
              <div key={item.name} className={pageCls.rowBetween}>
                <div className={pageCls.legendLabelRow}>
                  <span className={pageCls.legendDot} style={{ background: item.fill }} />
                  <span>{item.name}</span>
                </div>
                <strong>{formatCurrency(item.value)}</strong>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="交易工作台"
        extra={<Button type="text" className={pageCls.textAction} onClick={handleViewAll}>{viewAllLabel}</Button>}
      >
        <div className={pageCls.sectionContentStack}>
          <div className={pageCls.sectionSummaryRow}>
            <div className={pageCls.sectionSummaryText}>{transactionResultSummary}</div>
            <div className={pageCls.statusMetaWrap}>
              {stats.pendingAmount > 0 ? <span className={pageCls.sectionMetaPill}>待处理 ¥{stats.pendingAmount.toLocaleString('zh-CN')}</span> : null}
              {stats.refundedAmount > 0 ? <span className={pageCls.sectionMetaPill}>退款 ¥{stats.refundedAmount.toLocaleString('zh-CN')}</span> : null}
              <span className={pageCls.sectionMetaPill}>{transactionCountText}</span>
            </div>
          </div>

          <div className={`${pageCls.toolbar} ${pageCls.toolbarCompact}`}>
            <div className={pageCls.toolbarLeft}>
              <Input
                className={pageCls.toolbarSearch}
                size="large"
                value={searchValue}
                prefix={<SearchOutlined />}
                placeholder="按会员、交易类型、金额或日期搜索"
                onChange={(event) => {
                  setSearchValue(event.target.value);
                  if (event.target.value.trim().length > 0) {
                    setShowAllTransactions(true);
                  }
                }}
              />
            </div>
            <div className={pageCls.toolbarRight}>
              <ActionButton icon={<FilterOutlined />} ghost onClick={openFilterModal}>筛选条件</ActionButton>
              <ActionButton icon={<DownloadOutlined />} ghost onClick={handleExportVisibleTransactions}>导出</ActionButton>
              <ActionButton icon={<PlusOutlined />} onClick={openCreateModal}>新增交易</ActionButton>
            </div>
          </div>

          {visibleTransactions.length ? (
            <div className={`${widgetCls.recordList} ${pageCls.sectionListStack}`}>
              {visibleTransactions.map((item) => (
                <div key={item.id} className={`${widgetCls.recordItem} ${pageCls.surface} ${pageCls.memberRecordItem}`}>
                  <div className={widgetCls.recordMeta}>
                    <MemberAvatar name={item.member?.name || '未知'} tone={getToneFromName(item.member?.name || '未知')} />
                    <div className={pageCls.memberRecordHead}>
                      <div className={pageCls.memberRecordNameRow}>
                        <span className={pageCls.membersName}>{item.member?.name || '未知会员'}</span>
                        <StatusTag status={statusMap[item.status] || item.status} />
                      </div>
                      <div className={widgetCls.recordSub}>{kindMap[item.kind] || item.kind}</div>
                      <div className={pageCls.membersSubtext}>{new Date(item.happenedAt).toLocaleDateString('zh-CN')}</div>
                    </div>
                  </div>

                  <div className={pageCls.memberRecordGrid}>
                    <div className={pageCls.memberRecordField}>
                      <div className={pageCls.memberRecordLabel}>交易金额</div>
                      <div className={pageCls.memberRecordValue}>{formatCurrency(item.amountCents / 100)}</div>
                    </div>
                    <div className={pageCls.memberRecordField}>
                      <div className={pageCls.memberRecordLabel}>交易状态</div>
                      <div className={`${pageCls.memberRecordValue} ${widgetCls.detailOverviewStatValueLarge}`}>{statusMap[item.status] || item.status}</div>
                    </div>
                    <div className={pageCls.memberRecordField}>
                      <div className={pageCls.memberRecordLabel}>交易日期</div>
                      <div className={`${pageCls.memberRecordValue} ${widgetCls.detailOverviewStatValueLarge}`}>{new Date(item.happenedAt).toLocaleDateString('zh-CN')}</div>
                    </div>
                  </div>

                  <div className={`${pageCls.actionRowWrap} ${pageCls.actionRowWrapEnd}`}>
                      <Button type="primary" size="large" className={pageCls.cardActionHalf} icon={<EyeOutlined />} onClick={() => setDetailTransaction(item)}>核对详情</Button>
                      <Button size="large" className={pageCls.cardActionHalf} icon={<EditOutlined />} onClick={() => openEditModal(item)}>调整记录</Button>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className={pageCls.sectionEmptyState}>
              <EmptyState
                title="暂无符合条件的交易记录"
                description="调整搜索词或筛选条件后再试。"
                actionText="重置筛选"
                onAction={resetFilters}
              />
            </div>
          )}
        </div>
      </SectionCard>

      <Modal
        className={pageCls.crudModal}
        title={editingTransaction ? '编辑交易' : '新增交易'}
        open={isFormOpen}
        width={CRUD_MODAL_WIDTH}
        onCancel={closeFormModal}
        onOk={handleSaveTransaction}
        okText={editingTransaction ? '保存修改' : '新增交易'}
        cancelText="取消"
        destroyOnHidden
      >
        <Form form={form} className={pageCls.crudModalForm} layout="vertical">
          <Row gutter={18}>
            <Col xs={24} md={12}>
              <Form.Item name="memberId" label="关联会员">
                <Select
                  className={pageCls.settingsInput}
                  allowClear
                  showSearch
                  placeholder="可选：选择关联会员"
                  optionFilterProp="label"
                  options={members.map((member) => ({
                    value: member.id,
                    label: `${member.name} · ${member.memberCode || member.phone}`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="kind" label="交易类型" rules={[{ required: true, message: '请选择交易类型' }]}>
                <Select className={pageCls.settingsInput} options={transactionKindOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="status" label="交易状态" rules={[{ required: true, message: '请选择交易状态' }]}>
                <Select className={pageCls.settingsInput} options={transactionStatusOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="amount" label="交易金额（元）" rules={[{ required: true, message: '请输入交易金额' }]}>
                <InputNumber className={`${pageCls.settingsInput} ${pageCls.fullWidthControl}`} min={0} precision={2} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="notes" label="备注">
                <Input className={pageCls.settingsInput} placeholder="交易备注（可选）" />
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
            <div className={`${widgetCls.smallText} ${pageCls.filterFieldLabel}`}>交易状态</div>
            <Select
              value={filterDraft.status}
              className={`${pageCls.settingsInput} ${pageCls.fullWidthControl}`}
              options={[{ label: '全部状态', value: '全部' }, ...transactionStatusOptions]}
              onChange={(value: string) => setFilterDraft((current) => ({ ...current, status: value }))}
            />
          </div>
          <div>
            <div className={`${widgetCls.smallText} ${pageCls.filterFieldLabel}`}>交易类型</div>
            <Select
              value={filterDraft.kind}
              className={`${pageCls.settingsInput} ${pageCls.fullWidthControl}`}
              options={[{ label: '全部类型', value: '全部' }, ...transactionKindOptions]}
              onChange={(value: string) => setFilterDraft((current) => ({ ...current, kind: value }))}
            />
          </div>
        </div>
      </Modal>

      <Drawer
        open={detailTransaction !== null}
        width={NARROW_DETAIL_DRAWER_WIDTH}
        title={detailTransaction?.member?.name ?? '交易详情'}
        onClose={() => setDetailTransaction(null)}
        extra={detailTransaction ? (
          <div className={pageCls.drawerActionGroup}>
            <Button icon={<EditOutlined />} onClick={() => openEditModal(detailTransaction)}>调整记录</Button>
          </div>
        ) : null}
      >
        {detailTransaction ? (
          <div className={pageCls.detailContentStack}>
            <div className={widgetCls.detailOverviewPanel}>
              <div className={widgetCls.recordMeta}>
                <MemberAvatar name={detailTransaction.member?.name || '未知'} tone={getToneFromName(detailTransaction.member?.name || '未知')} />
                <div>
                  <div className={`${widgetCls.recordTitle} ${pageCls.recordTitleRow}`}>
                    {detailTransaction.member?.name || '未知会员'}
                    <StatusTag status={statusMap[detailTransaction.status] || detailTransaction.status} />
                  </div>
                  <div className={widgetCls.recordSub}>{kindMap[detailTransaction.kind] || detailTransaction.kind}</div>
                  <div className={widgetCls.recordSub}>{new Date(detailTransaction.happenedAt).toLocaleDateString('zh-CN')}</div>
                </div>
              </div>
              <div className={widgetCls.detailOverviewStatGrid}>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatMint}`}>
                  <div className={widgetCls.detailInsightLabel}>交易金额</div>
                  <div className={widgetCls.detailOverviewStatValue}>{formatCurrency(detailTransaction.amountCents / 100)}</div>
                </div>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatViolet}`}>
                  <div className={widgetCls.detailInsightLabel}>交易状态</div>
                  <div className={`${widgetCls.detailOverviewStatValue} ${widgetCls.detailOverviewStatValueLarge}`}>{statusMap[detailTransaction.status] || detailTransaction.status}</div>
                </div>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatOrange}`}>
                  <div className={widgetCls.detailInsightLabel}>交易日期</div>
                  <div className={`${widgetCls.detailOverviewStatValue} ${widgetCls.detailOverviewStatValueLarge}`}>{new Date(detailTransaction.happenedAt).toLocaleDateString('zh-CN')}</div>
                </div>
              </div>
            </div>

            <SectionCard title="交易信息">
              <Descriptions column={1} size="small" bordered className={pageCls.detailDescriptions}>
                <Descriptions.Item label="会员姓名">{detailTransaction.member?.name || '-'}</Descriptions.Item>
                <Descriptions.Item label="交易编号">{detailTransaction.transactionCode}</Descriptions.Item>
                <Descriptions.Item label="交易类型">{kindMap[detailTransaction.kind] || detailTransaction.kind}</Descriptions.Item>
                <Descriptions.Item label="交易状态">{statusMap[detailTransaction.status] || detailTransaction.status}</Descriptions.Item>
                <Descriptions.Item label="交易日期">{new Date(detailTransaction.happenedAt).toLocaleDateString('zh-CN')}</Descriptions.Item>
                <Descriptions.Item label="交易金额">{formatCurrency(detailTransaction.amountCents / 100)}</Descriptions.Item>
                <Descriptions.Item label="备注">{detailTransaction.notes || '-'}</Descriptions.Item>
              </Descriptions>
            </SectionCard>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
