import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import {
  App,
  Col,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Spin,
  Switch,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ActionButton from '@/components/ActionButton';
import EmptyState from '@/components/EmptyState';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatusTag from '@/components/StatusTag';
import { rolesApi, type Permission, type Role } from '@/services/roles';
import { CRUD_MODAL_WIDTH, NARROW_DETAIL_DRAWER_WIDTH, ROLE_PERMISSION_DRAWER_WIDTH } from '@/styles/dimensions';
import pageCls from '@/styles/page.module.css';
import { getErrorMessage } from '@/utils/errors';
import roleCss from './index.module.css';

type RoleCode = 'OWNER' | 'FRONTDESK' | 'COACH' | 'FINANCE';

type RoleFormValues = {
  code: RoleCode;
  name: string;
  description?: string;
};

const roleCodeLabel: Record<RoleCode, string> = {
  OWNER: '店长',
  FRONTDESK: '前台',
  COACH: '教练',
  FINANCE: '财务',
};

// 模块名中文映射
const moduleNameMap: Record<string, string> = {
  // 小写
  members: '会员管理',
  bookings: '预约管理',
  courses: '课程管理',
  coaches: '教练管理',
  transactions: '交易管理',
  reports: '报表管理',
  settings: '系统设置',
  roles: '角色权限',
  auth: '认证管理',
  dashboard: '仪表盘',
  plans: '会籍方案',
  sessions: '课程时段',
  attendance: '签到管理',
  analytics: '数据分析',
  admin: '管理员',
  // 大写
  MEMBERS: '会员管理',
  BOOKINGS: '预约管理',
  COURSES: '课程管理',
  COACHES: '教练管理',
  TRANSACTIONS: '交易管理',
  REPORTS: '报表管理',
  SETTINGS: '系统设置',
  ROLES: '角色权限',
  AUTH: '认证管理',
  DASHBOARD: '仪表盘',
  PLANS: '会籍方案',
  SESSIONS: '课程时段',
  ATTENDANCE: '签到管理',
  ANALYTICS: '数据分析',
  ADMIN: '管理员',
};

// 权限动作中文映射
const actionLabelMap: Record<string, string> = {
  // 小写
  create: '创建',
  read: '查看',
  update: '编辑',
  delete: '删除',
  approve: '审批',
  export: '导出',
  import: '导入',
  manage: '管理',
  write: '写入',
  // 大写
  CREATE: '创建',
  READ: '查看',
  UPDATE: '编辑',
  DELETE: '删除',
  APPROVE: '审批',
  EXPORT: '导出',
  IMPORT: '导入',
  MANAGE: '管理',
  WRITE: '写入',
};

export default function RolesPage() {
  const [form] = Form.useForm<RoleFormValues>();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isRoleFormOpen, setIsRoleFormOpen] = useState(false);
  const [detailRole, setDetailRole] = useState<Role | null>(null);
  const [editingPermissionRole, setEditingPermissionRole] = useState<Role | null>(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      let permissionList = await rolesApi.getPermissions().catch(() => []);
      if (!permissionList.length) {
        await rolesApi.initializeDefaults().catch(() => null);
        permissionList = await rolesApi.getPermissions().catch(() => []);
      }
      const roleList = await rolesApi.getAll();
      setRoles(roleList);
      setPermissions(permissionList);
    } catch (err) {
      message.error(getErrorMessage(err, '获取角色权限数据失败'));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const groupedPermissions = useMemo(() => {
    const groupMap = new Map<string, Permission[]>();
    permissions.forEach((item) => {
      const list = groupMap.get(item.module) || [];
      list.push(item);
      groupMap.set(item.module, list);
    });
    return Array.from(groupMap.entries());
  }, [permissions]);

  const openCreateModal = () => {
    form.setFieldsValue({
      code: 'FRONTDESK',
      name: '',
      description: '',
    });
    setIsRoleFormOpen(true);
  };

  const closeCreateModal = () => {
    setIsRoleFormOpen(false);
    form.resetFields();
  };

  const handleCreateRole = async () => {
    const values = await form.validateFields();
    try {
      setSaving(true);
      await rolesApi.create({
        code: values.code,
        name: values.name,
        description: values.description,
      });
      message.success('角色创建成功');
      closeCreateModal();
      await fetchData();
    } catch (err) {
      message.error(getErrorMessage(err, '角色创建失败'));
    } finally {
      setSaving(false);
    }
  };

  const openPermissionEditor = (role: Role) => {
    setEditingPermissionRole(role);
    setSelectedPermissionIds(role.permissions.map((rp) => rp.permission.id));
  };

  const handlePermissionToggle = (permissionId: string, checked: boolean) => {
    setSelectedPermissionIds((current) => {
      if (checked) {
        return current.includes(permissionId) ? current : [...current, permissionId];
      }
      return current.filter((id) => id !== permissionId);
    });
  };

  const savePermissions = async () => {
    if (!editingPermissionRole) return;
    try {
      setSaving(true);
      await rolesApi.assignPermissions(editingPermissionRole.id, selectedPermissionIds);
      message.success('权限模板已保存并生效');
      setEditingPermissionRole(null);
      await fetchData();
    } catch (err) {
      message.error(getErrorMessage(err, '保存权限失败'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`${pageCls.page} ${pageCls.workPage}`}>
      <PageHeader
        title="角色与权限"
        subtitle="统一管理门店角色分工，所有修改均通过后端接口持久化并即时生效。"
        extra={(
          <ActionButton icon={<PlusOutlined />} onClick={openCreateModal}>
            新增角色
          </ActionButton>
        )}
      />

      <SectionCard title="角色列表" subtitle={`当前角色 ${roles.length} 个 · 权限实时同步后端`}>
        {loading ? (
          <div className={pageCls.centeredStatePadded}><Spin /></div>
        ) : roles.length ? (
          <div className={`${roleCss.roleGrid} ${pageCls.workSection}`}>
            {roles.map((item) => {
              const roleTone = (['mint', 'violet', 'orange', 'pink'] as const)[item.code === 'OWNER' ? 0 : item.code === 'FRONTDESK' ? 1 : item.code === 'COACH' ? 2 : 3];
              const initials = item.name.slice(0, 1);
              return (
                <div key={item.id} className={roleCss.roleCard}>
                  <div className={roleCss.roleCardHeader}>
                    <div className={roleCss.roleAvatar} data-tone={roleTone}>
                      {initials}
                    </div>
                    <div className={roleCss.roleInfo}>
                      <div className={roleCss.roleNameRow}>
                        <h3 className={roleCss.roleName}>{item.name}</h3>
                        <StatusTag status="正常" />
                      </div>
                      <div className={roleCss.roleSub}>{item.description || '暂无角色说明'}</div>
                    </div>
                  </div>

                  <div className={roleCss.roleStats}>
                    <span className={roleCss.roleStatItem}>
                      <span className={roleCss.roleStatValue}>{item.permissions.length}</span>
                      <span className={roleCss.roleStatLabel}>权限项</span>
                    </span>
                    <span className={roleCss.roleStatDivider}>·</span>
                    <span className={roleCss.roleStatItem}>
                      <span className={roleCss.roleStatValue}>{item._count?.admins || 0}</span>
                      <span className={roleCss.roleStatLabel}>管理员</span>
                    </span>
                  </div>

                  <div className={roleCss.roleActions}>
                    <ActionButton
                      size="large"
                      ghost
                      className={roleCss.roleActionButton}
                      icon={<EyeOutlined />}
                      onClick={() => setDetailRole(item)}
                    >
                      详情
                    </ActionButton>
                    <ActionButton
                      size="large"
                      className={roleCss.roleActionButton}
                      icon={<EditOutlined />}
                      onClick={() => openPermissionEditor(item)}
                    >
                      编辑权限
                    </ActionButton>
                    <Popconfirm
                      title="删除角色"
                      description="删除后该角色将无法恢复，且不会删除保留角色或已分配角色。"
                      okText="确认删除"
                      cancelText="取消"
                      onConfirm={async () => {
                        try {
                          await rolesApi.remove(item.id);
                          message.success('角色已删除');
                          if (detailRole?.id === item.id) {
                            setDetailRole(null);
                          }
                          await fetchData();
                        } catch (err) {
                          message.error(getErrorMessage(err, '删除角色失败'));
                        }
                      }}
                    >
                      <ActionButton
                        size="large"
                        ghost
                        className={roleCss.roleActionButton}
                        icon={<DeleteOutlined />}
                      >
                        删除角色
                      </ActionButton>
                    </Popconfirm>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState title="暂无角色配置" description="请先创建角色并分配权限。" actionText="新增角色" onAction={openCreateModal} />
        )}
      </SectionCard>

      <Modal
        className={pageCls.crudModal}
        title="新增角色"
        open={isRoleFormOpen}
        width={CRUD_MODAL_WIDTH}
        onCancel={closeCreateModal}
        onOk={handleCreateRole}
        okText="创建角色"
        cancelText="取消"
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form form={form} className={pageCls.crudModalForm} layout="vertical">
          <Row gutter={18}>
            <Col xs={24} md={12}>
              <Form.Item name="code" label="角色类型" rules={[{ required: true, message: '请选择角色类型' }]}>
                <Select
                  className={pageCls.settingsInput}
                  options={(Object.keys(roleCodeLabel) as RoleCode[]).map((key) => ({
                    label: roleCodeLabel[key],
                    value: key,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="name" label="角色名称" rules={[{ required: true, message: '请输入角色名称' }]}>
                <Input className={pageCls.settingsInput} placeholder="例如：运营主管" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="description" label="角色说明">
                <Input.TextArea className={pageCls.settingsInput} rows={4} placeholder="概述角色职责与协作范围" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Drawer
        open={editingPermissionRole !== null}
        width={ROLE_PERMISSION_DRAWER_WIDTH}
        title={editingPermissionRole ? `编辑权限 · ${editingPermissionRole.name}` : '编辑权限'}
        onClose={() => setEditingPermissionRole(null)}
        extra={(
          <ActionButton icon={<SaveOutlined />} onClick={savePermissions} disabled={saving}>
            保存
          </ActionButton>
        )}
      >
        <div className={pageCls.rolePermissionPanel}>
          {groupedPermissions.map(([moduleName, permissionList]) => (
            <div key={moduleName} className={pageCls.rolePermissionBlock}>
              <div className={pageCls.rolePermissionTitle}>{moduleNameMap[moduleName] || moduleName}</div>
              <div className={pageCls.rolePermissionList}>
              {permissionList.map((permission) => {
                const checked = selectedPermissionIds.includes(permission.id);
                const actionLabel = actionLabelMap[permission.action] || permission.action;
                const moduleLabel = moduleNameMap[permission.module] || permission.module;
                return (
                  <div key={permission.id} className={pageCls.rolePermissionItem}>
                    <div className={pageCls.rolePermissionText}>
                      <div className={pageCls.rolePermissionCode}>{actionLabel} {moduleLabel}</div>
                      <div className={pageCls.rolePermissionDesc}>{permission.description || '暂无描述'}</div>
                    </div>
                    <Switch checked={checked} onChange={(value) => handlePermissionToggle(permission.id, value)} />
                  </div>
                );
              })}
            </div>
            </div>
          ))}
        </div>
      </Drawer>

      <Drawer
        open={detailRole !== null}
        width={NARROW_DETAIL_DRAWER_WIDTH}
        title={detailRole?.name || '角色详情'}
        onClose={() => setDetailRole(null)}
      >
        {detailRole ? (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="角色类型">{roleCodeLabel[detailRole.code as RoleCode] || detailRole.code}</Descriptions.Item>
            <Descriptions.Item label="角色名称">{detailRole.name}</Descriptions.Item>
            <Descriptions.Item label="角色说明">{detailRole.description || '-'}</Descriptions.Item>
            <Descriptions.Item label="管理员人数">{detailRole._count?.admins || 0} 人</Descriptions.Item>
            <Descriptions.Item label="权限数量">{detailRole.permissions.length} 项</Descriptions.Item>
          </Descriptions>
        ) : null}
      </Drawer>
    </div>
  );
}
