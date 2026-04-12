import type { ReactNode } from 'react';
import { ConfigProvider, App as AntdApp, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import './styles/global.css';

export function rootContainer(container: ReactNode) {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#53bfa8',
          colorSuccess: '#53bfa8',
          colorWarning: '#efb169',
          colorError: '#eb96ad',
          colorInfo: '#8878ee',
          borderRadiusSM: 12,
          borderRadius: 16,
          borderRadiusLG: 24,
          fontSize: 15,
          fontFamily:
            'Inter, "Noto Sans SC", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          colorBgLayout: '#faf8f4',
          colorBgContainer: '#fffdfa',
          colorBgElevated: '#fffdfb',
          colorText: '#23313b',
          colorTextSecondary: '#6d7683',
          colorTextTertiary: '#98a2b3',
          colorBorderSecondary: 'rgba(15, 23, 42, 0.08)',
          boxShadowSecondary: '0 18px 38px rgba(18, 38, 63, 0.11)',
        },
      }}
    >
      <AntdApp>{container}</AntdApp>
    </ConfigProvider>
  );
}
