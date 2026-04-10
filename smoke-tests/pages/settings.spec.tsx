import { render, screen } from '@testing-library/react';
import { App } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import SettingsPage from '@/pages/settings';

vi.mock('@/services/settings', () => ({
  settingsApi: {
    getStudio: vi.fn().mockResolvedValue({
      studioName: 'Pilates Studio',
      phone: '400-820-8899',
      email: 'hello@pilates.com',
      businessHours: '06:00-22:00',
      address: '上海市静安区愚园路168号',
    }),
    getNotifications: vi.fn().mockResolvedValue([
      { key: 'BOOKING_CREATED', label: '预约创建提醒', enabled: true },
    ]),
    initialize: vi.fn(),
    updateStudio: vi.fn(),
    updateNotification: vi.fn(),
    backupData: vi.fn(),
    exportData: vi.fn(),
    restoreData: vi.fn(),
  },
}));

vi.mock('@/services/auth', () => ({
  authApi: {
    getTwoFactorStatus: vi.fn().mockResolvedValue({ enabled: false, hasSecret: false }),
    changePassword: vi.fn(),
    generateTwoFactorSecret: vi.fn(),
    verifyTwoFactor: vi.fn(),
    disableTwoFactor: vi.fn(),
  },
}));

describe('SettingsPage smoke test', () => {
  it('renders settings page shell with mocked data', async () => {
    render(
      <MemoryRouter>
        <App>
          <SettingsPage />
        </App>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '系统设置' })).toBeInTheDocument();
    expect(await screen.findByText('门店信息')).toBeInTheDocument();
    expect(await screen.findByText('通知设置')).toBeInTheDocument();
  });
});
