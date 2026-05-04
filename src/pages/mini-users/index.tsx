import {
  CheckCircleOutlined,
  DisconnectOutlined,
  FilterOutlined,
  LinkOutlined,
  SearchOutlined,
  StopOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Button,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  Pagination,
  Select,
  Spin,
  message,
} from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ActionButton from '@/components/ActionButton';
import EmptyState from '@/components/EmptyState';
import FilterModalFooter from '@/components/FilterModalFooter';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatCard from '@/components/StatCard';
import StatusTag from '@/components/StatusTag';
import { authApi } from '@/services/auth';
import { membersApi, type Member } from '@/services/members';
import {
  miniUsersApi,
  type MiniUserMemberSummary,
  type MiniUserRecord,
  type MiniUserStatus,
} from '@/services/miniUsers';
import { NARROW_DETAIL_DRAWER_WIDTH } from '@/styles/dimensions';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import { getErrorMessage } from '@/utils/errors';
import { hasRequiredPermissions } from '@/utils/menu';
import { useDebouncedValue } from '@/utils/useDebouncedValue';

type MiniUserFilterStatus = MiniUserStatus | 'ALL';

type LinkMemberFormValues = {
  memberId: string;
};

type MemberOption = {
  value: string;
  label: string;
  searchText: string;
};

type MiniUserDetailMember = MiniUserMemberSummary & {
  joinedAt?: string;
  plan?: {
    id?: string;
    name?: string;
  } | null;
};

type MiniUserDetailRecord = Omit<MiniUserRecord, 'member'> & {
  member?: MiniUserDetailMember | null;
};

const PAGE_SIZE = 10;
const MEMBER_OPTION_PAGE_SIZE = 100;

const miniUserStatusLabels: Record<MiniUserStatus, string> = {
  ACTIVE: '正常',
  DISABLED: '已停用',
};

const iconMap = {
  total: <UserOutlined />,
  active: <CheckCircleOutlined />,
  disabled: <StopOutlined />,
  linked: <LinkOutlined />,
};

const buildMemberOption = (member: Member): MemberOption => ({
  value: member.id,
  label: `${member.name} · ${member.memberCode || member.phone || member.id}`,
  searchText: [member.name, member.memberCode, member.phone, member.email, member.id]
    .filter(Boolean)
    .join(' ')
    .toLowerCase(),
});

const buildMemberSummaryOption = (member: MiniUserMemberSummary): MemberOption => ({
  value: member.id,
  label: `${member.name || member.memberCode || member.phone || member.id} · ${member.memberCode || member.phone || member.status || member.id}`,
  searchText: [member.name, member.memberCode, member.phone, member.status, member.id]
    .filter(Boolean)
    .join(' ')
    .toLowerCase(),
});

const mergeMemberOptions = (options: MemberOption[], currentMember?: MiniUserMemberSummary | null) => {
  if (!currentMember?.id) {
    return options;
  }

  const currentOption = buildMemberSummaryOption(currentMember);
  const nextOptions = options.filter((option) => option.value !== currentOption.value);
  return [currentOption, ...nextOptions];
};

