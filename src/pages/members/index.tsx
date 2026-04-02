import { DeleteOutlined, DownloadOutlined, EditOutlined, FilterOutlined, PlusOutlined, SearchOutlined, TeamOutlined, ThunderboltOutlined, UserAddOutlined, WarningOutlined } from '@ant-design/icons';
import { Button, Col, Descriptions, Drawer, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, message } from 'antd';
import { useMemo, useState } from 'react';
import ActionButton from '@/components/ActionButton';
import EmptyState from '@/components/EmptyState';
import MemberAvatar from '@/components/MemberAvatar';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import StatusTag from '@/components/StatusTag';
import { membersStats, membersTable } from '@/mock';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import type { MemberStatus } from '@/types';

const iconMap = {
  team: <TeamOutlined />,
  flash: <ThunderboltOutlined />,
  plus: <UserAddOutlined />,
  alert: <WarningOutlined />
};

type MemberRow = (typeof membersTable)[number];
type MemberTone = MemberRow['tone'];
type MemberFormValues = Omit<MemberRow, 'key'>;
type MemberFilterDraft = {
  status: MemberStatus | '全部';
  membership: string;
};

const defaultMemberFormValues: MemberFormValues = {
  name: '',
  phone: '',
  email: '',
  membership: membersTable[0]?.membership ?? '年卡会员',
  status: '正常',
  remaining: 0,
  joinedAt: '2026-04-02',
  tone: 'mint'
};

const toneOptions: Array<{ label: string; value: MemberTone }> = [
  { label: '薄荷绿', value: 'mint' },
  { label: '柔雾紫', value: 'violet' },
  { label: '暖日橙', value: 'orange' },
  { label: '轻粉色', value: 'pink' }
];

const memberStatusOptions: MemberStatus[] = ['正常', '待激活', '已过期'];

const membershipOptions = Array.from(new Set(membersTable.map((item) => item.membership)));

