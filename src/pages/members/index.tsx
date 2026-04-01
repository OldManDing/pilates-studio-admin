import { DownloadOutlined, FilterOutlined, PlusOutlined, SearchOutlined, TeamOutlined, ThunderboltOutlined, UserAddOutlined, WarningOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Input, Space, Table } from 'antd';
import ActionButton from '@/components/ActionButton';
import MemberAvatar from '@/components/MemberAvatar';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import StatusTag from '@/components/StatusTag';
import pageCls from '@/styles/page.module.css';
import { membersStats, membersTable } from '@/mock';

const iconMap = {
  team: <TeamOutlined />,
  flash: <ThunderboltOutlined />,
  plus: <UserAddOutlined />,
  alert: <WarningOutlined />
};

type MemberRow = (typeof membersTable)[number];

const columns: ColumnsType<MemberRow> = [
  {
    title: '会员姓名',
    dataIndex: 'name',
    key: 'name',
    render: (_, record) => (
      <Space>
        <MemberAvatar name={record.name} tone={record.tone} />
        <span className={pageCls.membersName}>{record.name}</span>
      </Space>
    )
  },
  {
    title: '联系方式',
    key: 'contact',
    render: (_, record) => (
      <div>
        <div>{record.phone}</div>
        <div className={pageCls.membersSubtext}>{record.email}</div>
      </div>
    )
  },
  { title: '会籍类型', dataIndex: 'membership', key: 'membership' },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    render: (status) => <StatusTag status={status} />
  },
  { title: '剩余课时', dataIndex: 'remaining', key: 'remaining', render: (value) => <strong>{value}</strong> },
  { title: '加入日期', dataIndex: 'joinedAt', key: 'joinedAt' },
  { title: '操作', key: 'actions', render: () => <button type="button" className={pageCls.membersAction}>查看详情</button> }
];

export default function MembersPage() {
  return (
    <div className={pageCls.page}>
      <PageHeader
        title="会员管理"
        subtitle="管理所有会员信息和会籍状态。"
        extra={<ActionButton icon={<PlusOutlined />}>添加会员</ActionButton>}
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
            prefix={<SearchOutlined />}
            placeholder="按会员姓名、手机号或邮箱搜索"
          />
        </div>
        <div className={pageCls.toolbarRight}>
          <ActionButton icon={<FilterOutlined />} ghost>筛选</ActionButton>
          <ActionButton icon={<DownloadOutlined />} ghost>导出</ActionButton>
        </div>
      </div>

      <div className={pageCls.surface} style={{ padding: 20 }}>
        <Table<MemberRow>
          className={pageCls.membersTable}
          rowKey="key"
          columns={columns}
          dataSource={membersTable}
          pagination={{ pageSize: 5, hideOnSinglePage: true }}
        />
      </div>
    </div>
  );
}
