import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AppLayout from '@/layouts';
import CoachesPage from '@/pages/coaches';
import ForbiddenPage from '@/pages/forbidden';

const mocks = vi.hoisted(() => ({
  coachResponse: {
    data: [
      {
        id: 'coach-1',
        coachCode: 'C000001',
        name: '李静',
        phone: '13800000000',
        avatarUrl: 'data:image/png;base64,coach',
        status: 'ACTIVE',
        experience: '5 年普拉提教学经验',
        rating: 4.8,
        specialties: [{ value: 'Reformer' }],
        certificates: [],
      },
    ],
    meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
  },
  getMe: vi.fn(),
  getPaged: vi.fn(),
  createCoach: vi.fn(),
  updateCoach: vi.fn(),
  deleteCoach: vi.fn(),
}));

vi.mock('@/services/auth', () => ({
  authApi: {
    getMe: () => mocks.getMe(),
    logout: vi.fn(),
  },
  clearTokens: vi.fn(),
}));

vi.mock('@/services/coaches', () => ({
  coachesApi: {
    getPaged: (params?: unknown) => mocks.getPaged(params),
    getAll: vi.fn().mockResolvedValue(mocks.coachResponse.data),
    getStats: vi.fn().mockResolvedValue({ stats: { totalSessions: 8 } }),
    create: mocks.createCoach,
    update: mocks.updateCoach,
    delete: mocks.deleteCoach,
  },
}));

describe('CoachesPage smoke test', () => {
  beforeEach(() => {
    mocks.getMe.mockResolvedValue({
      displayName: 'Owner',
      email: 'owner@example.com',
      role: {
        code: 'OWNER',
        permissions: ['*:*'],
      },
    });
    mocks.getPaged.mockResolvedValue(mocks.coachResponse);
    mocks.createCoach.mockReset();
    mocks.updateCoach.mockReset();
    mocks.deleteCoach.mockReset();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders coaches page shell with mocked data', async () => {
    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <App>
          <CoachesPage />
        </App>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '教练管理' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /新增教练/ })).toBeInTheDocument();
      expect(screen.getByText('李静')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /新增教练/ }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /上传教练照片/ })).toBeInTheDocument();
      expect(screen.getByText('支持 JPG、PNG、WebP 等图片，大小不超过 5MB。')).toBeInTheDocument();
    });
  });

  it('does not expose coach write or manage actions to read-only users', async () => {
    localStorage.setItem('pilates_access_token', 'access-token');
    mocks.getMe.mockResolvedValue({
      displayName: 'Coach Readonly',
      email: 'coach-readonly@example.com',
      role: {
        code: 'FRONTDESK',
        permissions: ['READ:COACHES'],
      },
    });

    render(
      <MemoryRouter initialEntries={['/coaches']} future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <App>
          <Routes>
            <Route path="/coaches" element={<AppLayout><CoachesPage /></AppLayout>} />
            <Route path="/403" element={<ForbiddenPage />} />
          </Routes>
        </App>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '教练管理' })).toBeInTheDocument();
      expect(screen.getByText('李静')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /新增教练/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /编辑资料/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /查看详情/ }));

    await waitFor(() => {
      expect(screen.getAllByText('教练档案').length).toBeGreaterThan(0);
    });
    expect(screen.queryByRole('button', { name: /^编辑$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^删除$/ })).not.toBeInTheDocument();
  }, 20000);
});
