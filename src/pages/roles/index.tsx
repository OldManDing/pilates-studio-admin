import { EditOutlined, EyeOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import {
  App,
  Button,
  Col,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Spin,
  Switch,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import ActionButton from '@/components/ActionButton';
import EmptyState from '@/components/EmptyState';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatusTag from '@/components/StatusTag';
import { rolesApi, type Permission, type Role } from '@/services/roles';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';

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

const CRUD_MODAL_WIDTH = 780;

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

  const fetchData = async () => {
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
    } catch (err: any) {
      message.error(err?.message || '获取角色权限数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
    } catch (err: any) {
      message.error(err?.message || '角色创建失败');
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
    } catch (err: any) {
      message.error(err?.message || '保存权限失败');
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
          <div className={`${pageCls.courseGrid} ${pageCls.workSection}`}>
            {roles.map((item) => (
              <div key={item.id} className={`${widgetCls.settingBlock} ${widgetCls.workRecordItem}`}>
                <div className={widgetCls.detailHeader}>
                  <div>
                    <h3 className={widgetCls.detailTitle}>{item.name}</h3>
                    <div className={widgetCls.smallText}>角色编码 {item.code}</div>
                  </div>
                  <StatusTag status="正常" />
                </div>

                <div className={widgetCls.detailOverviewText}>{item.description || '暂无角色说明'}</div>

                <div className={widgetCls.chipRow}>
                  <span className={widgetCls.chipPrimary}>管理员 {item._count?.admins || 0} 人</span>
                  <span className={widgetCls.chip}>权限项 {item.permissions.length} 个</span>
                </div>

                <div className={`${pageCls.actionRowWrap} ${pageCls.actionRowWrapTop}`}>
                  <Button size="middle" className={pageCls.cardActionSecondary} icon={<EyeOutlined />} onClick={() => setDetailRole(item)}>详情</Button>
                  <Button size="middle" className={pageCls.cardActionSecondary} icon={<EditOutlined />} onClick={() => openPermissionEditor(item)}>编辑权限</Button>
                </div>
              </div>
            ))}
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
              <Form.Item name="code" label="角色编码" rules={[{ required: true, message: '请选择角色编码' }]}>
                <Select
                  className={pageCls.settingsInput}
                  options={(Object.keys(roleCodeLabel) as RoleCode[]).map((key) => ({
                    label: `${roleCodeLabel[key]} (${key})`,
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
        width={560}
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
              <div className={pageCls.rolePermissionTitle}>{moduleName}</div>
              <div className={pageCls.rolePermissionList}>
              {permissionList.map((permission) => {
                const checked = selectedPermissionIds.includes(permission.id);
                return (
                  <div key={permission.id} className={pageCls.rolePermissionItem}>
                    <div className={pageCls.rolePermissionText}>
                      <div className={pageCls.rolePermissionCode}>{permission.action}:{permission.module}</div>
                      <div className={pageCls.rolePermissionDesc}>{permission.description || '无描述'}</div>
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
        width={440}
        title={detailRole?.name || '角色详情'}
        onClose={() => setDetailRole(null)}
      >
        {detailRole ? (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="角色编码">{detailRole.code}</Descriptions.Item>
            <Descriptions.Item label="角色名称">{detailRole.name}</Descriptions.Item>
            <Descriptions.Item label="角色说明">{detailRole.description || '-'}</Descriptions.Item>
            <Descriptions.Item label="管理员数量">{detailRole._count?.admins || 0}</Descriptions.Item>
            <Descriptions.Item label="权限数量">{detailRole.permissions.length}</Descriptions.Item>
          </Descriptions>
        ) : null}
      </Drawer>
    </div>
  );
}