const normalizeStatus = (status?: MiniUserStatus): MiniUserStatus =>
  status === 'DISABLED' ? 'DISABLED' : 'ACTIVE';

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '-';
  }

  try {
    return new Date(value).toLocaleString('zh-CN', {
      hour12: false,
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
};

const getPrimaryLabel = (record: MiniUserRecord) =>
  record.nickname?.trim() || record.member?.name || record.openId || record.id;

const getSecondaryLabel = (record: MiniUserRecord) =>
  record.phone || record.member?.memberCode || record.openId || record.id;

const getLinkedMemberLabel = (member?: MiniUserMemberSummary | null) => {
  if (!member) {
    return '未绑定会员';
  }

  const primary = member.name || member.memberCode || member.phone || member.id;
  const secondary = member.memberCode || member.phone || member.status;
  return secondary ? `${primary} · ${secondary}` : primary;
};

export default function MiniUsersPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [linkMemberForm] = Form.useForm<LinkMemberFormValues>();
  const [miniUsers, setMiniUsers] = useState<MiniUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const debouncedSearchValue = useDebouncedValue(searchValue, 350);
  const [statusFilter, setStatusFilter] = useState<MiniUserFilterStatus>('ALL');
  const [filterDraft, setFilterDraft] = useState<{ status: MiniUserFilterStatus }>({ status: 'ALL' });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailLoadFailed, setDetailLoadFailed] = useState(false);
  const [detailRecord, setDetailRecord] = useState<MiniUserDetailRecord | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkingRecord, setLinkingRecord] = useState<MiniUserRecord | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [memberOptions, setMemberOptions] = useState<MemberOption[]>([]);
  const [memberOptionsLoading, setMemberOptionsLoading] = useState(false);
  const memberRequestSeqRef = useRef(0);
  const detailRequestSeqRef = useRef(0);
  const [currentUserPermissions, setCurrentUserPermissions] = useState<string[]>([]);
  const [currentUserRoleCode, setCurrentUserRoleCode] = useState('');
  const canWriteMiniUsers = currentUserRoleCode === 'OWNER' || hasRequiredPermissions(currentUserPermissions, ['WRITE:MINI_USERS']);

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

  const loadMiniUsers = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setLoadFailed(false);
      const response = await miniUsersApi.getAll(
        page,
        PAGE_SIZE,
        debouncedSearchValue.trim() || undefined,
        statusFilter === 'ALL' ? undefined : statusFilter,
      );
      setMiniUsers(response.data);
      setCurrentPage(response.meta.page);
      setTotal(response.meta.total);
    } catch (err) {
      setLoadFailed(true);
      messageApi.error(getErrorMessage(err, '加载小程序用户列表失败'));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchValue, messageApi, statusFilter]);

  useEffect(() => {
    void loadMiniUsers(1);
  }, [loadMiniUsers]);

  const loadMiniUserDetail = useCallback(async (id: string) => {
    const requestSeq = detailRequestSeqRef.current + 1;
    detailRequestSeqRef.current = requestSeq;
    setDetailLoading(true);
    setDetailLoadFailed(false);

    try {
      const detail: MiniUserDetailRecord = await miniUsersApi.getById(id);
      if (detailRequestSeqRef.current !== requestSeq) {
        return;
      }

      setDetailRecord(detail);
    } catch (err) {
      if (detailRequestSeqRef.current !== requestSeq) {
        return;
      }

      setDetailLoadFailed(true);
      messageApi.error(getErrorMessage(err, '加载小程序用户详情失败'));
    } finally {
      if (detailRequestSeqRef.current === requestSeq) {
        setDetailLoading(false);
      }
    }
  }, [messageApi]);

  const loadMemberOptions = useCallback(async (search?: string, currentMemberOverride?: MiniUserMemberSummary | null) => {
    const requestSeq = memberRequestSeqRef.current + 1;
    memberRequestSeqRef.current = requestSeq;
    const currentLinkedMember = currentMemberOverride ?? linkingRecord?.member;

    try {
      setMemberOptionsLoading(true);
      const response = await membersApi.getAll(1, MEMBER_OPTION_PAGE_SIZE, {
        search: search?.trim() || undefined,
      });

      if (memberRequestSeqRef.current !== requestSeq) {
        return;
      }

      setMemberOptions(mergeMemberOptions(response.data.map(buildMemberOption), currentLinkedMember));
    } catch (err) {
      if (memberRequestSeqRef.current !== requestSeq) {
        return;
      }

      setMemberOptions(mergeMemberOptions([], currentLinkedMember));
      messageApi.error(getErrorMessage(err, '加载会员选项失败'));
    } finally {
      if (memberRequestSeqRef.current === requestSeq) {
        setMemberOptionsLoading(false);
      }
    }
  }, [linkingRecord?.member, messageApi]);

  const openDetailDrawer = async (record: MiniUserRecord) => {
    setDetailOpen(true);
    setDetailLoadFailed(false);
    setDetailRecord(record);
    await loadMiniUserDetail(record.id);
  };

  const refreshAfterMutation = useCallback(async (updated?: MiniUserRecord) => {
    await loadMiniUsers(currentPage);

    if (updated && detailRecord?.id === updated.id) {
      setDetailRecord((current) => (current ? { ...current, ...updated } : current));
      await loadMiniUserDetail(updated.id);
    }
  }, [currentPage, detailRecord?.id, loadMiniUserDetail, loadMiniUsers]);

  const handleToggleStatus = async (record: MiniUserRecord) => {
    if (!canWriteMiniUsers) {
      messageApi.warning('当前账号没有小程序用户管理权限');
      return;
    }

    const nextStatus = normalizeStatus(record.status) === 'DISABLED' ? 'ACTIVE' : 'DISABLED';

    try {
      setStatusUpdatingId(record.id);
      const updated = nextStatus === 'ACTIVE'
        ? await miniUsersApi.enable(record.id)
        : await miniUsersApi.disable(record.id);
      await refreshAfterMutation(updated);
      messageApi.success(nextStatus === 'ACTIVE' ? '小程序用户已启用' : '小程序用户已停用');
    } catch (err) {
      messageApi.error(getErrorMessage(err, nextStatus === 'ACTIVE' ? '启用失败' : '停用失败'));
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const openLinkMemberModal = (record: MiniUserRecord) => {
    if (!canWriteMiniUsers) {
      messageApi.warning('当前账号没有小程序用户管理权限');
      return;
    }

    setLinkingRecord(record);
    setMemberOptions(mergeMemberOptions([], record.member));
    setIsLinkModalOpen(true);
    linkMemberForm.setFieldsValue({ memberId: record.member?.id });
    void loadMemberOptions(undefined, record.member);
  };

  const closeLinkMemberModal = () => {
    setIsLinkModalOpen(false);
    setLinkingRecord(null);
    linkMemberForm.resetFields();
  };

  const handleLinkMember = async () => {
    if (!canWriteMiniUsers) {
      messageApi.warning('当前账号没有小程序用户管理权限');
      return;
    }

    if (!linkingRecord) {
      return;
    }

    let values: LinkMemberFormValues;

    try {
      values = await linkMemberForm.validateFields();
    } catch {
      return;
    }

    try {
      setIsLinking(true);
      const updated = await miniUsersApi.linkMember(linkingRecord.id, values.memberId);
      await refreshAfterMutation(updated);
      messageApi.success('会员绑定已更新');
      closeLinkMemberModal();
    } catch (err) {
      messageApi.error(getErrorMessage(err, '绑定会员失败'));
    } finally {
      setIsLinking(false);
    }
  };

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
    setFilterDraft({ status: 'ALL' });
    setStatusFilter('ALL');
    setCurrentPage(1);
    setIsFilterOpen(false);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    void loadMiniUsers(page);
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    setCurrentPage(1);
  };

  const summaryStats = useMemo(() => {
    const activeCount = miniUsers.filter((item) => normalizeStatus(item.status) === 'ACTIVE').length;
    const disabledCount = miniUsers.filter((item) => normalizeStatus(item.status) === 'DISABLED').length;
    const linkedCount = miniUsers.filter((item) => Boolean(item.member?.id)).length;

    return [
      {
        title: '筛选结果总数',
        value: String(total),
        hint: '符合当前搜索与筛选条件的全部用户数',
        tone: 'mint' as const,
        icon: 'total' as const,
      },
      {
        title: '当前页正常用户',
        value: String(activeCount),
        hint: '仅统计当前页记录中的正常账号',
        tone: 'violet' as const,
        icon: 'active' as const,
      },
      {
        title: '当前页停用用户',
        value: String(disabledCount),
        hint: '仅统计当前页记录中的停用账号',
        tone: 'orange' as const,
        icon: 'disabled' as const,
      },
      {
        title: '当前页已绑定会员',
        value: String(linkedCount),
        hint: '仅统计当前页已关联会员档案的账号',
        tone: 'pink' as const,
        icon: 'linked' as const,
      },
    ];
  }, [miniUsers, total]);

  const filterLabels = [
    searchValue.trim() ? `关键词“${searchValue.trim()}”` : null,
    statusFilter !== 'ALL' ? `状态：${miniUserStatusLabels[statusFilter]}` : null,
  ].filter(Boolean);

  const resultSummary = filterLabels.length
    ? `已按${filterLabels.join('、')}筛选，支持继续查看详情、停用状态或绑定会员。`
    : '可按昵称、OpenID、手机号或会员信息快速定位小程序用户。';

  const detailStatus = normalizeStatus(detailRecord?.status);
  const linkModalTitle = linkingRecord?.member?.id ? '重新绑定会员' : '绑定会员';
  const linkModalCurrentMemberText = linkingRecord?.member
    ? `当前已绑定：${getLinkedMemberLabel(linkingRecord.member)}`
    : '当前尚未绑定会员';

  if (loading && miniUsers.length === 0) {
    return (
      <div className={`${pageCls.page} ${pageCls.workPage}`}>
        {contextHolder}
        <PageHeader
          title="小程序用户管理"
          subtitle="集中查看小程序账号状态、会员绑定关系与身份信息，方便前台核对与异常处理。"
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
        title="小程序用户管理"
        subtitle="集中查看小程序账号状态、会员绑定关系与身份信息，方便前台核对与异常处理。"
      />

      <div className={pageCls.heroGrid}>
        {summaryStats.map((item) => (
          <StatCard key={item.title} {...item} icon={iconMap[item.icon]} />
        ))}
      </div>

      <SectionCard title="用户列表">
        <Spin spinning={loading}>
          <div className={pageCls.sectionContentStack}>
            <div className={pageCls.sectionSummaryRow}>
              <div className={pageCls.sectionSummaryText}>{resultSummary}</div>
              <span className={pageCls.sectionMetaPill}>筛选结果共 {total} 位用户</span>
            </div>

            <div className={pageCls.toolbar}>
              <div className={pageCls.toolbarLeft}>
                <Input
                  className={pageCls.toolbarSearch}
                  size="large"
                  value={searchValue}
                  prefix={<SearchOutlined />}
                  placeholder="按昵称、OpenID、手机号或会员信息搜索"
                  onChange={(event) => handleSearchChange(event.target.value)}
                />
              </div>
              <div className={pageCls.toolbarRight}>
                <ActionButton ghost icon={<FilterOutlined />} onClick={openFilterModal}>筛选条件</ActionButton>
              </div>
            </div>

            {loadFailed && miniUsers.length === 0 ? (
              <div className={pageCls.sectionEmptyState}>
                <EmptyState
                  title="小程序用户加载失败"
                  description="请重试列表加载，确认网络和接口状态后再继续操作。"
                  actionText="重新加载"
                  onAction={() => void loadMiniUsers(1)}
                />
              </div>
            ) : miniUsers.length ? (
              <>
                <div className={`${widgetCls.recordList} ${pageCls.sectionListStack}`}>
                  {miniUsers.map((record) => {
                    const normalizedStatus = normalizeStatus(record.status);
                    const isUpdatingCurrent = statusUpdatingId === record.id;
                    const hasLinkedMember = Boolean(record.member?.id);

                    return (
                      <div key={record.id} className={`${widgetCls.recordItem} ${widgetCls.workRecordItem}`}>
                        <div className={widgetCls.recordMeta}>
                          <div>
                            <div className={widgetCls.recordTitle} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span>{getPrimaryLabel(record)}</span>
                              <StatusTag status={miniUserStatusLabels[normalizedStatus]} />
                            </div>
                            <div className={widgetCls.recordSub}>{getSecondaryLabel(record)}</div>
                            <div className={widgetCls.recordSub}>会员：{getLinkedMemberLabel(record.member)}</div>
                          </div>
                        </div>

                        <div className={widgetCls.infoStack}>
                          <div>OpenID：{record.openId || '-'}</div>
                          <div>手机号：{record.phone || '-'}</div>
                          <div>更新时间：{formatDateTime(record.updatedAt)}</div>
                        </div>

                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <Button className={pageCls.cardActionSecondary} onClick={() => void openDetailDrawer(record)}>
                            查看详情
                          </Button>
                          {canWriteMiniUsers ? (
                            <Button
                              className={pageCls.cardActionSecondary}
                              icon={<LinkOutlined />}
                              disabled={statusUpdatingId !== null && statusUpdatingId !== record.id}
                              onClick={() => openLinkMemberModal(record)}
                            >
                              {hasLinkedMember ? '重新绑定' : '绑定会员'}
                            </Button>
                          ) : null}
                          {canWriteMiniUsers ? (
                            <Button
                              type={normalizedStatus === 'DISABLED' ? 'primary' : 'default'}
                              className={normalizedStatus === 'DISABLED' ? pageCls.cardActionPrimary : pageCls.cardActionWarning}
                              icon={normalizedStatus === 'DISABLED' ? <CheckCircleOutlined /> : <DisconnectOutlined />}
                              loading={isUpdatingCurrent}
                              disabled={statusUpdatingId !== null && statusUpdatingId !== record.id}
                              onClick={() => void handleToggleStatus(record)}
                            >
                              {normalizedStatus === 'DISABLED' ? '启用' : '停用'}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className={pageCls.sectionPagination}>
                  <Pagination
                    current={currentPage}
                    pageSize={PAGE_SIZE}
                    total={total}
                    onChange={handlePageChange}
                    showSizeChanger={false}
                  />
                </div>
              </>
            ) : (
              <div className={pageCls.sectionEmptyState}>
                <EmptyState
                  title="暂无符合条件的小程序用户"
                  description="可以调整关键词或状态筛选后重试。"
                  actionText="清空筛选"
                  onAction={() => {
                    setSearchValue('');
                    resetFilters();
                  }}
                />
              </div>
            )}
          </div>
        </Spin>
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
            <div className={`${widgetCls.smallText} ${pageCls.filterFieldLabel}`}>账号状态</div>
            <Select
              value={filterDraft.status}
              className={`${pageCls.settingsInput} ${pageCls.fullWidthControl}`}
              options={[
                { label: '全部状态', value: 'ALL' },
                { label: miniUserStatusLabels.ACTIVE, value: 'ACTIVE' },
                { label: miniUserStatusLabels.DISABLED, value: 'DISABLED' },
              ]}
              onChange={(value: MiniUserFilterStatus) => setFilterDraft({ status: value })}
            />
          </div>
        </div>
      </Modal>

      <Modal
        className={pageCls.crudModal}
        title={linkModalTitle}
        open={isLinkModalOpen}
        onCancel={closeLinkMemberModal}
        onOk={() => void handleLinkMember()}
        okText="保存绑定"
        cancelText="取消"
        confirmLoading={isLinking}
        forceRender
        destroyOnHidden
      >
        <Form form={linkMemberForm} className={pageCls.crudModalForm} layout="vertical">
          <Form.Item label="当前小程序用户">
            <div>{linkingRecord ? `${getPrimaryLabel(linkingRecord)} · ${getSecondaryLabel(linkingRecord)}` : '-'}</div>
          </Form.Item>
          <Form.Item label="当前绑定会员">
            <div>{linkModalCurrentMemberText}</div>
          </Form.Item>
          <Form.Item
            name="memberId"
            label="选择会员"
            rules={[{ required: true, message: '请选择要绑定的会员' }]}
            extra={linkingRecord?.member?.id ? '已为你预选当前绑定会员，保存后会更新为新的绑定关系。' : '选择一个现有会员进行绑定。'}
          >
            <Select
              allowClear
              showSearch
              filterOption={false}
              loading={memberOptionsLoading}
              className={pageCls.settingsInput}
              placeholder="按姓名、编号、手机号搜索会员"
              options={memberOptions}
              onSearch={(value) => {
                void loadMemberOptions(value);
              }}
              notFoundContent={memberOptionsLoading ? <Spin size="small" /> : '暂无可绑定会员'}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        rootClassName={pageCls.responsiveDetailDrawer}
        open={detailOpen}
        width={NARROW_DETAIL_DRAWER_WIDTH}
        title={detailRecord ? getPrimaryLabel(detailRecord) : '小程序用户详情'}
        onClose={() => {
          setDetailOpen(false);
          setDetailRecord(null);
          setDetailLoadFailed(false);
          setDetailLoading(false);
        }}
        extra={detailRecord ? (
          <div className={pageCls.drawerActionGroup}>
            {canWriteMiniUsers ? (
              <Button
                icon={<LinkOutlined />}
                disabled={statusUpdatingId !== null}
                onClick={() => openLinkMemberModal(detailRecord)}
              >
                {detailRecord.member?.id ? '重新绑定' : '绑定会员'}
              </Button>
            ) : null}
            {canWriteMiniUsers ? (
              <Button
                type={detailStatus === 'DISABLED' ? 'primary' : 'default'}
                className={detailStatus === 'DISABLED' ? pageCls.cardActionPrimary : pageCls.cardActionWarning}
                icon={detailStatus === 'DISABLED' ? <CheckCircleOutlined /> : <DisconnectOutlined />}
                loading={statusUpdatingId === detailRecord.id}
                disabled={statusUpdatingId !== null && statusUpdatingId !== detailRecord.id}
                onClick={() => void handleToggleStatus(detailRecord)}
              >
                {detailStatus === 'DISABLED' ? '启用' : '停用'}
              </Button>
            ) : null}
          </div>
        ) : null}
        >
        {detailLoading && !detailRecord ? (
          <div className={pageCls.centeredStatePadded}><Spin /></div>
        ) : detailRecord ? (
          <div className={pageCls.detailContentStack}>
            {detailLoadFailed ? (
              <div
                style={{
                  border: '1px solid rgba(245, 34, 45, 0.15)',
                  background: '#fff2f0',
                  borderRadius: 16,
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 600, color: '#cf1322', marginBottom: 8 }}>详情加载失败</div>
                <div style={{ color: 'rgba(0, 0, 0, 0.65)', marginBottom: 12 }}>
                  当前先展示列表中的基础信息，完整详情与会员数据暂未刷新成功，请重试后再继续核对。
                </div>
                <Button onClick={() => void loadMiniUserDetail(detailRecord.id)}>重试加载详情</Button>
              </div>
            ) : null}
            <div className={widgetCls.detailOverviewPanel}>
              <div className={widgetCls.recordMeta}>
                <div>
                  <div className={`${widgetCls.recordTitle} ${pageCls.recordTitleRow}`}>
                    {getPrimaryLabel(detailRecord)}
                    <StatusTag status={miniUserStatusLabels[detailStatus]} />
                  </div>
                  <div className={widgetCls.recordSub}>{getSecondaryLabel(detailRecord)}</div>
                  <div className={widgetCls.recordSub}>OpenID：{detailRecord.openId || '-'}</div>
                </div>
              </div>

              <div className={widgetCls.detailOverviewStatGrid}>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatMint}`}>
                  <div className={widgetCls.detailInsightLabel}>绑定会员</div>
                  <div className={`${widgetCls.detailOverviewStatValue} ${widgetCls.detailOverviewStatValueLarge}`}>{detailRecord.member?.name || '未绑定'}</div>
                </div>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatViolet}`}>
                  <div className={widgetCls.detailInsightLabel}>账号状态</div>
                  <div className={`${widgetCls.detailOverviewStatValue} ${widgetCls.detailOverviewStatValueLarge}`}>{miniUserStatusLabels[detailStatus]}</div>
                </div>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatOrange}`}>
                  <div className={widgetCls.detailInsightLabel}>最近更新</div>
                  <div className={`${widgetCls.detailOverviewStatValue} ${widgetCls.detailOverviewStatValueLarge}`}>{formatDateTime(detailRecord.updatedAt)}</div>
                </div>
              </div>
            </div>

            <SectionCard title="基础信息" subtitle="展示管理员核对账号身份与状态所需的核心字段。">
              <Descriptions column={1} size="small" bordered className={pageCls.detailDescriptions}>
                <Descriptions.Item label="昵称">{detailRecord.nickname || '-'}</Descriptions.Item>
                <Descriptions.Item label="OpenID">{detailRecord.openId || '-'}</Descriptions.Item>
                <Descriptions.Item label="UnionID">{detailRecord.unionId || '-'}</Descriptions.Item>
                <Descriptions.Item label="手机号">{detailRecord.phone || '-'}</Descriptions.Item>
                <Descriptions.Item label="账号状态">{miniUserStatusLabels[detailStatus]}</Descriptions.Item>
                <Descriptions.Item label="创建时间">{formatDateTime(detailRecord.createdAt)}</Descriptions.Item>
                <Descriptions.Item label="更新时间">{formatDateTime(detailRecord.updatedAt)}</Descriptions.Item>
              </Descriptions>
            </SectionCard>

            <SectionCard title="绑定会员" subtitle="方便快速核对会员身份、编号与基础会籍信息。">
              {detailRecord.member ? (
                <Descriptions column={1} size="small" bordered className={pageCls.detailDescriptions}>
                  <Descriptions.Item label="会员姓名">{detailRecord.member.name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="会员编号">{detailRecord.member.memberCode || '-'}</Descriptions.Item>
                  <Descriptions.Item label="手机号">{detailRecord.member.phone || '-'}</Descriptions.Item>
                  <Descriptions.Item label="会员状态">{detailRecord.member.status || '-'}</Descriptions.Item>
                  <Descriptions.Item label="会籍计划">{detailRecord.member.plan?.name || '-'}</Descriptions.Item>
                  <Descriptions.Item label="加入时间">{formatDateTime(detailRecord.member.joinedAt)}</Descriptions.Item>
                </Descriptions>
              ) : (
                <EmptyState
                  size="compact"
                  title="尚未绑定会员"
                  description={canWriteMiniUsers ? '可直接在当前抽屉中完成绑定，便于后续按会员维度统一查看。' : '当前账号可查看绑定信息，但不能执行绑定操作。'}
                  actionText={canWriteMiniUsers ? '立即绑定' : undefined}
                  onAction={canWriteMiniUsers ? () => openLinkMemberModal(detailRecord) : undefined}
                />
              )}
            </SectionCard>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
