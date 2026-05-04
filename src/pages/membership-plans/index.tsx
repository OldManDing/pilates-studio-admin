import {
  AppstoreOutlined,
  DeleteOutlined,
  EditOutlined,
  FilterOutlined,
  PlusOutlined,
  SearchOutlined,
  TagOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import {
  Button,
  Col,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Pagination,
  Popconfirm,
  Row,
  Select,
  Spin,
  Switch,
  message,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ActionButton from '@/components/ActionButton';
import EmptyState from '@/components/EmptyState';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatCard from '@/components/StatCard';
import StatusTag from '@/components/StatusTag';
import { authApi } from '@/services/auth';
import { CRUD_MODAL_WIDTH, NARROW_DETAIL_DRAWER_WIDTH } from '@/styles/dimensions';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import styles from './index.module.css';
import {
  memberStatusLabels,
  type MemberStatus,
  type MembershipPlanCategory,
} from '@/types';
import {
  membershipPlansApi,
  type CreatePlanData,
  type MembershipPlan,
  type UpdatePlanData,
} from '@/services/membershipPlans';
import { getErrorMessage } from '@/utils/errors';
import { hasRequiredPermissions } from '@/utils/menu';

const { TextArea } = Input;

const iconMap = {
  plans: <AppstoreOutlined />,
  active: <TagOutlined />,
  revenue: <WalletOutlined />,
  mix: <FilterOutlined />,
};

type PlanFormValues = {
  code: string;
  name: string;
  description?: string;
  category: MembershipPlanCategory;
  totalCredits?: number;
  durationDays?: number;
  priceYuan: number;
  isActive: boolean;
};

type RelatedMemberSummary = {
  id: string;
  name: string;
  phone: string;
  status: MemberStatus;
};

type MembershipPlanDetail = MembershipPlan & {
  members?: RelatedMemberSummary[];
};

type StatusFilterValue = '全部' | '启用中' | '已停用';

const categoryOptions: MembershipPlanCategory[] = ['TIME_CARD', 'PERIOD_CARD', 'PRIVATE_PACKAGE'];

const categoryLabels: Record<MembershipPlanCategory, string> = {
  TIME_CARD: '次卡',
  PERIOD_CARD: '期限卡',
  PRIVATE_PACKAGE: '私教包',
};

const categoryHints: Record<MembershipPlanCategory, string> = {
  TIME_CARD: '适合按节次消耗的常规会员方案。',
  PERIOD_CARD: '适合按有效期使用的月卡、季卡或年卡。',
  PRIVATE_PACKAGE: '适合私教或定制课程的专属课包。',
};

const formatCurrency = (amountCents: number) => `¥${(amountCents / 100).toLocaleString('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

const formatNullableNumber = (value?: number) => (typeof value === 'number' ? String(value) : '-');

const getStatusLabel = (isActive: boolean) => (isActive ? '启用中' : '已停用');

const getCategoryMetricLabel = (plan: MembershipPlan) => {
  if (plan.category === 'PERIOD_CARD') {
    return plan.durationDays ? `${plan.durationDays} 天有效期` : '未设置有效期';
  }

  return typeof plan.totalCredits === 'number' ? `${plan.totalCredits} 节课时` : '未设置课时';
};

const getPlanUsageSummary = (plan: MembershipPlanDetail | MembershipPlan) => {
  if (!('members' in plan) || !plan.members?.length) {
    return '当前暂无关联会员';
  }

  const activeCount = plan.members.filter((member) => member.status === 'ACTIVE').length;
  return `共关联 ${plan.members.length} 位会员，其中 ${activeCount} 位正常使用中`;
};

export default function MembershipPlansPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<PlanFormValues>();
  const categoryValue = Form.useWatch('category', form);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<MembershipPlanCategory | '全部'>('全部');
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('全部');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [detailPlanId, setDetailPlanId] = useState<string | null>(null);
  const [detailPlan, setDetailPlan] = useState<MembershipPlanDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErrorMessage, setDetailErrorMessage] = useState('');
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(8);
  const [currentUserPermissions, setCurrentUserPermissions] = useState<string[]>([]);
  const [currentUserRoleCode, setCurrentUserRoleCode] = useState('');
  const canManagePlans = currentUserRoleCode === 'OWNER' || hasRequiredPermissions(currentUserPermissions, ['MANAGE:PLANS']);

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

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const data = await membershipPlansApi.getAll();
      setPlans(data);
    } catch (err) {
      const nextMessage = getErrorMessage(err, '加载会员方案失败');
      setErrorMessage(nextMessage);
      messageApi.error(nextMessage);
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    void fetchPlans();
  }, [fetchPlans]);

  const fetchDetailPlan = useCallback(async (planId: string) => {
    setDetailLoading(true);
    setDetailErrorMessage('');

    try {
      const detail = await membershipPlansApi.getById(planId) as MembershipPlanDetail;
      setDetailPlan(detail);
      return detail;
    } catch (err) {
      const nextMessage = getErrorMessage(err, '加载方案详情失败');
      setDetailPlan(null);
      setDetailErrorMessage(nextMessage);
      throw new Error(nextMessage);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!detailPlanId) {
      setDetailPlan(null);
      setDetailLoading(false);
      setDetailErrorMessage('');
      return;
    }

    let cancelled = false;

    const fetchDetail = async () => {
      try {
        setDetailLoading(true);
        setDetailErrorMessage('');
        const detail = await membershipPlansApi.getById(detailPlanId) as MembershipPlanDetail;

        if (!cancelled) {
          setDetailPlan(detail);
        }
      } catch (err) {
        if (!cancelled) {
          const nextMessage = getErrorMessage(err, '加载方案详情失败');
          messageApi.error(nextMessage);
          setDetailPlan(null);
          setDetailErrorMessage(nextMessage);
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    };

    void fetchDetail();

    return () => {
      cancelled = true;
    };
  }, [detailPlanId, messageApi]);

  const stats = useMemo(() => {
    const activePlans = plans.filter((plan) => plan.isActive).length;
    const totalRevenue = plans.reduce((sum, plan) => sum + plan.priceCents, 0);
    const categoryMix = categoryOptions
      .map((category) => plans.filter((plan) => plan.category === category).length)
      .filter((count) => count > 0)
      .length;

    const mostCommonCategory = categoryOptions.reduce((currentBest, category) => {
      const count = plans.filter((plan) => plan.category === category).length;

      if (!currentBest || count > currentBest.count) {
        return { category, count };
      }

      return currentBest;
    }, null as { category: MembershipPlanCategory; count: number } | null);

    return [
      {
        title: '方案总数',
        value: String(plans.length),
        hint: '当前可维护的会籍方案池',
        tone: 'mint' as const,
        icon: 'plans' as const,
      },
      {
        title: '启用方案',
        value: String(activePlans),
        hint: `${plans.length ? ((activePlans / plans.length) * 100).toFixed(1) : '0.0'}% 仍在对外使用`,
        tone: 'violet' as const,
        icon: 'active' as const,
      },
      {
        title: '标价总额',
        value: formatCurrency(totalRevenue),
        hint: '按当前所有方案标价汇总',
        tone: 'orange' as const,
        icon: 'revenue' as const,
      },
      {
        title: '分类覆盖',
        value: `${categoryMix}/3`,
        hint: mostCommonCategory ? `当前以${categoryLabels[mostCommonCategory.category]}为主` : '尚未建立分类结构',
        tone: 'pink' as const,
        icon: 'mix' as const,
      },
    ];
  }, [plans]);

  const filteredPlans = useMemo(() => {
    const normalizedKeyword = searchValue.trim().toLowerCase();

    return plans.filter((plan) => {
      const matchesKeyword = normalizedKeyword.length === 0
        || plan.code.toLowerCase().includes(normalizedKeyword)
        || plan.name.toLowerCase().includes(normalizedKeyword)
        || (plan.description || '').toLowerCase().includes(normalizedKeyword);

      const matchesCategory = categoryFilter === '全部' || plan.category === categoryFilter;
      const matchesStatus = statusFilter === '全部'
        || (statusFilter === '启用中' && plan.isActive)
        || (statusFilter === '已停用' && !plan.isActive);

      return matchesKeyword && matchesCategory && matchesStatus;
    });
  }, [categoryFilter, plans, searchValue, statusFilter]);

  const pagedPlans = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredPlans.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredPlans, pageSize]);

  const filterLabels = [
    searchValue.trim() ? `关键词“${searchValue.trim()}”` : null,
    categoryFilter !== '全部' ? `分类：${categoryLabels[categoryFilter]}` : null,
    statusFilter !== '全部' ? `状态：${statusFilter}` : null,
  ].filter(Boolean);

  const listSummary = filterLabels.length
    ? `已按${filterLabels.join('、')}筛选。`
    : '查看方案结构、价格与使用状态，并可进一步进入详情维护。';

  const openCreateModal = () => {
    if (!canManagePlans) {
      messageApi.warning('当前账号没有会员方案管理权限');
      return;
    }

    setEditingPlan(null);
    form.setFieldsValue({
      code: '',
      name: '',
      description: '',
      category: 'TIME_CARD',
      totalCredits: 12,
      durationDays: undefined,
      priceYuan: 0,
      isActive: true,
    });
    setIsFormOpen(true);
  };

  const openEditModal = (plan: MembershipPlan) => {
    if (!canManagePlans) {
      messageApi.warning('当前账号没有会员方案管理权限');
      return;
    }

    setEditingPlan(plan);
    form.setFieldsValue({
      code: plan.code,
      name: plan.name,
      description: plan.description || '',
      category: plan.category,
      totalCredits: plan.totalCredits,
      durationDays: plan.durationDays,
      priceYuan: Number((plan.priceCents / 100).toFixed(2)),
      isActive: plan.isActive,
    });
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    setIsFormOpen(false);
    setEditingPlan(null);
    form.resetFields();
  };

  const buildCreatePayload = (values: PlanFormValues): CreatePlanData => ({
    code: values.code.trim(),
    name: values.name.trim(),
    description: values.description?.trim() || undefined,
    category: values.category,
    totalCredits: typeof values.totalCredits === 'number' ? values.totalCredits : undefined,
    durationDays: typeof values.durationDays === 'number' ? values.durationDays : undefined,
    priceCents: Math.round(values.priceYuan * 100),
  });

  const buildUpdatePayload = (values: PlanFormValues): UpdatePlanData => ({
    ...buildCreatePayload(values),
    isActive: values.isActive,
  });

  const refreshDataAfterSave = async (focusedPlanId?: string | null) => {
    await fetchPlans();

    if (focusedPlanId) {
      setDetailPlanId(focusedPlanId);

      try {
        await fetchDetailPlan(focusedPlanId);
      } catch (err) {
        messageApi.warning(getErrorMessage(err, '方案已保存，但刷新详情失败，请稍后重试'));
      }
    }
  };

  const handleSavePlan = async () => {
    if (!canManagePlans) {
      messageApi.warning('当前账号没有会员方案管理权限');
      return;
    }

    try {
      setIsSaving(true);
      const values = await form.validateFields();

      if (editingPlan) {
        await membershipPlansApi.update(editingPlan.id, buildUpdatePayload(values));
        await refreshDataAfterSave(editingPlan.id === detailPlanId ? editingPlan.id : null);
        messageApi.success('会员方案已更新');
      } else {
        const createdPlan = await membershipPlansApi.create(buildCreatePayload(values));

        if (!values.isActive) {
          await membershipPlansApi.update(createdPlan.id, { isActive: false });
        }

        await refreshDataAfterSave(createdPlan.id === detailPlanId ? createdPlan.id : null);
        messageApi.success('会员方案已创建');
      }

      closeFormModal();
    } catch (err) {
      messageApi.error(getErrorMessage(err, '保存失败'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePlan = async (plan: MembershipPlan) => {
    if (!canManagePlans) {
      messageApi.warning('当前账号没有会员方案管理权限');
      return;
    }

    try {
      setDeletingPlanId(plan.id);
      await membershipPlansApi.delete(plan.id);
      await fetchPlans();

      if (detailPlanId === plan.id) {
        setDetailPlanId(null);
        setDetailPlan(null);
      }

      messageApi.success(`已删除方案 ${plan.name}`);
    } catch (err) {
      messageApi.error(getErrorMessage(err, '删除失败'));
    } finally {
      setDeletingPlanId(null);
    }
  };

  if (loading && plans.length === 0) {
    return (
      <div className={`${pageCls.page} ${pageCls.workPage}`}>
        {contextHolder}
        <PageHeader
          title="会员方案管理"
          extra={canManagePlans ? <ActionButton icon={<PlusOutlined />} onClick={openCreateModal}>新增方案</ActionButton> : null}
        />
        <div className={`${pageCls.centeredState} ${pageCls.centeredStateTall}`}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (!loading && errorMessage && plans.length === 0) {
    return (
      <div className={`${pageCls.page} ${pageCls.workPage}`}>
        {contextHolder}
        <PageHeader
          title="会员方案管理"
          extra={canManagePlans ? <ActionButton icon={<PlusOutlined />} onClick={openCreateModal}>新增方案</ActionButton> : null}
        />
        <SectionCard title="会员方案列表">
          <div className={pageCls.sectionEmptyState}>
            <EmptyState
              title="加载会员方案失败"
              description={errorMessage}
              actionText="重新加载"
              onAction={() => {
                void fetchPlans();
              }}
            />
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className={`${pageCls.page} ${pageCls.workPage}`}>
      {contextHolder}
      <PageHeader
        title="会员方案管理"
        extra={canManagePlans ? <ActionButton icon={<PlusOutlined />} onClick={openCreateModal}>新增方案</ActionButton> : null}
      />

      <div className={pageCls.heroGrid}>
        {stats.map((item) => (
          <StatCard key={item.title} {...item} icon={iconMap[item.icon]} />
        ))}
      </div>

      <SectionCard title="会员方案列表">
        <Spin spinning={loading}>
          <div className={pageCls.sectionContentStack}>
            <div className={pageCls.sectionSummaryRow}>
              <div className={pageCls.sectionSummaryText}>{listSummary}</div>
              <span className={pageCls.sectionMetaPill}>当前共 {filteredPlans.length} 个方案</span>
            </div>

            <div className={pageCls.toolbar}>
              <div className={pageCls.toolbarLeft}>
                <Input
                  className={pageCls.toolbarSearch}
                  size="large"
                  value={searchValue}
                  prefix={<SearchOutlined />}
                  placeholder="按方案名称、编码或描述搜索"
                  onChange={(event) => {
                    setSearchValue(event.target.value);
                    setCurrentPage(1);
                  }}
                />
                <Select
                  size="large"
                  value={categoryFilter}
                  className={`${pageCls.toolbarSelect} ${pageCls.toolbarSelectWide}`}
                  options={[
                    { label: '全部分类', value: '全部' },
                    ...categoryOptions.map((item) => ({ label: categoryLabels[item], value: item })),
                  ]}
                  onChange={(value: MembershipPlanCategory | '全部') => {
                    setCategoryFilter(value);
                    setCurrentPage(1);
                  }}
                />
                <Select
                  size="large"
                  value={statusFilter}
                  className={pageCls.toolbarSelect}
                  options={[
                    { label: '全部状态', value: '全部' },
                    { label: '启用中', value: '启用中' },
                    { label: '已停用', value: '已停用' },
                  ]}
                  onChange={(value: StatusFilterValue) => {
                    setStatusFilter(value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <div className={pageCls.toolbarRight}>
                <ActionButton
                  ghost
                  icon={<FilterOutlined />}
                  onClick={() => {
                    setSearchValue('');
                    setCategoryFilter('全部');
                    setStatusFilter('全部');
                    setCurrentPage(1);
                  }}
                >
                  清空筛选
                </ActionButton>
              </div>
            </div>

            {errorMessage && plans.length > 0 ? (
              <div className={pageCls.sectionSummaryText}>最近一次刷新失败：{errorMessage}</div>
            ) : null}

            {filteredPlans.length ? (
              <>
                <div className={`${widgetCls.recordList} ${pageCls.sectionListStack}`}>
                  {pagedPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`${widgetCls.recordItem} ${widgetCls.workRecordItem} ${pageCls.surface} ${styles.planRecordCard}`}
                    >
                      <div className={styles.planRecordMain}>
                        <div className={widgetCls.recordMeta}>
                          <div className={styles.planRecordIcon} aria-hidden>
                            {categoryLabels[plan.category].slice(0, 1)}
                          </div>
                          <div className={pageCls.memberRecordHead}>
                            <div className={`${widgetCls.recordTitle} ${pageCls.recordTitleRow}`}>
                              <span className={pageCls.membersName}>{plan.name}</span>
                              <StatusTag status={getStatusLabel(plan.isActive)} />
                              <span className={widgetCls.chip}>{plan.code}</span>
                            </div>
                            <div className={widgetCls.recordSub}>{plan.description || categoryHints[plan.category]}</div>
                          </div>
                        </div>

                        <div className={`${pageCls.recordBriefGrid} ${pageCls.recordBriefGridTwo} ${styles.planRecordBriefGrid}`}>
                          <div className={pageCls.recordBriefField}>
                            <div className={pageCls.recordBriefLabel}>分类</div>
                            <div className={pageCls.recordBriefValue}>{categoryLabels[plan.category]}</div>
                          </div>
                          <div className={pageCls.recordBriefField}>
                            <div className={pageCls.recordBriefLabel}>标价</div>
                            <div className={pageCls.recordBriefValue}>{formatCurrency(plan.priceCents)}</div>
                          </div>
                        </div>
                      </div>

                      <div className={`${widgetCls.detailActionGroup} ${styles.planRecordActions}`}>
                        <Button type="primary" size="large" className={pageCls.cardActionHalf} onClick={() => setDetailPlanId(plan.id)}>
                          查看详情
                        </Button>
                        {canManagePlans ? (
                          <Button size="large" className={pageCls.cardActionHalf} icon={<EditOutlined />} onClick={() => openEditModal(plan)}>
                            编辑
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>

                <div className={pageCls.sectionPagination}>
                  <Pagination
                    current={currentPage}
                    pageSize={pageSize}
                    total={filteredPlans.length}
                    onChange={setCurrentPage}
                    showSizeChanger={false}
                  />
                </div>
              </>
            ) : (
              <div className={pageCls.sectionEmptyState}>
                <EmptyState
                  title="暂无符合条件的会员方案"
                  description={canManagePlans ? '调整搜索词或筛选条件后再试，也可以直接新增一个方案。' : '调整搜索词或筛选条件后再试。'}
                  actionText={canManagePlans ? '新增方案' : undefined}
                  onAction={canManagePlans ? openCreateModal : undefined}
                />
              </div>
            )}
          </div>
        </Spin>
      </SectionCard>

      <Modal
        className={pageCls.crudModal}
        title={editingPlan ? '编辑会员方案' : '新增会员方案'}
        open={isFormOpen}
        width={CRUD_MODAL_WIDTH}
        onCancel={closeFormModal}
        onOk={handleSavePlan}
        confirmLoading={isSaving}
        okText={editingPlan ? '保存修改' : '创建方案'}
        cancelText="取消"
        zIndex={1600}
        forceRender
        destroyOnHidden
      >
        <Form form={form} className={pageCls.crudModalForm} layout="vertical">
          <Row gutter={18}>
            <Col xs={24} md={12}>
              <Form.Item
                name="code"
                label="方案编码"
                rules={[
                  { required: true, message: '请输入方案编码' },
                  { whitespace: true, message: '方案编码不能为空白字符' },
                ]}
              >
                <Input className={pageCls.settingsInput} placeholder="例如 YEAR-365 或 PT-24" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label="方案名称"
                rules={[
                  { required: true, message: '请输入方案名称' },
                  { whitespace: true, message: '方案名称不能为空白字符' },
                ]}
              >
                <Input className={pageCls.settingsInput} placeholder="请输入用于展示的方案名称" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="category"
                label="方案分类"
                rules={[{ required: true, message: '请选择方案分类' }]}
                extra={categoryValue ? categoryHints[categoryValue] : undefined}
              >
                <Select
                  className={pageCls.settingsInput}
                  options={categoryOptions.map((item) => ({ label: categoryLabels[item], value: item }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="priceYuan"
                label="售价（元）"
                rules={[{ required: true, message: '请输入价格' }]}
                extra="按门店实际售价填写，提交时会自动换算为后端所需的分。"
              >
                <InputNumber
                  className={`${pageCls.settingsInput} ${pageCls.fullWidthControl}`}
                  min={0}
                  precision={2}
                  placeholder="例如 1999 或 1999.00"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="totalCredits"
                label="总课时"
                extra={categoryValue === 'PERIOD_CARD' ? '期限卡通常不依赖课时，可留空。' : '次卡和私教包需要填写大于 0 的课时数量。'}
                rules={[
                  {
                    validator: async (_, value) => {
                      if ((categoryValue === 'TIME_CARD' || categoryValue === 'PRIVATE_PACKAGE') && !(value > 0)) {
                        throw new Error('当前分类需要填写大于 0 的总课时');
                      }
                    },
                  },
                ]}
              >
                <InputNumber
                  className={`${pageCls.settingsInput} ${pageCls.fullWidthControl}`}
                  min={0}
                  precision={0}
                  placeholder={categoryValue === 'PERIOD_CARD' ? '期限卡通常可留空' : '请输入包含的课时数量'}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="durationDays"
                label="有效期（天）"
                extra={categoryValue === 'PERIOD_CARD' ? '期限卡必须填写有效天数。' : '非期限卡通常无需填写；如有运营需要可保留为空。'}
                rules={[
                  {
                    validator: async (_, value) => {
                      if (categoryValue === 'PERIOD_CARD' && !(value > 0)) {
                        throw new Error('期限卡需要填写大于 0 的有效期天数');
                      }
                    },
                  },
                ]}
              >
                <InputNumber
                  className={`${pageCls.settingsInput} ${pageCls.fullWidthControl}`}
                  min={0}
                  precision={0}
                  placeholder={categoryValue === 'PERIOD_CARD' ? '例如 30 / 90 / 365' : '按需填写，可留空'}
                />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="description" label="方案描述">
                <TextArea className={pageCls.settingsInput} rows={4} placeholder="补充适用人群、权益说明或运营备注" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="isActive" label="启用状态" valuePropName="checked">
                <Switch checkedChildren="启用中" unCheckedChildren="已停用" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Drawer
        rootClassName={pageCls.responsiveDetailDrawer}
        open={detailPlanId !== null}
        width={NARROW_DETAIL_DRAWER_WIDTH}
        title={detailPlan?.name ?? '会员方案详情'}
        onClose={() => setDetailPlanId(null)}
        extra={detailPlan ? (
          <div className={pageCls.drawerActionGroup}>
            {canManagePlans ? <Button icon={<EditOutlined />} onClick={() => openEditModal(detailPlan)}>编辑</Button> : null}
            {canManagePlans ? (
              <Popconfirm
                title="确认删除该会员方案吗？"
                okText="删除"
                cancelText="取消"
                okButtonProps={{
                  danger: true,
                  loading: deletingPlanId === detailPlan.id,
                  disabled: deletingPlanId !== null && deletingPlanId !== detailPlan.id,
                }}
                onConfirm={() => handleDeletePlan(detailPlan)}
              >
                <Button
                  className={pageCls.cardActionWarning}
                  icon={<DeleteOutlined />}
                  loading={deletingPlanId === detailPlan.id}
                  disabled={deletingPlanId !== null && deletingPlanId !== detailPlan.id}
                >
                  删除
                </Button>
              </Popconfirm>
            ) : null}
          </div>
        ) : null}
      >
        {detailLoading ? (
          <div className={pageCls.centeredStatePadded}><Spin /></div>
        ) : detailErrorMessage ? (
          <EmptyState
            title="加载方案详情失败"
            description={detailErrorMessage}
            actionText="重试"
            onAction={() => {
              if (detailPlanId) {
                void fetchDetailPlan(detailPlanId).catch((err) => {
                  messageApi.error(getErrorMessage(err, '加载方案详情失败'));
                });
              }
            }}
            size="compact"
          />
        ) : detailPlan ? (
          <div className={pageCls.detailContentStack}>
            <SectionCard title="方案概览" subtitle={getPlanUsageSummary(detailPlan)}>
              <div className={widgetCls.detailOverviewPanel}>
                <div className={`${widgetCls.recordTitle} ${pageCls.recordTitleRow}`}>
                  {detailPlan.name}
                  <StatusTag status={getStatusLabel(detailPlan.isActive)} />
                  <span className={widgetCls.chip}>{detailPlan.code}</span>
                </div>
                <div className={widgetCls.detailOverviewText}>{detailPlan.description || '暂无额外说明'}</div>
                <div className={`${widgetCls.detailOverviewStatGrid} ${styles.planDetailStatGrid}`}>
                  <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatMint}`}>
                    <div className={widgetCls.detailInsightLabel}>分类</div>
                    <div className={`${widgetCls.detailOverviewStatValue} ${widgetCls.detailOverviewStatValueLarge}`}>{categoryLabels[detailPlan.category]}</div>
                  </div>
                  <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatViolet}`}>
                    <div className={widgetCls.detailInsightLabel}>标价</div>
                    <div className={`${widgetCls.detailOverviewStatValue} ${widgetCls.detailOverviewStatValueLarge}`}>{formatCurrency(detailPlan.priceCents)}</div>
                  </div>
                  <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatOrange}`}>
                    <div className={widgetCls.detailInsightLabel}>核心权益</div>
                    <div className={`${widgetCls.detailOverviewStatValue} ${widgetCls.detailOverviewStatValueLarge}`}>{getCategoryMetricLabel(detailPlan)}</div>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="基础信息" subtitle="直接映射后端字段，便于管理员核对展示与配置值。">
              <Descriptions column={1} size="small" bordered className={pageCls.detailDescriptions}>
                <Descriptions.Item label="方案编码">{detailPlan.code}</Descriptions.Item>
                <Descriptions.Item label="方案名称">{detailPlan.name}</Descriptions.Item>
                <Descriptions.Item label="方案描述">{detailPlan.description || '-'}</Descriptions.Item>
                <Descriptions.Item label="总课时">{formatNullableNumber(detailPlan.totalCredits)}</Descriptions.Item>
                <Descriptions.Item label="有效期">{typeof detailPlan.durationDays === 'number' ? `${detailPlan.durationDays} 天` : '-'}</Descriptions.Item>
                <Descriptions.Item label="启用状态">{getStatusLabel(detailPlan.isActive)}</Descriptions.Item>
              </Descriptions>
            </SectionCard>

            <SectionCard title="关联会员摘要" subtitle="当详情接口返回关联会员时，便于快速判断该方案是否仍在使用中。">
              {detailPlan.members?.length ? (
                <div className={`${widgetCls.recordList} ${pageCls.sectionListStack}`}>
                  <div className={pageCls.sectionSummaryRow}>
                    <div className={pageCls.sectionSummaryText}>{getPlanUsageSummary(detailPlan)}</div>
                    <span className={pageCls.sectionMetaPill}>会员 {detailPlan.members.length} 位</span>
                  </div>
                  {detailPlan.members.slice(0, 5).map((member) => (
                    <div key={member.id} className={`${widgetCls.recordItem} ${widgetCls.workRecordItem}`}>
                      <div className={widgetCls.recordMeta}>
                        <div>
                          <div className={`${widgetCls.recordTitle} ${pageCls.recordTitleRow}`}>
                            {member.name}
                            <StatusTag status={memberStatusLabels[member.status] || member.status} />
                          </div>
                          <div className={widgetCls.recordSub}>{member.phone}</div>
                        </div>
                      </div>
                      <span className={widgetCls.chipPrimary}>已关联</span>
                    </div>
                  ))}
                  {detailPlan.members.length > 5 ? (
                    <div className={pageCls.sectionSummaryText}>仅展示前 5 位关联会员，其余请通过会员管理页查看完整档案。</div>
                  ) : null}
                </div>
              ) : (
                <EmptyState
                  title="暂无关联会员"
                  description="当前还没有会员正在使用该方案，可继续投放或调整配置。"
                  size="compact"
                />
              )}
            </SectionCard>
          </div>
        ) : (
          <EmptyState
            title="暂无方案详情"
            description="请选择一个会员方案查看详细信息。"
            size="compact"
          />
        )}
      </Drawer>
    </div>
  );
}
