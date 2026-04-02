import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  SaveOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  App,
  Button,
  Col,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Switch,
  Table
} from 'antd';
import { useMemo, useState } from 'react';
import ActionButton from '@/components/ActionButton';
import EmptyState from '@/components/EmptyState';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatusTag from '@/components/StatusTag';
import { permissionMatrix, roleCards } from '@/mock';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import cls from './index.module.css';

type PermissionRow = (typeof permissionMatrix)[number];
type RoleCard = (typeof roleCards)[number];
type RoleStatus = RoleCard['status'];
type RoleFormValues = Omit<RoleCard, 'key' | 'scopes'> & { scopesText: string };

const coreRoleKeys = ['owner', 'frontdesk', 'coach', 'finance'] as const;

const defaultRoleNames: Record<(typeof coreRoleKeys)[number], string> = {
  owner: '店长',
  frontdesk: '前台',
  coach: '教练',
  finance: '财务'
};

const defaultRoleFormValues: RoleFormValues = {
  name: '',
  status: '待激活',
  users: 1,
  description: '',
  scopesText: ''
};

const roleStatusOptions: RoleStatus[] = ['正常', '待激活', '处理中'];

const createRoleKey = () => `role-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const parseScopes = (value: string) => value
  .split(/[、,，\n]+/)
  .map((item) => item.trim())
  .filter(Boolean);

const CRUD_MODAL_WIDTH = 780;

export default function RolesPage() {
  const [form] = Form.useForm<RoleFormValues>();
  const [roles, setRoles] = useState<RoleCard[]>(roleCards);
  const [matrix, setMatrix] = useState(permissionMatrix);
  const [savedMatrix, setSavedMatrix] = useState(permissionMatrix);
  const [isRoleFormOpen, setIsRoleFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleCard | null>(null);
  const [detailRole, setDetailRole] = useState<RoleCard | null>(null);
  const { message } = App.useApp();

  const roleNameMap = useMemo(() => coreRoleKeys.reduce<Record<(typeof coreRoleKeys)[number], string>>((map, key) => {
    map[key] = roles.find((item) => item.key === key)?.name ?? defaultRoleNames[key];
    return map;
  }, { ...defaultRoleNames }), [roles]);

  const unsavedMatrixCount = useMemo(
    () => matrix.reduce((total, row, rowIndex) => total + coreRoleKeys.filter((roleKey) => row[roleKey] !== savedMatrix[rowIndex]?.[roleKey]).length, 0),
    [matrix, savedMatrix]
  );

  const togglePermission = (rowKey: string, roleKey: (typeof coreRoleKeys)[number], checked: boolean) => {
    setMatrix((prev) => prev.map((item) => (item.key === rowKey ? { ...item, [roleKey]: checked } : item)));
  };

  const openCreateModal = () => {
    setEditingRole(null);
    form.setFieldsValue(defaultRoleFormValues);
    setIsRoleFormOpen(true);
  };

  const openEditModal = (role: RoleCard) => {
    setEditingRole(role);
    form.setFieldsValue({
      name: role.name,
      status: role.status,
      users: role.users,
      description: role.description,
      scopesText: role.scopes.join('、')
    });
    setIsRoleFormOpen(true);
  };

  const closeRoleFormModal = () => {
    setIsRoleFormOpen(false);
    setEditingRole(null);
    form.resetFields();
  };

  const handleSaveRole = async () => {
    const values = await form.validateFields();
    const scopes = parseScopes(values.scopesText);
    const nextRole: RoleCard = editingRole
      ? {
        ...editingRole,
        ...values,
        scopes
      }
      : {
        key: createRoleKey(),
        ...values,
        scopes
      };

    setRoles((current) => {
      if (editingRole) {
        return current.map((item) => (item.key === editingRole.key ? nextRole : item));
      }

      return [nextRole, ...current];
    });

    if (detailRole?.key === nextRole.key) {
      setDetailRole(nextRole);
    }

    message.success(editingRole ? '角色信息已更新' : '新角色已添加');
    closeRoleFormModal();
  };

  const handleDeleteRole = (role: RoleCard) => {
    setRoles((current) => current.filter((item) => item.key !== role.key));

    if (detailRole?.key === role.key) {
      setDetailRole(null);
    }

    if (editingRole?.key === role.key) {
      closeRoleFormModal();
    }

    message.success(`已删除角色 ${role.name}`);
  };

  const handleSaveMatrix = () => {
    setSavedMatrix(matrix.map((item) => ({ ...item })));
    message.success('权限模板已在当前页面状态中保存');
  };

  const columns: ColumnsType<PermissionRow> = [
    {
      title: '功能模块',
      dataIndex: 'module',
      key: 'module',
      render: (value: string) => <strong>{value}</strong>
    },
    {
      title: roleNameMap.owner,
      dataIndex: 'owner',
      key: 'owner',
      align: 'center',
      render: (checked: boolean, record) => <Switch checked={checked} onChange={(value) => togglePermission(record.key, 'owner', value)} />
    },
    {
      title: roleNameMap.frontdesk,
      dataIndex: 'frontdesk',
      key: 'frontdesk',
      align: 'center',
      render: (checked: boolean, record) => <Switch checked={checked} onChange={(value) => togglePermission(record.key, 'frontdesk', value)} />
    },
    {
      title: roleNameMap.coach,
      dataIndex: 'coach',
      key: 'coach',
      align: 'center',
      render: (checked: boolean, record) => <Switch checked={checked} onChange={(value) => togglePermission(record.key, 'coach', value)} />
    },
    {
      title: roleNameMap.finance,
      dataIndex: 'finance',
      key: 'finance',
      align: 'center',
      render: (checked: boolean, record) => <Switch checked={checked} onChange={(value) => togglePermission(record.key, 'finance', value)} />
    }
  ];

  return (
    <div className={pageCls.page}>
      <PageHeader
        title="角色与权限"
        subtitle="统一管理门店角色分工，确保每个岗位只访问必要功能。"
        extra={
          <ActionButton icon={<PlusOutlined />} onClick={openCreateModal}>
            新增角色
          </ActionButton>
        }
      />

      <SectionCard title="角色列表" subtitle={`当前岗位分配与权限范围 · 本地角色 ${roles.length} 个`}>
        {roles.length ? (
          <div className={cls.roleGrid}>
            {roles.map((item) => (
              <div key={item.key} className={`${widgetCls.settingBlock} ${cls.roleCard}`}>
                <div className={widgetCls.detailHeader}>
                  <div>
                    <h3 className={widgetCls.detailTitle}>{item.name}</h3>
                    <div className={widgetCls.smallText}>{item.users} 人使用</div>
                  </div>
                  <StatusTag status={item.status} />
                </div>

                <div className={cls.roleBody}>
                  <div className={widgetCls.smallText}>{item.description}</div>
                  <div className={cls.scopeRow}>
                    {item.scopes.map((scope) => (
                      <span key={scope} className={widgetCls.chip}>
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>

                <div className={cls.roleFooter}>
                  <span className={pageCls.memberRemainingBadge}>权限项 {item.scopes.length} 个</span>
                  <div className={cls.roleActions}>
                    <Button size="large" className={pageCls.cardActionHalf} icon={<EditOutlined />} onClick={() => openEditModal(item)}>编辑</Button>
                    <Button size="large" className={pageCls.cardActionHalf} icon={<EyeOutlined />} onClick={() => setDetailRole(item)}>详情</Button>
                    <Popconfirm title="确认删除该角色吗？" okText="删除" cancelText="取消" onConfirm={() => handleDeleteRole(item)}>
                      <Button size="large" danger className={pageCls.cardActionHalf} icon={<DeleteOutlined />}>删除</Button>
                    </Popconfirm>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="暂无角色配置" description="角色列表为空时，可在此统一创建岗位权限模板。" actionText="新增角色" onAction={openCreateModal} />
        )}
      </SectionCard>

      <SectionCard
        title="权限矩阵"
        subtitle={`可视化开关仅在当前页面状态中生效${unsavedMatrixCount > 0 ? ` · 待保存 ${unsavedMatrixCount} 项` : ' · 已同步最新模板'}`}
        extra={
          <ActionButton icon={<SaveOutlined />} onClick={handleSaveMatrix}>
            保存权限模板
          </ActionButton>
        }
      >
        {matrix.length ? (
          <div className={pageCls.tableWrap}>
            <Table<PermissionRow>
              className={pageCls.membersTable}
              rowKey="key"
              columns={columns}
              dataSource={matrix}
              scroll={{ x: 760 }}
              pagination={false}
            />
          </div>
        ) : (
          <EmptyState title="暂无权限矩阵" description="当前尚未配置角色权限，请先创建角色或导入默认模板。" actionText="返回角色列表" onAction={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
        )}
      </SectionCard>

      <Modal
        className={pageCls.crudModal}
        title={editingRole ? '编辑角色' : '新增角色'}
        open={isRoleFormOpen}
        width={CRUD_MODAL_WIDTH}
        onCancel={closeRoleFormModal}
        onOk={handleSaveRole}
        okText={editingRole ? '保存修改' : '新增角色'}
        cancelText="取消"
        destroyOnHidden
      >
        <Form form={form} className={pageCls.crudModalForm} layout="vertical">
          <Row gutter={18}>
            <Col xs={24} md={12}>
              <Form.Item name="name" label="角色名称" rules={[{ required: true, message: '请输入角色名称' }]}>
                <Input className={pageCls.settingsInput} placeholder="例如：运营主管" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="status" label="角色状态" rules={[{ required: true, message: '请选择角色状态' }]}>
                <Select className={pageCls.settingsInput} options={roleStatusOptions.map((item) => ({ label: item, value: item }))} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="users" label="使用人数" rules={[{ required: true, message: '请输入使用人数' }]}>
                <InputNumber className={pageCls.settingsInput} style={{ width: '100%' }} min={0} precision={0} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="description" label="角色说明" rules={[{ required: true, message: '请输入角色说明' }]}>
                <Input.TextArea className={pageCls.settingsInput} rows={4} placeholder="概述该岗位的主要职责与协作范围" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="scopesText"
                label="权限范围"
                rules={[
                  { required: true, message: '请输入至少一个权限范围' },
                  {
                    validator: async (_, value: string | undefined) => {
                      if (parseScopes(value ?? '').length === 0) {
                        throw new Error('请输入至少一个权限范围');
                      }
                    }
                  }
                ]}
              >
                <Input.TextArea className={pageCls.settingsInput} rows={4} placeholder="例如：门店总览、排班审批、会员管理" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Drawer
        open={detailRole !== null}
        width={440}
        title={detailRole?.name ?? '角色详情'}
        onClose={() => setDetailRole(null)}
        extra={detailRole ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button icon={<EditOutlined />} onClick={() => openEditModal(detailRole)}>编辑</Button>
            <Popconfirm title="确认删除该角色吗？" okText="删除" cancelText="取消" onConfirm={() => handleDeleteRole(detailRole)}>
              <Button danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          </div>
        ) : null}
      >
        {detailRole ? (
          <div style={{ display: 'grid', gap: 16 }}>
            <div className={widgetCls.detailOverviewPanel}>
              <div className={widgetCls.detailOverviewSummary}>
                <div className={widgetCls.recordTitle} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {detailRole.name}
                  <StatusTag status={detailRole.status} />
                </div>
                <div className={widgetCls.detailOverviewText}>{detailRole.description}</div>
              </div>

              <div className={widgetCls.detailOverviewStatGrid}>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatMint}`}>
                  <div className={widgetCls.detailInsightLabel}>使用人数</div>
                  <div className={widgetCls.detailOverviewStatValue}>{detailRole.users}</div>
                </div>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatViolet}`}>
                  <div className={widgetCls.detailInsightLabel}>权限项</div>
                  <div className={widgetCls.detailOverviewStatValue}>{detailRole.scopes.length}</div>
                </div>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatOrange}`}>
                  <div className={widgetCls.detailInsightLabel}>矩阵联动</div>
                  <div className={widgetCls.detailOverviewStatValue} style={{ fontSize: 'var(--font-size-xl)' }}>
                    {coreRoleKeys.includes(detailRole.key as (typeof coreRoleKeys)[number]) ? '已启用' : '卡片管理'}
                  </div>
                </div>
              </div>

              <div>
                <div className={widgetCls.smallText} style={{ marginBottom: 8 }}>权限范围</div>
                <div className={cls.scopeRow}>
                  {detailRole.scopes.map((scope) => (
                    <span key={scope} className={widgetCls.chip}>
                      {scope}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="角色名称">{detailRole.name}</Descriptions.Item>
              <Descriptions.Item label="角色状态">{detailRole.status}</Descriptions.Item>
              <Descriptions.Item label="使用人数">{detailRole.users} 人</Descriptions.Item>
              <Descriptions.Item label="角色说明">{detailRole.description}</Descriptions.Item>
              <Descriptions.Item label="权限范围">{detailRole.scopes.join('、')}</Descriptions.Item>
            </Descriptions>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
