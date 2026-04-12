import type { ReactNode } from 'react';
import {
  AppstoreOutlined,
  SafetyCertificateOutlined,
  CalendarOutlined,
  BarChartOutlined,
  FundProjectionScreenOutlined,
  SettingOutlined,
  TeamOutlined,
  UsergroupAddOutlined,
  WalletOutlined
} from '@ant-design/icons';

export type MenuItem = {
  key: string;
  label: string;
  icon: ReactNode;
  description: string;
  group: 'operations' | 'insights' | 'admin';
};

export const isOwnerOnlyPath = (path: string) => path === '/roles';

export const menuItems: MenuItem[] = [
  { key: '/dashboard', label: '仪表盘', icon: <AppstoreOutlined />, description: '运营总览与今日动态', group: 'operations' },
  { key: '/members', label: '会员管理', icon: <UsergroupAddOutlined />, description: '会籍、状态与生命周期', group: 'operations' },
  { key: '/courses', label: '课程管理', icon: <CalendarOutlined />, description: '课程设置与排期', group: 'operations' },
  { key: '/bookings', label: '预约管理', icon: <FundProjectionScreenOutlined />, description: '预约确认与签到', group: 'operations' },
  { key: '/coaches', label: '教练管理', icon: <TeamOutlined />, description: '教练资料、专长与排班', group: 'operations' },
  { key: '/finance', label: '财务报表', icon: <WalletOutlined />, description: '营收、支出与交易', group: 'insights' },
  { key: '/analytics', label: '数据分析', icon: <BarChartOutlined />, description: '趋势、热度与留存洞察', group: 'insights' },
  { key: '/roles', label: '角色权限', icon: <SafetyCertificateOutlined />, description: '角色分工与权限策略', group: 'admin' },
  { key: '/settings', label: '系统设置', icon: <SettingOutlined />, description: '门店、通知与安全配置', group: 'admin' }
];
