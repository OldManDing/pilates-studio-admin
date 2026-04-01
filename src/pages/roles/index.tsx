import { PlusOutlined, SaveOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { App, Switch, Table } from 'antd';
import { useState } from 'react';
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

export default function RolesPage() {
  const [matrix, setMatrix] = useState(permissionMatrix);
  const { message } = App.useApp();

  const togglePermission = (rowKey: string, roleKey: 'owner' | 'frontdesk' | 'coach' | 'finance', checked: boolean) => {
    setMatrix((prev) => prev.map((item) => (item.key === rowKey ? { ...item, [roleKey]: checked } : item)));
  };

  const columns: ColumnsType<PermissionRow> = [
    {
      title: '功能模块',
      dataIndex: 'module',
      key: 'module',
      render: (value: string) => <strong>{value}</strong>
    },
    {
      title: '店长',
      dataIndex: 'owner',
      key: 'owner',
      align: 'center',
      render: (checked: boolean, record) => <Switch checked={checked} onChange={(value) => togglePermission(record.key, 'owner', value)} />
    },
    {
      title: '前台',
      dataIndex: 'frontdesk',
      key: 'frontdesk',
      align: 'center',
      render: (checked: boolean, record) => <Switch checked={checked} onChange={(value) => togglePermission(record.key, 'frontdesk', value)} />
    },
    {
      title: '教练',
      dataIndex: 'coach',
      key: 'coach',
      align: 'center',
      render: (checked: boolean, record) => <Switch checked={checked} onChange={(value) => togglePermission(record.key, 'coach', value)} />
    },
    {
      title: '财务',
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
          <ActionButton
            icon={<PlusOutlined />}
            onClick={() => message.info('演示模式：新增角色将在接入后端后开放。')}
          >
            新增角色
          </ActionButton>
        }
      />

      <SectionCard title="角色列表" subtitle="当前岗位分配与权限范围">
        {roleCards.length ? (
          <div className={cls.roleGrid}>
            {roleCards.map((item) => (
              <div key={item.key} className={widgetCls.settingBlock}>
                <div className={widgetCls.detailHeader}>
                  <div>
                    <h3 className={widgetCls.detailTitle}>{item.name}</h3>
                    <div className={widgetCls.smallText}>{item.users} 人使用</div>
                  </div>
                  <StatusTag status={item.status} />
                </div>
                <div className={widgetCls.smallText}>{item.description}</div>
                <div className={cls.scopeRow}>
                  {item.scopes.map((scope) => (
                    <span key={scope} className={widgetCls.chip}>
                      {scope}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="暂无角色配置" description="角色列表为空时，可在此统一创建岗位权限模板。" actionText="新增角色" onAction={() => message.info('演示模式：新增角色将在接入后端后开放。')} />
        )}
      </SectionCard>

      <SectionCard
        title="权限矩阵"
        subtitle="演示模式：可视化开关仅在前端生效，不会同步到后端。"
        extra={
          <ActionButton
            icon={<SaveOutlined />}
            onClick={() => message.success('演示模式：权限模板已在当前页面状态中保存。')}
          >
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
    </div>
  );
}
