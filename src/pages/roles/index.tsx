import { EditOutlined, EyeOutlined, SaveOutlined, SearchOutlined } from '@ant-design/icons';
import {
  App,
  Button,
  Drawer,
  Input,
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
import { NARROW_DETAIL_DRAWER_WIDTH, ROLE_PERMISSION_DRAWER_WIDTH } from '@/styles/dimensions';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import { getErrorMessage } from '@/utils/errors';
import roleCss from './index.module.css';

type RoleCode = 'OWNER' | 'FRONTDESK' | 'COACH' | 'FINANCE';

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
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [detailRole, setDetailRole] = useState<Role | null>(null);
  const [editingPermissionRole, setEditingPermissionRole] = useState<Role | null>(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  const [permissionSearch, setPermissionSearch] = useState('');
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

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

  const filteredPermissionGroups = useMemo(() => {
    const keyword = permissionSearch.trim().toLowerCase();
    return groupedPermissions
      .map(([moduleName, permissionList]) => [
        moduleName,
        permissionList.filter((permission) => {
          const moduleLabel = moduleNameMap[permission.module] || permission.module;
          const actionLabel = actionLabelMap[permission.action] || permission.action;
          const text = `${moduleLabel} ${actionLabel} ${permission.description || ''}`.toLowerCase();
          const matchesKeyword = !keyword || text.includes(keyword);
          const matchesSelection = !showSelectedOnly || selectedPermissionIds.includes(permission.id);
          return matchesKeyword && matchesSelection;
        }),
      ] as [string, Permission[]])
      .filter(([, permissionList]) => permissionList.length > 0);
  }, [groupedPermissions, permissionSearch, selectedPermissionIds, showSelectedOnly]);

  const openPermissionEditor = (role: Role) => {
    setEditingPermissionRole(role);
    setSelectedPermissionIds(role.permissions.map((rp) => rp.permission.id));
    setPermissionSearch('');
    setShowSelectedOnly(false);
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

  const handleSelectModulePermissions = (permissionIds: string[], checked: boolean) => {
    setSelectedPermissionIds((current) => {
      if (checked) {
        return Array.from(new Set([...current, ...permissionIds]));
      }
      return current.filter((id) => !permissionIds.includes(id));
    });
  };

  return (
    <div className={`${pageCls.page} ${pageCls.workPage}`}>
      <PageHeader
        title="角色与权限"
        subtitle="当前系统使用内置角色编码，支持维护每个角色的权限模板。"
      />

      <SectionCard title="角色列表" subtitle={`当前角色 ${roles.length} 个 · 权限实时同步后端`}>
        {loading ? (
          <div className={pageCls.centeredStatePadded}><Spin /></div>
        ) : roles.length ? (
          <div className={`${roleCss.roleGrid} ${pageCls.workSection}`}>
            {roles.map((item) => {
              const roleTone = (['mint', 'violet', 'orange', 'pink'] as const)[item.code === 'OWNER' ? 0 : item.code === 'FRONTDESK' ? 1 : item.code === 'COACH' ? 2 : 3];
              const initials = item.name.slice(0, 1);
              const roleStatus = item.permissions.length === 0 ? '待配置' : (item._count?.admins || 0) === 0 ? '未分配' : '正常';
              return (
                <div key={item.id} className={roleCss.roleCard}>
                  <div className={roleCss.roleCardHeader}>
                    <div className={roleCss.roleAvatar} data-tone={roleTone}>
                      {initials}
                    </div>
                    <div className={roleCss.roleInfo}>
                      <div className={roleCss.roleNameRow}>
                        <h3 className={roleCss.roleName}>{item.name}</h3>
                        <StatusTag status={roleStatus} />
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
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState title="暂无角色配置" description="请先初始化内置角色并分配权限。" />
        )}
      </SectionCard>

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
          <Input
            className={`${pageCls.settingsInput} ${pageCls.bottomSpaceMd}`}
            prefix={<SearchOutlined />}
            placeholder="搜索权限模块、动作或说明"
            value={permissionSearch}
            onChange={(event) => setPermissionSearch(event.target.value)}
          />
          <div className={pageCls.rowBetween}>
            <div className={widgetCls.smallText}>已选 {selectedPermissionIds.length} 项</div>
            <Button type={showSelectedOnly ? 'primary' : 'default'} size="small" className={showSelectedOnly ? pageCls.cardActionPrimary : pageCls.cardActionSecondary} onClick={() => setShowSelectedOnly((current) => !current)}>
              {showSelectedOnly ? '查看全部' : '仅看已选'}
            </Button>
          </div>

          {filteredPermissionGroups.length === 0 ? (
            <EmptyState title="暂无匹配权限" description="调整搜索条件后再试。" />
          ) : filteredPermissionGroups.map(([moduleName, permissionList]) => {
            const modulePermissionIds = permissionList.map((permission) => permission.id);
            const selectedCount = modulePermissionIds.filter((permissionId) => selectedPermissionIds.includes(permissionId)).length;

            return (
            <div key={moduleName} className={pageCls.rolePermissionBlock}>
              <div className={pageCls.rowBetween}>
                <div className={pageCls.rolePermissionTitle}>{moduleNameMap[moduleName] || moduleName}</div>
                <div className={roleCss.permissionModuleMeta}>
                  <span>{selectedCount}/{modulePermissionIds.length}</span>
                  {modulePermissionIds.length > 1 ? (
                    <>
                      <button type="button" className={roleCss.permissionMetaAction} onClick={() => handleSelectModulePermissions(modulePermissionIds, true)}>全选</button>
                      <button type="button" className={roleCss.permissionMetaAction} onClick={() => handleSelectModulePermissions(modulePermissionIds, false)}>清空</button>
                    </>
                  ) : null}
                </div>
              </div>
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
          );})}
        </div>
      </Drawer>

      <Drawer
        open={detailRole !== null}
        width={NARROW_DETAIL_DRAWER_WIDTH}
        title={detailRole?.name || '角色详情'}
        onClose={() => setDetailRole(null)}
      >
        {detailRole ? (
          <div className={pageCls.detailContentStack}>
            <div className={widgetCls.detailOverviewPanel}>
              <div className={widgetCls.detailOverviewSummary}>
                <div className={widgetCls.detailInsightLabel}>角色摘要</div>
                <div className={widgetCls.detailOverviewLead}>{detailRole.name}</div>
                <div className={widgetCls.detailOverviewText}>{detailRole.description || '暂无角色说明，可在角色设置中补充职责范围。'}</div>
              </div>
              <div className={widgetCls.detailOverviewStatGrid}>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatMint}`}>
                  <div className={widgetCls.detailInsightLabel}>角色类型</div>
                  <div className={`${widgetCls.detailOverviewStatValue} ${widgetCls.detailOverviewStatValueLarge}`}>
                    {roleCodeLabel[detailRole.code as RoleCode] || detailRole.code}
                  </div>
                </div>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatViolet}`}>
                  <div className={widgetCls.detailInsightLabel}>管理员人数</div>
                  <div className={widgetCls.detailOverviewStatValue}>{detailRole._count?.admins || 0} 人</div>
                </div>
                <div className={`${widgetCls.detailOverviewStatCard} ${widgetCls.detailOverviewStatOrange}`}>
                  <div className={widgetCls.detailInsightLabel}>权限数量</div>
                  <div className={widgetCls.detailOverviewStatValue}>{detailRole.permissions.length} 项</div>
                </div>
              </div>
            </div>

            <SectionCard title="权限摘要">
              {detailRole.permissions.length ? (
                <div className={pageCls.rolePermissionList}>
                  {detailRole.permissions.map(({ permission }) => {
                    const actionLabel = actionLabelMap[permission.action] || permission.action;
                    const moduleLabel = moduleNameMap[permission.module] || permission.module;
                    return (
                      <div key={permission.id} className={pageCls.rolePermissionItem}>
                        <div className={pageCls.rolePermissionText}>
                          <div className={pageCls.rolePermissionCode}>{actionLabel} {moduleLabel}</div>
                          <div className={pageCls.rolePermissionDesc}>{permission.description || '暂无描述'}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState title="暂无权限项" description="可在编辑权限中补充。" />
              )}
            </SectionCard>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