const createMemberKey = () => `member-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const CRUD_MODAL_WIDTH = 780;

export default function MembersPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<MemberFormValues>();
  const [members, setMembers] = useState<MemberRow[]>(membersTable);
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<MemberStatus | '全部'>('全部');
  const [membershipFilter, setMembershipFilter] = useState<string>('全部');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState<MemberFilterDraft>({ status: '全部', membership: '全部' });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberRow | null>(null);
  const [detailMember, setDetailMember] = useState<MemberRow | null>(null);

  const filteredMembers = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase();

    return members.filter((member) => {
      const matchesKeyword =
        keyword.length === 0 ||
        member.name.toLowerCase().includes(keyword) ||
        member.phone.toLowerCase().includes(keyword) ||
        member.email.toLowerCase().includes(keyword);
      const matchesStatus = statusFilter === '全部' || member.status === statusFilter;
      const matchesMembership = membershipFilter === '全部' || member.membership === membershipFilter;

      return matchesKeyword && matchesStatus && matchesMembership;
    });
  }, [members, membershipFilter, searchValue, statusFilter]);

  const openCreateModal = () => {
    setEditingMember(null);
    form.setFieldsValue(defaultMemberFormValues);
    setIsFormOpen(true);
  };

  const openEditModal = (member: MemberRow) => {
    setEditingMember(member);
    form.setFieldsValue({
      name: member.name,
      phone: member.phone,
      email: member.email,
      membership: member.membership,
      status: member.status,
      remaining: member.remaining,
      joinedAt: member.joinedAt,
      tone: member.tone
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
    const nextMember: MemberRow = editingMember
      ? { ...editingMember, ...values }
      : { key: createMemberKey(), ...values };

    setMembers((current) => {
      if (editingMember) {
        return current.map((member) => (member.key === editingMember.key ? nextMember : member));
      }

      return [nextMember, ...current];
    });

    if (detailMember?.key === nextMember.key) {
      setDetailMember(nextMember);
    }

    messageApi.success(editingMember ? '会员信息已更新' : '新会员已添加');
    closeFormModal();
  };

  const handleDeleteMember = (member: MemberRow) => {
    setMembers((current) => current.filter((item) => item.key !== member.key));

    if (detailMember?.key === member.key) {
      setDetailMember(null);
    }

    messageApi.success(`已删除会员 ${member.name}`);
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
        member.email,
        member.membership,
        member.status,
        String(member.remaining),
        member.joinedAt
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
    setFilterDraft({ status: statusFilter, membership: membershipFilter });
    setIsFilterOpen(true);
  };

  const applyFilters = () => {
    setStatusFilter(filterDraft.status);
    setMembershipFilter(filterDraft.membership);
    setIsFilterOpen(false);
  };

  const resetFilters = () => {
    const nextDraft: MemberFilterDraft = { status: '全部', membership: '全部' };

    setFilterDraft(nextDraft);
    setStatusFilter(nextDraft.status);
    setMembershipFilter(nextDraft.membership);
    setIsFilterOpen(false);
  };

  return (
    <div className={pageCls.page}>
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
        <div className={widgetCls.recordList}>
          {filteredMembers.map((member) => (
            <div key={member.key} className={`${widgetCls.recordItem} ${pageCls.surface} ${pageCls.memberRecordItem}`}>
              <div className={widgetCls.recordMeta}>
                <MemberAvatar name={member.name} tone={member.tone} />
                <div className={pageCls.memberRecordHead}>
                  <div className={pageCls.memberRecordNameRow}>
                    <span className={pageCls.membersName}>{member.name}</span>
                    <StatusTag status={member.status} />
                  </div>
                  <div className={widgetCls.recordSub}>{member.phone}</div>
                  <div className={pageCls.membersSubtext}>{member.email}</div>
                </div>
              </div>

              <div className={pageCls.memberRecordGrid}>
                <div className={pageCls.memberRecordField}>
                  <div className={pageCls.memberRecordLabel}>会籍类型</div>
                  <div className={pageCls.memberRecordValue}>{member.membership}</div>
                </div>
                <div className={pageCls.memberRecordField}>
                  <div className={pageCls.memberRecordLabel}>加入日期</div>
                  <div className={pageCls.memberRecordValue}>{member.joinedAt}</div>
                </div>
                <div className={pageCls.memberRecordField}>
                  <div className={pageCls.memberRecordLabel}>剩余课时</div>
                  <div className={pageCls.memberRecordValue}>{member.remaining} 节</div>
                </div>
              </div>

              <div className={widgetCls.detailActionGroup}>
                <div className={pageCls.memberRemainingBadge}>剩余课时 {member.remaining} 节</div>
                <Button size="large" className={pageCls.cardActionHalf} icon={<EditOutlined />} onClick={() => openEditModal(member)}>编辑</Button>
                <Button size="large" className={pageCls.cardActionHalf} onClick={() => setDetailMember(member)}>查看详情</Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`${pageCls.surface} ${widgetCls.detailCard}`} style={{ marginTop: 16 }}>
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
              <Form.Item name="email" label="邮箱" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '请输入有效邮箱地址' }]}>
                <Input className={pageCls.settingsInput} placeholder="例如：member@demo.com" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="membership" label="会籍类型" rules={[{ required: true, message: '请选择会籍类型' }]}>
                <Select
                  className={pageCls.settingsInput}
                  options={membershipOptions.map((item) => ({ label: item, value: item }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="status" label="会籍状态" rules={[{ required: true, message: '请选择会籍状态' }]}>
                <Select
                  className={pageCls.settingsInput}
                  options={memberStatusOptions.map((item) => ({ label: item, value: item }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="remaining" label="剩余课时" rules={[{ required: true, message: '请输入剩余课时' }]}>
                <InputNumber className={pageCls.settingsInput} style={{ width: '100%' }} min={0} precision={0} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="joinedAt" label="加入日期" rules={[{ required: true, message: '请输入加入日期' }]}>
                <Input className={pageCls.settingsInput} placeholder="格式：YYYY-MM-DD" />
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
        title="筛选会员"
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
            <div className={widgetCls.smallText} style={{ marginBottom: 8 }}>会籍状态</div>
            <Select
              value={filterDraft.status}
              className={pageCls.settingsInput}
              style={{ width: '100%' }}
              options={[{ label: '全部状态', value: '全部' }, ...memberStatusOptions.map((item) => ({ label: item, value: item }))]}
              onChange={(value: MemberStatus | '全部') => setFilterDraft((current) => ({ ...current, status: value }))}
            />
          </div>
          <div>
            <div className={widgetCls.smallText} style={{ marginBottom: 8 }}>会籍类型</div>
            <Select
              value={filterDraft.membership}
              className={pageCls.settingsInput}
              style={{ width: '100%' }}
              options={[{ label: '全部会籍', value: '全部' }, ...membershipOptions.map((item) => ({ label: item, value: item }))]}
              onChange={(value: string) => setFilterDraft((current) => ({ ...current, membership: value }))}
            />
          </div>
        </div>
      </Modal>

      <Drawer
        open={detailMember !== null}
        width={440}
        title={detailMember?.name ?? '会员详情'}
        onClose={() => setDetailMember(null)}
        extra={detailMember ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button icon={<EditOutlined />} onClick={() => openEditModal(detailMember)}>编辑</Button>
            <Popconfirm title="确认删除该会员吗？" okText="删除" cancelText="取消" onConfirm={() => handleDeleteMember(detailMember)}>
              <Button danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          </div>
        ) : null}
      >
        {detailMember ? (
          <div style={{ display: 'grid', gap: 16 }}>
            <div className={widgetCls.detailOverviewPanel}>
              <div className={widgetCls.recordMeta}>
                <MemberAvatar name={detailMember.name} tone={detailMember.tone} />
                <div>
                  <div className={widgetCls.recordTitle} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {detailMember.name}
                    <StatusTag status={detailMember.status} />
                  </div>
                  <div className={widgetCls.recordSub}>{detailMember.phone}</div>
                  <div className={widgetCls.recordSub}>{detailMember.email}</div>
                </div>
              </div>
              <div className={widgetCls.detailOverviewStatGrid}>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatMint}`}>
                  <div className={widgetCls.detailInsightLabel}>剩余课时</div>
                  <div className={widgetCls.detailOverviewStatValue}>{detailMember.remaining} 节</div>
                </div>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatViolet}`}>
                  <div className={widgetCls.detailInsightLabel}>会籍类型</div>
                  <div className={widgetCls.detailOverviewStatValue} style={{ fontSize: 'var(--font-size-xl)' }}>{detailMember.membership}</div>
                </div>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatOrange}`}>
                  <div className={widgetCls.detailInsightLabel}>加入日期</div>
                  <div className={widgetCls.detailOverviewStatValue} style={{ fontSize: 'var(--font-size-xl)' }}>{detailMember.joinedAt}</div>
                </div>
              </div>
            </div>

            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="姓名">{detailMember.name}</Descriptions.Item>
              <Descriptions.Item label="手机号">{detailMember.phone}</Descriptions.Item>
              <Descriptions.Item label="邮箱">{detailMember.email}</Descriptions.Item>
              <Descriptions.Item label="会籍类型">{detailMember.membership}</Descriptions.Item>
              <Descriptions.Item label="会籍状态">{detailMember.status}</Descriptions.Item>
              <Descriptions.Item label="剩余课时">{detailMember.remaining} 节</Descriptions.Item>
              <Descriptions.Item label="加入日期">{detailMember.joinedAt}</Descriptions.Item>
            </Descriptions>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
