import {
  DeleteOutlined,
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
import { Button, Col, Descriptions, Drawer, Form, Input, Modal, Popconfirm, Row, Select, message } from 'antd';
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ActionButton from '@/components/ActionButton';
import { createChartTooltip } from '@/components/ChartTooltip';
import MemberAvatar from '@/components/MemberAvatar';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatCard from '@/components/StatCard';
import StatusTag from '@/components/StatusTag';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import { financeBar, financeStats, revenueStructure, transactions } from '@/mock';
import type { PaymentStatus } from '@/types';
import { formatCurrency, formatPercent } from '@/utils/format';
import { useIsMobile } from '@/utils/useResponsive';

const chartGrid = 'rgba(148, 163, 184, 0.14)';
const axisTick = { fill: '#6f8198', fontSize: 12, fontWeight: 600 };
const FinanceTrendTooltip = createChartTooltip({
  labelMap: {
    revenue: '营收',
    profit: '利润'
  },
  valueFormatter: (value) => (typeof value === 'number' ? formatCurrency(value * 1000) : value)
});

const FinanceStructureTooltip = createChartTooltip({
  labelMap: {
    value: '占比'
  },
  titleFormatter: (_, payload) => (typeof payload[0]?.name === 'string' ? payload[0].name : '营收构成'),
  valueFormatter: (value) => (typeof value === 'number' ? formatPercent(value) : value)
});

const iconMap = {
  wallet: <WalletOutlined />,
  pay: <WalletOutlined />,
  line: <LineChartOutlined />,
  pie: <PieChartOutlined />
};

type TransactionRow = (typeof transactions)[number] & { id: string };
type TransactionTone = TransactionRow['tone'];
type TransactionFormValues = Omit<TransactionRow, 'id'>;
type TransactionFilterDraft = {
  status: PaymentStatus | '全部';
  type: string;
};

const transactionStatusOptions: PaymentStatus[] = ['已完成', '处理中'];

const initialTransactions: TransactionRow[] = transactions.map((item, index) => ({
  ...item,
  id: `transaction-${index + 1}`
}));

const defaultTransactionFormValues: TransactionFormValues = {
  name: '',
  status: '处理中',
  type: transactions[0]?.type ?? '会员年卡续费',
  date: '2026-04-02',
  amount: '¥0',
  tone: 'mint'
};

const toneOptions: Array<{ label: string; value: TransactionTone }> = [
  { label: '薄荷绿', value: 'mint' },
  { label: '柔雾紫', value: 'violet' },
  { label: '暖日橙', value: 'orange' },
  { label: '轻粉色', value: 'pink' }
];

const createTransactionId = () => `transaction-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const CRUD_MODAL_WIDTH = 780;

export default function FinancePage() {
  const isMobile = useIsMobile();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<TransactionFormValues>();
  const [transactionList, setTransactionList] = useState<TransactionRow[]>(initialTransactions);
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | '全部'>('全部');
  const [typeFilter, setTypeFilter] = useState<string>('全部');
  const [filterDraft, setFilterDraft] = useState<TransactionFilterDraft>({ status: '全部', type: '全部' });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionRow | null>(null);
  const [detailTransaction, setDetailTransaction] = useState<TransactionRow | null>(null);
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  const transactionTypeOptions = useMemo(
    () => Array.from(new Set(transactionList.map((item) => item.type))),
    [transactionList]
  );

  const filteredTransactions = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase();

    return transactionList.filter((item) => {
      const matchesKeyword =
        keyword.length === 0 ||
        item.name.toLowerCase().includes(keyword) ||
        item.type.toLowerCase().includes(keyword) ||
        item.amount.toLowerCase().includes(keyword) ||
        item.date.toLowerCase().includes(keyword);
      const matchesStatus = statusFilter === '全部' || item.status === statusFilter;
      const matchesType = typeFilter === '全部' || item.type === typeFilter;

      return matchesKeyword && matchesStatus && matchesType;
    });
  }, [searchValue, statusFilter, transactionList, typeFilter]);

  const visibleTransactions = useMemo(() => {
    if (showAllTransactions || searchValue.trim().length > 0 || statusFilter !== '全部' || typeFilter !== '全部') {
      return filteredTransactions;
    }

    return filteredTransactions.slice(0, 4);
  }, [filteredTransactions, searchValue, showAllTransactions, statusFilter, typeFilter]);

  const exportTransactions = (rows: TransactionRow[], fileName: string, successMessage: string) => {
    if (rows.length === 0) {
      messageApi.warning('当前没有可导出的交易记录');
      return;
    }

    const csvRows = [
      ['会员姓名', '交易类型', '交易状态', '交易日期', '金额'],
      ...rows.map((item) => [item.name, item.type, item.status, item.date, item.amount])
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
    form.setFieldsValue(defaultTransactionFormValues);
    setIsFormOpen(true);
  };

  const openEditModal = (transaction: TransactionRow) => {
    setEditingTransaction(transaction);
    form.setFieldsValue({
      name: transaction.name,
      status: transaction.status,
      type: transaction.type,
      date: transaction.date,
      amount: transaction.amount,
      tone: transaction.tone
    });
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    setEditingTransaction(null);
    form.resetFields();
  };

  const handleSaveTransaction = async () => {
    const values = await form.validateFields();
    const nextTransaction: TransactionRow = editingTransaction
      ? { ...editingTransaction, ...values }
      : { id: createTransactionId(), ...values };

    setTransactionList((current) => {
      if (editingTransaction) {
        return current.map((item) => (item.id === editingTransaction.id ? nextTransaction : item));
      }

      return [nextTransaction, ...current];
    });

    if (detailTransaction?.id === nextTransaction.id) {
      setDetailTransaction(nextTransaction);
    }

    setShowAllTransactions(true);
    messageApi.success(editingTransaction ? '交易记录已更新' : '交易记录已创建');
    closeFormModal();
  };

  const handleDeleteTransaction = (transaction: TransactionRow) => {
    setTransactionList((current) => current.filter((item) => item.id !== transaction.id));

    if (detailTransaction?.id === transaction.id) {
      setDetailTransaction(null);
    }

    messageApi.success(`已删除交易记录 ${transaction.name}`);
  };

  const openFilterModal = () => {
    setFilterDraft({ status: statusFilter, type: typeFilter });
    setIsFilterOpen(true);
  };

  const applyFilters = () => {
    setStatusFilter(filterDraft.status);
    setTypeFilter(filterDraft.type);
    setShowAllTransactions(true);
    setIsFilterOpen(false);
  };

  const resetFilters = () => {
    const nextDraft: TransactionFilterDraft = { status: '全部', type: '全部' };

    setFilterDraft(nextDraft);
    setStatusFilter(nextDraft.status);
    setTypeFilter(nextDraft.type);
    setSearchValue('');
    setShowAllTransactions(false);
    setIsFilterOpen(false);
  };

  const handleViewAll = () => {
    const hasActiveQuery = searchValue.trim().length > 0 || statusFilter !== '全部' || typeFilter !== '全部';

    if (hasActiveQuery) {
      resetFilters();
      messageApi.success('已恢复查看全部最近交易');
      return;
    }

    setShowAllTransactions((current) => !current);
  };

  const transactionCountLabel = `${filteredTransactions.length} 条记录`;
  const viewAllLabel = searchValue.trim().length > 0 || statusFilter !== '全部' || typeFilter !== '全部'
    ? '查看全部'
    : showAllTransactions
      ? '收起列表'
      : '查看全部';

  return (
    <div className={pageCls.page}>
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
        <SectionCard title="营收趋势" subtitle="过去 7 个月营收与利润对比">
          <div className={pageCls.chartPanelTallOffset}>
            <ResponsiveContainer>
              <BarChart data={financeBar} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="financeRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#43c7ab" stopOpacity={0.96} />
                    <stop offset="100%" stopColor="#6be0c8" stopOpacity={0.78} />
                  </linearGradient>
                  <linearGradient id="financeProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b7cff" stopOpacity={0.96} />
                    <stop offset="100%" stopColor="#b2a8ff" stopOpacity={0.76} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={chartGrid} strokeDasharray="3 5" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} interval={isMobile ? 1 : 0} tick={axisTick} />
                <YAxis axisLine={false} tickLine={false} tick={axisTick} />
                <Tooltip cursor={{ fill: 'rgba(139, 124, 255, 0.08)' }} content={<FinanceTrendTooltip />} />
                <Bar dataKey="revenue" fill="url(#financeRevenue)" radius={[10, 10, 0, 0]} barSize={isMobile ? 18 : 30} />
                <Bar dataKey="profit" fill="url(#financeProfit)" radius={[10, 10, 0, 0]} barSize={isMobile ? 18 : 30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="营收构成" subtitle="按会员类型分类">
          <div className={pageCls.chartPanelTall}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={revenueStructure} dataKey="value" nameKey="name" innerRadius={isMobile ? 52 : 74} outerRadius={isMobile ? 82 : 108} paddingAngle={3} stroke="rgba(255,255,255,0.9)">
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
              <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 999, background: item.fill, display: 'inline-block' }} />
                  <span>{item.name}</span>
                </div>
                <strong>{item.value}%</strong>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="最近交易"
        subtitle={`本地交易管理 · ${transactionCountLabel}`}
        extra={<Button type="text" onClick={handleViewAll}>{viewAllLabel}</Button>}
      >
        <div className={pageCls.toolbar} style={{ marginBottom: 16 }}>
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
                <MemberAvatar name={item.name} tone={item.tone} />
                <div className={pageCls.memberRecordHead}>
                  <div className={pageCls.memberRecordNameRow}>
                    <span className={pageCls.membersName}>{item.name}</span>
                    <StatusTag status={item.status} />
                  </div>
                  <div className={widgetCls.recordSub}>{item.type}</div>
                  <div className={pageCls.membersSubtext}>{item.date}</div>
                </div>
              </div>

              <div className={pageCls.memberRecordGrid}>
                <div className={pageCls.memberRecordField}>
                  <div className={pageCls.memberRecordLabel}>交易金额</div>
                  <div className={pageCls.memberRecordValue}>{item.amount}</div>
                </div>
                <div className={pageCls.memberRecordField}>
                  <div className={pageCls.memberRecordLabel}>交易状态</div>
                  <div className={pageCls.memberRecordValue} style={{ fontSize: 'var(--font-size-xl)' }}>{item.status}</div>
                </div>
                <div className={pageCls.memberRecordField}>
                  <div className={pageCls.memberRecordLabel}>交易日期</div>
                  <div className={pageCls.memberRecordValue} style={{ fontSize: 'var(--font-size-xl)' }}>{item.date}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <Button size="large" className={pageCls.cardActionHalf} icon={<EditOutlined />} onClick={() => openEditModal(item)}>编辑</Button>
                <Button size="large" className={pageCls.cardActionHalf} icon={<EyeOutlined />} onClick={() => setDetailTransaction(item)}>详情</Button>
              </div>
            </div>
          ))}
        </div>

        {visibleTransactions.length === 0 ? (
          <div className={`${pageCls.surface} ${widgetCls.detailCard}`} style={{ marginTop: 16 }}>
            <div className={widgetCls.detailTitle}>暂无符合条件的交易记录</div>
            <div className={widgetCls.smallText} style={{ marginTop: 8 }}>试试调整搜索词，或清空筛选后重新查看全部交易。</div>
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
              <Form.Item name="name" label="会员姓名" rules={[{ required: true, message: '请输入会员姓名' }]}>
                <Input className={pageCls.settingsInput} placeholder="例如：林若溪" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="type" label="交易类型" rules={[{ required: true, message: '请输入交易类型' }]}>
                <Input className={pageCls.settingsInput} placeholder="例如：会员年卡续费" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="status" label="交易状态" rules={[{ required: true, message: '请选择交易状态' }]}>
                <Select
                  className={pageCls.settingsInput}
                  options={transactionStatusOptions.map((item) => ({ label: item, value: item }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="date" label="交易日期" rules={[{ required: true, message: '请输入交易日期' }]}>
                <Input className={pageCls.settingsInput} placeholder="格式：YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="amount" label="交易金额" rules={[{ required: true, message: '请输入交易金额' }, { pattern: /^¥\d[\d,]*(\.\d{1,2})?$/, message: '请使用金额格式，例如：¥12,800' }]}>
                <Input className={pageCls.settingsInput} placeholder="例如：¥12,800" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="tone" label="头像色系" rules={[{ required: true, message: '请选择头像色系' }]}>
                <Select className={pageCls.settingsInput} options={toneOptions} />
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
        <div style={{ display: 'grid', gap: 16, marginTop: 20 }}>
          <div>
            <div className={widgetCls.smallText} style={{ marginBottom: 8 }}>交易状态</div>
            <Select
              value={filterDraft.status}
              className={pageCls.settingsInput}
              style={{ width: '100%' }}
              options={[{ label: '全部状态', value: '全部' }, ...transactionStatusOptions.map((item) => ({ label: item, value: item }))]}
              onChange={(value: PaymentStatus | '全部') => setFilterDraft((current) => ({ ...current, status: value }))}
            />
          </div>
          <div>
            <div className={widgetCls.smallText} style={{ marginBottom: 8 }}>交易类型</div>
            <Select
              value={filterDraft.type}
              className={pageCls.settingsInput}
              style={{ width: '100%' }}
              options={[{ label: '全部类型', value: '全部' }, ...transactionTypeOptions.map((item) => ({ label: item, value: item }))]}
              onChange={(value: string) => setFilterDraft((current) => ({ ...current, type: value }))}
            />
          </div>
        </div>
      </Modal>

      <Drawer
        open={detailTransaction !== null}
        width={440}
        title={detailTransaction?.name ?? '交易详情'}
        onClose={() => setDetailTransaction(null)}
        extra={detailTransaction ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button icon={<EditOutlined />} onClick={() => openEditModal(detailTransaction)}>编辑</Button>
            <Popconfirm title="确认删除该交易记录吗？" okText="删除" cancelText="取消" onConfirm={() => handleDeleteTransaction(detailTransaction)}>
              <Button danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          </div>
        ) : null}
      >
        {detailTransaction ? (
          <div style={{ display: 'grid', gap: 16 }}>
            <div className={widgetCls.detailOverviewPanel}>
              <div className={widgetCls.recordMeta}>
                <MemberAvatar name={detailTransaction.name} tone={detailTransaction.tone} />
                <div>
                  <div className={widgetCls.recordTitle} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {detailTransaction.name}
                    <StatusTag status={detailTransaction.status} />
                  </div>
                  <div className={widgetCls.recordSub}>{detailTransaction.type}</div>
                  <div className={widgetCls.recordSub}>{detailTransaction.date}</div>
                </div>
              </div>
              <div className={widgetCls.detailOverviewStatGrid}>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatMint}`}>
                  <div className={widgetCls.detailInsightLabel}>交易金额</div>
                  <div className={widgetCls.detailOverviewStatValue}>{detailTransaction.amount}</div>
                </div>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatViolet}`}>
                  <div className={widgetCls.detailInsightLabel}>交易状态</div>
                  <div className={widgetCls.detailOverviewStatValue} style={{ fontSize: 'var(--font-size-xl)' }}>{detailTransaction.status}</div>
                </div>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatOrange}`}>
                  <div className={widgetCls.detailInsightLabel}>交易日期</div>
                  <div className={widgetCls.detailOverviewStatValue} style={{ fontSize: 'var(--font-size-xl)' }}>{detailTransaction.date}</div>
                </div>
              </div>
            </div>

            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="会员姓名">{detailTransaction.name}</Descriptions.Item>
              <Descriptions.Item label="交易类型">{detailTransaction.type}</Descriptions.Item>
              <Descriptions.Item label="交易状态">{detailTransaction.status}</Descriptions.Item>
              <Descriptions.Item label="交易日期">{detailTransaction.date}</Descriptions.Item>
              <Descriptions.Item label="交易金额">{detailTransaction.amount}</Descriptions.Item>
            </Descriptions>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
