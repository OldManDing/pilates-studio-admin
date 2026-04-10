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
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ActionButton from '@/components/ActionButton';
import { createChartTooltip } from '@/components/ChartTooltip';
import MemberAvatar from '@/components/MemberAvatar';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatCard from '@/components/StatCard';
import StatusTag from '@/components/StatusTag';
import { CRUD_MODAL_WIDTH, NARROW_DETAIL_DRAWER_WIDTH } from '@/styles/dimensions';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import { transactionsApi, type Transaction } from '@/services/transactions';
import { reportsApi } from '@/services/reports';
import type { TransactionStatus, TransactionKind } from '@/types';
import { getErrorMessage } from '@/utils/errors';
import { formatCurrency, formatPercent } from '@/utils/format';
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

const reverseStatusMap: Record<string, TransactionStatus> = {
  '已完成': 'COMPLETED',
  '待处理': 'PENDING',
  '处理中': 'PROCESSING',
  '已退款': 'REFUNDED',
  '失败': 'FAILED',
};

type TransactionFormValues = {
  memberName: string;
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

const kindColorMap: Record<TransactionKind, string> = {
  MEMBERSHIP_PURCHASE: '#43c7ab',
  MEMBERSHIP_RENEWAL: '#8b7cff',
  CLASS_PACKAGE_PURCHASE: '#ff8da8',
  PRIVATE_CLASS_PURCHASE: '#ffb760',
  REFUND: '#73a7ff',
  ADJUSTMENT: '#73a7ff',
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
  const [revenueStructure, setRevenueStructure] = useState<Array<{ name: string; value: number; fill: string }>>([]);
  const [financeBar, setFinanceBar] = useState<Array<{ month: string; revenue: number }>>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalExpense: 0,
    netProfit: 0,
    profitMargin: '-', // 后端暂无支出数据
  });

  const fetchTransactions = async (page = 1, pageSize = 100) => {
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
      setStats({
        totalRevenue,
        totalExpense: 0,
        netProfit: 0,
        profitMargin: '待接入',
      });

      // Build pie chart data from reports
      if (reportsRes?.transactionsByKind) {
        const structure = reportsRes.transactionsByKind.map((item: any) => ({
          name: kindMap[(item.kind as TransactionKind)] || item.kind,
          value: Number(item._sum?.amountCents || 0) / 100,
          fill: kindColorMap[(item.kind as TransactionKind)] || '#999',
        }));
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
    } catch (err) {
      messageApi.error('获取财务数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchTransactions();
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
    { title: '本月营收', value: formatCurrency(stats.totalRevenue), hint: '月度环比待接入', tone: 'mint' as const, icon: 'wallet' as const },
    { title: '本月支出', value: '待接入', hint: '后端暂未提供支出汇总', tone: 'orange' as const, icon: 'pay' as const },
    { title: '净利润', value: '待接入', hint: '需接入真实支出后计算', tone: 'violet' as const, icon: 'line' as const },
    { title: '利润率', value: stats.profitMargin, hint: '需接入真实支出后计算', tone: 'pink' as const, icon: 'pie' as const },
  ], [stats]);

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
      memberName: '',
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
      memberName: transaction.member?.name || '',
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
        kind: values.kind,
        status: values.status,
        amountCents: Math.round(values.amount * 100),
        notes: values.notes,
      };

      if (editingTransaction) {
        await transactionsApi.updateStatus(editingTransaction.id, values.status);
        messageApi.success('交易记录已更新');
      } else {
        await transactionsApi.create(data);
        messageApi.success('交易记录已创建');
      }

      await fetchTransactions();

      if (detailTransaction && editingTransaction) {
        const updated = transactionList.find((t) => t.id === detailTransaction.id) || null;
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

  const transactionCountLabel = `${filteredTransactions.length} 条记录`;
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
      <div className={`${pageCls.page} ${pageCls.showcasePage}`}>
        {contextHolder}
        <PageHeader
          title="财务报表"
          subtitle="查看营收、支出与门店财务分析。"
          extra={<ActionButton icon={<DownloadOutlined />} onClick={handleExportReport}>导出报表</ActionButton>}
        />
        <div className={`${pageCls.centeredState} ${pageCls.centeredStateTall}`}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  return (
    <div className={`${pageCls.page} ${pageCls.showcasePage}`}>
      {contextHolder}
      <PageHeader
        title="财务报表"
        subtitle="查看营收、支出与门店财务分析。"
        extra={<ActionButton icon={<DownloadOutlined />} onClick={handleExportReport}>导出报表</ActionButton>}
      />

      <div className={pageCls.heroGrid}>
        {financeStats.map((item) => (
          <StatCard key={item.title} {...item} icon={iconMap[item.icon]} />
        ))}
      </div>

      <div className={pageCls.financeTwoCol}>
        <SectionCard title="营收趋势" subtitle="过去 7 个月真实营收变化">
          <div className={pageCls.chartPanelTall}>
            <ResponsiveContainer>
              <BarChart data={financeBar} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="financeRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#43c7ab" stopOpacity={0.96} />
                    <stop offset="100%" stopColor="#6be0c8" stopOpacity={0.78} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={chartGrid} strokeDasharray="3 5" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} interval={isMobile ? 1 : 0} tick={axisTick} />
                <YAxis axisLine={false} tickLine={false} tick={axisTick} />
                <Tooltip cursor={{ fill: 'rgba(67, 199, 171, 0.08)' }} content={<FinanceTrendTooltip />} />
                <Bar dataKey="revenue" fill="url(#financeRevenue)" radius={[10, 10, 0, 0]} barSize={isMobile ? 16 : 24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className={widgetCls.smallText}>利润、利润率和支出指标待后端接入真实成本数据后开放。</div>
        </SectionCard>

        <SectionCard title="营收构成" subtitle="按会员类型分类">
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
        title="最近交易"
        subtitle={`交易管理 · ${transactionCountLabel}`}
        extra={<Button type="text" onClick={handleViewAll}>{viewAllLabel}</Button>}
      >
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
            <ActionButton icon={<FilterOutlined />} ghost onClick={openFilterModal}>筛选</ActionButton>
            <ActionButton icon={<DownloadOutlined />} ghost onClick={handleExportVisibleTransactions}>导出</ActionButton>
            <ActionButton icon={<PlusOutlined />} onClick={openCreateModal}>新增交易</ActionButton>
          </div>
        </div>

        <div className={widgetCls.recordList}>
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
                <Button size="large" className={pageCls.cardActionHalf} icon={<EditOutlined />} onClick={() => openEditModal(item)}>编辑</Button>
                <Button size="large" className={pageCls.cardActionHalf} icon={<EyeOutlined />} onClick={() => setDetailTransaction(item)}>详情</Button>
              </div>
            </div>
          ))}
        </div>

        {visibleTransactions.length === 0 ? (
          <div className={`${pageCls.surface} ${widgetCls.detailCard} ${pageCls.surfaceTopSpace}`}>
            <div className={widgetCls.detailTitle}>暂无符合条件的交易记录</div>
            <div className={`${widgetCls.smallText} ${pageCls.topSpaceSm}`}>试试调整搜索词，或清空筛选后重新查看全部交易。</div>
            <div className={widgetCls.twoButtons}>
              <Button size="large" className={pageCls.cardActionHalf} onClick={() => setSearchValue('')}>清空搜索</Button>
              <Button type="primary" size="large" className={pageCls.cardActionHalf} onClick={resetFilters}>重置筛选</Button>
            </div>
          </div>
        ) : null}
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
              <Form.Item name="memberName" label="会员姓名">
                <Input className={pageCls.settingsInput} placeholder="例如：林若溪" disabled={!!editingTransaction} />
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
                <InputNumber className={pageCls.settingsInput} style={{ width: '100%' }} min={0} precision={2} />
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
        title="筛选交易"
        open={isFilterOpen}
        onCancel={() => setIsFilterOpen(false)}
        onOk={applyFilters}
        okText="应用筛选"
        cancelText="取消"
        destroyOnHidden
        footer={[
          <Button key="reset" onClick={resetFilters}>重置</Button>,
          <Button key="cancel" onClick={() => setIsFilterOpen(false)}>取消</Button>,
          <Button key="submit" type="primary" onClick={applyFilters}>应用筛选</Button>
        ]}
      >
        <div className={pageCls.filterModalBody}>
          <div>
            <div className={`${widgetCls.smallText} ${pageCls.filterFieldLabel}`}>交易状态</div>
            <Select
              value={filterDraft.status}
              className={pageCls.settingsInput}
              style={{ width: '100%' }}
              options={[{ label: '全部状态', value: '全部' }, ...transactionStatusOptions]}
              onChange={(value: string) => setFilterDraft((current) => ({ ...current, status: value }))}
            />
          </div>
          <div>
            <div className={`${widgetCls.smallText} ${pageCls.filterFieldLabel}`}>交易类型</div>
            <Select
              value={filterDraft.kind}
              className={pageCls.settingsInput}
              style={{ width: '100%' }}
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
            <Button icon={<EditOutlined />} onClick={() => openEditModal(detailTransaction)}>编辑</Button>
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

            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="会员姓名">{detailTransaction.member?.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="交易编号">{detailTransaction.transactionCode}</Descriptions.Item>
              <Descriptions.Item label="交易类型">{kindMap[detailTransaction.kind] || detailTransaction.kind}</Descriptions.Item>
              <Descriptions.Item label="交易状态">{statusMap[detailTransaction.status] || detailTransaction.status}</Descriptions.Item>
              <Descriptions.Item label="交易日期">{new Date(detailTransaction.happenedAt).toLocaleDateString('zh-CN')}</Descriptions.Item>
              <Descriptions.Item label="交易金额">{formatCurrency(detailTransaction.amountCents / 100)}</Descriptions.Item>
              <Descriptions.Item label="备注">{detailTransaction.notes || '-'}</Descriptions.Item>
            </Descriptions>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
