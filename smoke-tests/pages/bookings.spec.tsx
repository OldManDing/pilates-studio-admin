import { render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AppLayout from '@/layouts';
import BookingsPage from '@/pages/bookings';
import ForbiddenPage from '@/pages/forbidden';

const mocks = vi.hoisted(() => ({
  getMe: vi.fn(),
  getAllBookings: vi.fn(),
  getBookingSummary: vi.fn(),
  getMemberOptions: vi.fn(),
  createBooking: vi.fn(),
  updateBookingStatus: vi.fn(),
  deleteBooking: vi.fn(),
}));

vi.mock('@/services/auth', () => ({
  authApi: {
    getMe: () => mocks.getMe(),
    logout: vi.fn(),
  },
  clearTokens: vi.fn(),
}));

vi.mock('@/services/courseSessions', () => ({
  courseSessionsApi: {
    getUpcoming: vi.fn().mockResolvedValue([
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
    getAll: (params?: unknown) => mocks.getAllBookings(params),
    getSummary: (params?: unknown) => mocks.getBookingSummary(params),
    getMemberOptions: () => mocks.getMemberOptions(),
    updateStatus: mocks.updateBookingStatus,
    create: mocks.createBooking,
    delete: mocks.deleteBooking,
  },
}));

describe('BookingsPage smoke test', () => {
  beforeEach(() => {
    mocks.getMe.mockResolvedValue({
      displayName: 'Owner',
      email: 'owner@example.com',
      role: {
        code: 'OWNER',
        permissions: ['*:*'],
      },
    });
    mocks.getAllBookings.mockReset();
    mocks.getBookingSummary.mockReset();
    mocks.getMemberOptions.mockReset();
    mocks.createBooking.mockReset();
    mocks.updateBookingStatus.mockReset();
    mocks.deleteBooking.mockReset();
    mocks.getAllBookings.mockResolvedValue({
      data: [
        {
          id: 'booking-1',
          bookingCode: 'B00000001',
          memberId: 'member-1',
          sessionId: 'session-1',
          status: 'CONFIRMED',
          source: 'ADMIN',
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
    });
    mocks.getBookingSummary.mockResolvedValue({
      todayCount: 1,
      weekTotal: 1,
      pendingCount: 0,
      confirmedCount: 1,
      completedCount: 0,
      cancelledCount: 0,
      noShowCount: 0,
    });
    mocks.getMemberOptions.mockResolvedValue([
      { id: 'member-1', name: '林若溪', phone: '13800000000', status: 'ACTIVE' },
    ]);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders bookings page shell with simplified list data', async () => {
    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <App>
          <BookingsPage />
        </App>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '预约管理' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /新增预约/ })).toBeInTheDocument();
      expect(screen.getByText('今日预约')).toBeInTheDocument();
      expect(screen.getByText('课程')).toBeInTheDocument();
      expect(screen.getByText('上课时间')).toBeInTheDocument();
    }, { timeout: 15000 });

    expect(screen.getByText('林若溪')).toBeInTheDocument();
    expect(screen.getByText('Morning Flow')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /签到/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /查看详情/ })).toHaveLength(1);
    expect(screen.queryByText('预约时间')).not.toBeInTheDocument();
    expect(screen.queryByText('预约来源')).not.toBeInTheDocument();
    expect(screen.queryByText('预约于')).not.toBeInTheDocument();
  }, 20000);

  it('does not duplicate view-detail actions for terminal bookings', async () => {
    mocks.getAllBookings.mockResolvedValueOnce({
      data: [
        {
          id: 'booking-1',
          bookingCode: 'B00000001',
          memberId: 'member-1',
          sessionId: 'session-1',
          status: 'COMPLETED',
          source: 'ADMIN',
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
    });

    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <App>
          <BookingsPage />
        </App>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('林若溪')).toBeInTheDocument();
    }, { timeout: 15000 });

    expect(screen.getAllByRole('button', { name: /查看详情/ })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /签到/ })).not.toBeInTheDocument();
  }, 20000);

  it('does not expose booking write actions to read-only users', async () => {
    localStorage.setItem('pilates_access_token', 'access-token');
    mocks.getMe.mockResolvedValue({
      displayName: 'Front Desk Readonly',
      email: 'frontdesk-readonly@example.com',
      role: {
        code: 'FRONTDESK',
        permissions: ['READ:BOOKINGS'],
      },
    });

    render(
      <MemoryRouter initialEntries={['/bookings']} future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <App>
          <Routes>
            <Route path="/bookings" element={<AppLayout><BookingsPage /></AppLayout>} />
            <Route path="/403" element={<ForbiddenPage />} />
          </Routes>
        </App>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '预约管理' })).toBeInTheDocument();
      expect(screen.getByText('林若溪')).toBeInTheDocument();
    }, { timeout: 15000 });

    expect(screen.queryByRole('button', { name: /新增预约/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /签到/ })).not.toBeInTheDocument();
  }, 20000);
});
