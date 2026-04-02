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
          colorPrimary: '#47b29b',
          colorSuccess: '#4db99f',
          colorWarning: '#efb169',
          colorError: '#ef8ba0',
          colorInfo: '#8878ee',
          borderRadius: 18,
          borderRadiusLG: 24,
          fontSize: 15,
          fontFamily:
            'Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          colorBgLayout: '#faf8f4',
          colorBgContainer: '#fffdfb',
          colorText: '#23313b'
        }
      }}
    >
      <AntdApp>{container}</AntdApp>
    </ConfigProvider>
  );
}
