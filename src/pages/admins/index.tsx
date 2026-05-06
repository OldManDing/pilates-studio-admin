import {
  DeleteOutlined,
  EditOutlined,
  KeyOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Button,
  Descriptions,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Spin,
  message,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ActionButton from '@/components/ActionButton';
import EmptyState from '@/components/EmptyState';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatCard from '@/components/StatCard';
import { adminsApi, type AdminPayload, type AdminRecord } from '@/services/admins';
import { authApi } from '@/services/auth';
import { rolesApi, type Role } from '@/services/roles';
import { CRUD_MODAL_WIDTH } from '@/styles/dimensions';
import pageCls from '@/styles/page.module.css';
import { getErrorMessage } from '@/utils/errors';
import { hasRequiredPermissions } from '@/utils/menu';
import styles from './index.module.css';

type AdminFormValues = {
  email: string;
  phone?: string;
  displayName: string;
  roleId: string;
  password?: string;
};

type ResetPasswordFormValues = {
  password: string;
  confirmPassword: string;
};

const iconMap = {
  total: <TeamOutlined />,
  owners: <SafetyCertificateOutlined />,
  roles: <UserOutlined />,
  managed: <KeyOutlined />,
};

const formatDateTime = (value?: string) => {
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

const getAdminRoleLabel = (admin: AdminRecord) => admin.role?.name || admin.roleId || '未分配角色';

const buildUpdatePayload = (values: AdminFormValues): Partial<AdminPayload> => ({
  email: values.email.trim(),
  phone: values.phone?.trim() || undefined,
  displayName: values.displayName.trim(),
  roleId: values.roleId,
});

export default function AdminsPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [adminForm] = Form.useForm<AdminFormValues>();
  const [passwordForm] = Form.useForm<ResetPasswordFormValues>();
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [searchDraft, setSearchDraft] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [editingAdmin, setEditingAdmin] = useState<AdminRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [resetPasswordAdmin, setResetPasswordAdmin] = useState<AdminRecord | null>(null);
  const [deletingAdminId, setDeletingAdminId] = useState<string | null>(null);
  const [currentUserPermissions, setCurrentUserPermissions] = useState<string[]>([]);
  const [currentUserRoleCode, setCurrentUserRoleCode] = useState('');
  const canManageAdmins = currentUserRoleCode === 'OWNER' || hasRequiredPermissions(currentUserPermissions, ['MANAGE:ADMINS']);

  const roleOptions = useMemo(() => roles.map((role) => ({
    value: role.id,
    label: `${role.name} · ${role.code}`,
  })), [roles]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [adminList, roleList] = await Promise.all([
        adminsApi.getAll(searchValue || undefined),
        rolesApi.getAll().catch(() => []),
      ]);

      setAdmins(adminList);
      setRoles(roleList);
    } catch (err) {
      messageApi.error(getErrorMessage(err, '加载管理员账号失败'));
    } finally {
      setLoading(false);
    }
  }, [messageApi, searchValue]);

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

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const summaryStats = useMemo(() => {
    const ownerCount = admins.filter((admin) => admin.role?.code === 'OWNER').length;
    const roleCount = new Set(admins.map((admin) => admin.role?.code || admin.roleId).filter(Boolean)).size;

    return [
      {
        title: '管理员账号',
        value: String(admins.length),
        hint: '当前筛选结果',
        tone: 'mint' as const,
        icon: 'total' as const,
      },
      {
        title: '店长账号',
        value: String(ownerCount),
        hint: '拥有最高后台权限',
        tone: 'violet' as const,
        icon: 'owners' as const,
      },
      {
        title: '覆盖角色',
        value: String(roleCount),
        hint: '当前列表角色类型',
        tone: 'orange' as const,
        icon: 'roles' as const,
      },
      {
        title: '操作权限',
        value: canManageAdmins ? '可管理' : '只读',
        hint: '由当前登录角色控制',
        tone: 'pink' as const,
        icon: 'managed' as const,
      },
    ];
  }, [admins, canManageAdmins]);

  const openCreateModal = () => {
    if (!canManageAdmins) {
      messageApi.warning('当前账号没有管理员账号管理权限');
      return;
    }

    setEditingAdmin(null);
    adminForm.resetFields();
    adminForm.setFieldsValue({
      email: '',
      phone: '',
      displayName: '',
      roleId: roles[0]?.id || '',
      password: '',
    });
    setFormOpen(true);
  };

  const openEditModal = (admin: AdminRecord) => {
    if (!canManageAdmins) {
      messageApi.warning('当前账号没有管理员账号管理权限');
      return;
    }

    setEditingAdmin(admin);
    adminForm.setFieldsValue({
      email: admin.email,
      phone: admin.phone,
      displayName: admin.displayName,
      roleId: admin.roleId || admin.role?.id || '',
      password: '',
    });
    setFormOpen(true);
  };

  const closeAdminModal = () => {
    setFormOpen(false);
    setEditingAdmin(null);
    adminForm.resetFields();
  };

  const handleSaveAdmin = async () => {
    if (!canManageAdmins) {
      messageApi.warning('当前账号没有管理员账号管理权限');
      return;
    }

    let values: AdminFormValues;
    try {
      values = await adminForm.validateFields();
    } catch {
      return;
    }

    try {
      setSaving(true);
      if (editingAdmin) {
        await adminsApi.update(editingAdmin.id, buildUpdatePayload(values));
        messageApi.success('管理员账号已更新');
      } else {
        if (!values.password?.trim()) {
          adminForm.setFields([{ name: 'password', errors: ['请输入初始密码'] }]);
          return;
        }

        await adminsApi.create({
          ...buildUpdatePayload(values),
          password: values.password.trim(),
        } as AdminPayload & { password: string });
        messageApi.success('管理员账号已创建');
      }

      closeAdminModal();
      await loadData();
    } catch (err) {
      messageApi.error(getErrorMessage(err, editingAdmin ? '更新管理员失败' : '创建管理员失败'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAdmin = async (admin: AdminRecord) => {
    if (!canManageAdmins) {
      messageApi.warning('当前账号没有管理员账号管理权限');
      return;
    }

    try {
      setDeletingAdminId(admin.id);
      await adminsApi.delete(admin.id);
      messageApi.success('管理员账号已删除');
      await loadData();
    } catch (err) {
      messageApi.error(getErrorMessage(err, '删除管理员失败'));
    } finally {
      setDeletingAdminId(null);
    }
  };

  const openResetPasswordModal = (admin: AdminRecord) => {
    if (!canManageAdmins) {
      messageApi.warning('当前账号没有管理员账号管理权限');
      return;
    }

    setResetPasswordAdmin(admin);
    passwordForm.resetFields();
  };

  const handleResetPassword = async () => {
    if (!resetPasswordAdmin || !canManageAdmins) {
      return;
    }

    let values: ResetPasswordFormValues;
    try {
      values = await passwordForm.validateFields();
    } catch {
      return;
    }

    if (values.password !== values.confirmPassword) {
      passwordForm.setFields([{ name: 'confirmPassword', errors: ['两次输入的密码不一致'] }]);
      return;
    }

    try {
      setResetting(true);
      await adminsApi.resetPassword(resetPasswordAdmin.id, values.password.trim());
      messageApi.success('密码已重置，原登录会话已失效');
      setResetPasswordAdmin(null);
      passwordForm.resetFields();
    } catch (err) {
      messageApi.error(getErrorMessage(err, '重置密码失败'));
    } finally {
      setResetting(false);
    }
  };

  const applySearch = () => {
    setSearchValue(searchDraft.trim());
  };

  if (loading && admins.length === 0) {
    return (
      <div className={`${pageCls.page} ${pageCls.workPage}`}>
        {contextHolder}
        <PageHeader
          title="管理员账号"
          subtitle="维护后台登录账号、角色分配与密码重置。"
          extra={canManageAdmins ? <ActionButton icon={<PlusOutlined />} onClick={openCreateModal}>新增管理员</ActionButton> : null}
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
        title="管理员账号"
        subtitle="维护后台登录账号、角色分配与密码重置。"
        extra={canManageAdmins ? <ActionButton icon={<PlusOutlined />} onClick={openCreateModal}>新增管理员</ActionButton> : null}
      />

      <div className={pageCls.heroGrid}>
        {summaryStats.map((item) => (
          <StatCard key={item.title} {...item} icon={iconMap[item.icon]} />
        ))}
      </div>

      <SectionCard title="账号列表">
        <Spin spinning={loading}>
          <div className={pageCls.sectionContentStack}>
            <div className={pageCls.sectionSummaryRow}>
              <div className={pageCls.sectionSummaryText}>
                {searchValue ? `已按“${searchValue}”搜索，当前匹配 ${admins.length} 个后台账号。` : `当前共 ${admins.length} 个后台账号，角色决定后台菜单与操作权限。`}
              </div>
              <div className={pageCls.statusMetaWrap}>
                <span className={pageCls.sectionMetaPill}>角色控制权限</span>
                <span className={pageCls.sectionMetaPill}>重置密码会撤销旧会话</span>
              </div>
            </div>

            <div className={pageCls.toolbar}>
              <div className={`${pageCls.toolbarLeft} ${styles.adminFilters}`}>
                <Input
                  allowClear
                  className={pageCls.toolbarSearch}
                  prefix={<SearchOutlined />}
                  placeholder="搜索姓名、邮箱、手机号或角色"
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  onPressEnter={applySearch}
                />
                <Button className={pageCls.toolbarGhostAction} icon={<SearchOutlined />} onClick={applySearch}>查询</Button>
              </div>
            </div>

            {admins.length ? (
              <div className={pageCls.sectionListStack}>
                {admins.map((admin) => (
                  <article key={admin.id} className={styles.adminCard}>
                    <div className={styles.adminAvatar}>
                      <UserOutlined />
                    </div>

                    <div className={styles.adminMain}>
                      <div className={styles.adminHeader}>
                        <div>
                          <h3 className={styles.adminName}>{admin.displayName}</h3>
                          <div className={styles.adminEmail}>{admin.email}</div>
                        </div>
                        <span className={styles.rolePill}>{getAdminRoleLabel(admin)}</span>
                      </div>

                      <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small">
                        <Descriptions.Item label="手机号">{admin.phone || '-'}</Descriptions.Item>
                        <Descriptions.Item label="角色编码">{admin.role?.code || '-'}</Descriptions.Item>
                        <Descriptions.Item label="创建时间">{formatDateTime(admin.createdAt)}</Descriptions.Item>
                      </Descriptions>
                    </div>

                    {canManageAdmins ? (
                      <aside className={styles.adminActions}>
                        <Button className={pageCls.cardActionSecondary} icon={<EditOutlined />} onClick={() => openEditModal(admin)}>编辑</Button>
                        <Button className={pageCls.cardActionSecondary} icon={<KeyOutlined />} onClick={() => openResetPasswordModal(admin)}>重置密码</Button>
                        <Popconfirm
                          title="删除管理员账号"
                          description="删除后该账号将无法登录后台，确定继续吗？"
                          okText="删除"
                          cancelText="取消"
                          okButtonProps={{ danger: true }}
                          onConfirm={() => handleDeleteAdmin(admin)}
                        >
                          <Button
                            danger
                            className={pageCls.cardActionSecondary}
                            icon={<DeleteOutlined />}
                            loading={deletingAdminId === admin.id}
                            disabled={deletingAdminId !== null && deletingAdminId !== admin.id}
                          >
                            删除
                          </Button>
                        </Popconfirm>
                      </aside>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className={pageCls.sectionEmptyState}>
                <EmptyState
                  title="暂无管理员账号"
                  description="当前筛选条件下暂无账号。"
                  actionText={canManageAdmins ? '新增管理员' : undefined}
                  onAction={canManageAdmins ? openCreateModal : undefined}
                />
              </div>
            )}
          </div>
        </Spin>
      </SectionCard>

      <Modal
        className={pageCls.crudModal}
        title={editingAdmin ? '编辑管理员' : '新增管理员'}
        open={formOpen}
        width={CRUD_MODAL_WIDTH}
        onCancel={closeAdminModal}
        onOk={handleSaveAdmin}
        confirmLoading={saving}
        okText={editingAdmin ? '保存修改' : '新增'}
        cancelText="取消"
        destroyOnHidden
        forceRender
      >
        <Form form={adminForm} layout="vertical" className={pageCls.crudModalForm}>
          <Form.Item name="displayName" label="显示名称" rules={[{ required: true, whitespace: true, message: '请输入显示名称' }]}>
            <Input className={pageCls.settingsInput} placeholder="例如：门店前台" />
          </Form.Item>
          <Form.Item name="email" label="登录邮箱" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}>
            <Input className={pageCls.settingsInput} placeholder="admin@studio.com" />
          </Form.Item>
          <Form.Item name="phone" label="手机号">
            <Input className={pageCls.settingsInput} placeholder="可选" />
          </Form.Item>
          <Form.Item name="roleId" label="角色" rules={[{ required: true, message: '请选择角色' }]}>
            <Select className={pageCls.settingsInput} placeholder="请选择角色" options={roleOptions} />
          </Form.Item>
          {!editingAdmin ? (
            <Form.Item name="password" label="初始密码" rules={[{ required: true, min: 6, message: '请输入至少 6 位初始密码' }]}>
              <Input.Password className={pageCls.settingsInput} placeholder="至少 6 位" />
            </Form.Item>
          ) : null}
        </Form>
      </Modal>

      <Modal
        className={pageCls.crudModal}
        title={resetPasswordAdmin ? `重置密码：${resetPasswordAdmin.displayName}` : '重置密码'}
        open={Boolean(resetPasswordAdmin)}
        width={420}
        onCancel={() => {
          setResetPasswordAdmin(null);
          passwordForm.resetFields();
        }}
        onOk={handleResetPassword}
        confirmLoading={resetting}
        okText="确认重置"
        cancelText="取消"
        destroyOnHidden
      >
        <Form form={passwordForm} layout="vertical" className={pageCls.crudModalForm}>
          <Form.Item name="password" label="新密码" rules={[{ required: true, min: 6, message: '请输入至少 6 位新密码' }]}>
            <Input.Password className={pageCls.settingsInput} placeholder="至少 6 位" />
          </Form.Item>
          <Form.Item name="confirmPassword" label="确认新密码" rules={[{ required: true, message: '请再次输入新密码' }]}>
            <Input.Password className={pageCls.settingsInput} placeholder="再次输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
