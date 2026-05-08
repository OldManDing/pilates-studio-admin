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
        courseCode: 'C001',
        name: 'Morning Flow',
        type: 'Reformer Pilates',
        level: '初级',
        durationMinutes: 50,
        capacity: 8,
        isActive: true,
        coach: { id: 'coach-1', name: '李静' },
        _count: { sessions: 4 },
      },
    ]),
    getPaged: vi.fn().mockResolvedValue({
      data: [
        {
          id: 'course-1',
          courseCode: 'C001',
          name: 'Morning Flow',
          type: 'Reformer Pilates',
          level: '初级',
          durationMinutes: 50,
          capacity: 8,
          isActive: true,
          coach: { id: 'coach-1', name: '李静' },
          _count: { sessions: 4 },
        },
      ],
      meta: {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      },
    }),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('CoursesPage smoke test', () => {
  it('renders courses page shell with mocked data', async () => {
    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <App>
          <CoursesPage />
        </App>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '课程管理' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /新增课程/ })).toBeInTheDocument();
      expect(screen.getByText('课程总数')).toBeInTheDocument();
      expect(screen.getByText('核心床普拉提')).toBeInTheDocument();
      expect(screen.getByText('上传课程图片')).toBeInTheDocument();
    });
  });
});
