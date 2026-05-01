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
  requiredPermissions?: string[];
};

export const isOwnerOnlyPath = (path: string) => path === '/roles';

export const routePermissionMap: Record<string, string[]> = {
  '/members': ['READ:MEMBERS'],
  '/courses': ['READ:COURSES'],
  '/bookings': ['READ:BOOKINGS'],
  '/coaches': ['READ:COACHES'],
  '/notifications': ['READ:NOTIFICATIONS'],
  '/finance': ['READ:TRANSACTIONS'],
  '/analytics': ['READ:ANALYTICS'],
  '/roles': ['READ:ROLES'],
  '/settings': ['READ:SETTINGS'],
  '/admins': ['READ:ADMINS'],
};

export const hasRequiredPermissions = (userPermissions: string[] = [], requiredPermissions?: string[]) => {
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }

  return requiredPermissions.every((permission) => {
    const [action, module] = permission.split(':');
    return userPermissions.some((userPermission) => {
      const [userAction, userModule] = userPermission.split(':');
      return (
        (userAction === '*' || userAction === action) &&
        (userModule === '*' || userModule === module)
      );
    });
  });
};

export const menuItems: MenuItem[] = [
  { key: '/dashboard', label: '仪表盘', icon: <AppstoreOutlined />, description: '运营总览与今日动态', group: 'operations' },
  { key: '/members', label: '会员管理', icon: <UsergroupAddOutlined />, description: '会籍、状态与生命周期', group: 'operations', requiredPermissions: ['READ:MEMBERS'] },
  { key: '/courses', label: '课程管理', icon: <CalendarOutlined />, description: '课程设置与排期', group: 'operations', requiredPermissions: ['READ:COURSES'] },
  { key: '/bookings', label: '预约管理', icon: <FundProjectionScreenOutlined />, description: '预约确认与签到', group: 'operations', requiredPermissions: ['READ:BOOKINGS'] },
  { key: '/coaches', label: '教练管理', icon: <TeamOutlined />, description: '教练资料、专长与排班', group: 'operations', requiredPermissions: ['READ:COACHES'] },
  { key: '/notifications', label: '通知管理', icon: <SafetyCertificateOutlined />, description: '发送、跟踪与已读状态', group: 'operations', requiredPermissions: ['READ:NOTIFICATIONS'] },
  { key: '/finance', label: '财务报表', icon: <WalletOutlined />, description: '营收、支出与交易', group: 'insights', requiredPermissions: ['READ:TRANSACTIONS'] },
  { key: '/analytics', label: '数据分析', icon: <BarChartOutlined />, description: '趋势、热度与留存洞察', group: 'insights', requiredPermissions: ['READ:ANALYTICS'] },
  { key: '/roles', label: '角色权限', icon: <SafetyCertificateOutlined />, description: '角色分工与权限策略', group: 'admin', requiredPermissions: ['READ:ROLES'] },
  { key: '/settings', label: '系统设置', icon: <SettingOutlined />, description: '门店、通知与安全配置', group: 'admin', requiredPermissions: ['READ:SETTINGS'] }
];
