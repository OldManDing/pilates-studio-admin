import type { ReactNode } from 'react';
import {
  AppstoreOutlined,
  CalendarOutlined,
  FundProjectionScreenOutlined,
  SettingOutlined,
  TeamOutlined,
  UsergroupAddOutlined,
  BarChartOutlined,
  WalletOutlined
} from '@ant-design/icons';

export type MenuItem = {
  key: string;
  label: string;
  icon: ReactNode;
  description: string;
};

export const menuItems: MenuItem[] = [
  { key: '/dashboard', label: '仪表盘', icon: <AppstoreOutlined />, description: '运营总览与今日动态' },
  { key: '/members', label: '会员管理', icon: <UsergroupAddOutlined />, description: '会籍、状态与生命周期' },
  { key: '/courses', label: '课程管理', icon: <CalendarOutlined />, description: '课程设置与排期' },
  { key: '/bookings', label: '预约管理', icon: <FundProjectionScreenOutlined />, description: '预约确认与签到' },
  { key: '/coaches', label: '教练管理', icon: <TeamOutlined />, description: '教练资料、专长与排班' },
  { key: '/finance', label: '财务报表', icon: <WalletOutlined />, description: '营收、支出与交易' },
  { key: '/analytics', label: '数据分析', icon: <BarChartOutlined />, description: '趋势、留存与表现分析' },
  { key: '/settings', label: '系统设置', icon: <SettingOutlined />, description: '门店、通知与安全配置' }
];
