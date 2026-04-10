import { render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import CoursesPage from '@/pages/courses';

vi.mock('@/services/reports', () => ({
  reportsApi: {
    getBookings: vi.fn().mockResolvedValue({ totalBookings: 10, confirmedBookings: 8 }),
  },
}));

vi.mock('@/services/coaches', () => ({
  coachesApi: {
    getAll: vi.fn().mockResolvedValue([{ id: 'coach-1', name: '李静' }]),
  },
}));

vi.mock('@/services/courses', () => ({
  coursesApi: {
    getAll: vi.fn().mockResolvedValue([
      {
        id: 'course-1',
        name: 'Morning Flow',
        type: 'Reformer',
        level: '初级',
        durationMinutes: 50,
        capacity: 8,
        isActive: true,
        coach: { id: 'coach-1', name: '李静' },
        _count: { sessions: 4 },
      },
    ]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('CoursesPage smoke test', () => {
  it('renders courses page shell with mocked data', async () => {
    render(
      <MemoryRouter>
        <App>
          <CoursesPage />
        </App>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '课程管理' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /新增课程/ })).toBeInTheDocument();
      expect(screen.getByText('课程总数')).toBeInTheDocument();
    });
  });
});
