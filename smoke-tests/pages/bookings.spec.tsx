import { render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import BookingsPage from '@/pages/bookings';

vi.mock('@/services/members', () => ({
  membersApi: {
    getAll: vi.fn().mockResolvedValue({ data: [{ id: 'member-1', name: '林若溪', phone: '13800000000' }], meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 } }),
  },
}));

vi.mock('@/services/courseSessions', () => ({
  courseSessionsApi: {
    getAll: vi.fn().mockResolvedValue([
      {
        id: 'session-1',
        course: { id: 'course-1', name: 'Morning Flow' },
        coach: { id: 'coach-1', name: '李静' },
        startsAt: '2026-04-10T08:00:00.000Z',
        endsAt: '2026-04-10T08:50:00.000Z',
      },
    ]),
  },
}));

vi.mock('@/services/bookings', () => ({
  bookingsApi: {
    getAll: vi.fn().mockResolvedValue({
      data: [
        {
          id: 'booking-1',
          bookingCode: 'B00000001',
          status: 'CONFIRMED',
          bookedAt: '2026-04-10T07:00:00.000Z',
          member: { id: 'member-1', name: '林若溪', phone: '13800000000' },
          session: {
            id: 'session-1',
            startsAt: '2026-04-10T08:00:00.000Z',
            endsAt: '2026-04-10T08:50:00.000Z',
            course: { id: 'course-1', name: 'Morning Flow' },
            coach: { id: 'coach-1', name: '李静' },
          },
        },
      ],
      meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
    }),
    updateStatus: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('BookingsPage smoke test', () => {
  it('renders bookings page shell with mocked data', async () => {
    render(
      <MemoryRouter>
        <App>
          <BookingsPage />
        </App>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '预约管理' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /新增预约/ })).toBeInTheDocument();
      expect(screen.getByText('今日预约')).toBeInTheDocument();
    });
  });
});
