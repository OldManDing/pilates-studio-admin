import { render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import CoachesPage from '@/pages/coaches';

vi.mock('@/services/coaches', () => ({
  coachesApi: {
    getAll: vi.fn().mockResolvedValue([
      {
        id: 'coach-1',
        coachCode: 'C000001',
        name: '李静',
        phone: '13800000000',
        status: 'ACTIVE',
        specialties: [{ value: 'Reformer' }],
        certificates: [],
      },
    ]),
    getStats: vi.fn().mockResolvedValue({ stats: { totalSessions: 8 } }),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('CoachesPage smoke test', () => {
  it('renders coaches page shell with mocked data', async () => {
    render(
      <MemoryRouter>
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
  });
});
