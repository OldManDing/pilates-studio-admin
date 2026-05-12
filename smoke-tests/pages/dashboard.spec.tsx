import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from '@/pages/dashboard';
import { TodayCoursePanel } from '@/pages/dashboard/components';

vi.mock('@/services/reports', () => ({
  reportsApi: {
    getMembers: vi.fn().mockResolvedValue({
      totalMembers: 24,
      activeMembers: 18,
      newMembersThisMonth: 3,
    }),
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
        isActive: true,
        _count: { sessions: 4 },
        coach: { id: 'coach-1', name: '李静' },
      },
    ]),
  },
}));

vi.mock('@/services/coaches', () => ({
  coachesApi: {
    getAll: vi.fn().mockResolvedValue([{ id: 'coach-1', name: '李静', status: 'ACTIVE', rating: 4.8 }]),
  },
}));

vi.mock('@/services/bookings', () => ({
  bookingsApi: {
    getAll: vi.fn().mockResolvedValue({
      data: [
        {
          id: 'booking-1',
          status: 'CONFIRMED',
          session: {
            startsAt: '2026-04-10T08:00:00.000Z',
            endsAt: '2026-04-10T08:50:00.000Z',
            course: { name: 'Morning Flow' },
            coach: { name: '李静' },
          },
        },
      ],
      meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
    }),
  },
}));

vi.mock('@/services/transactions', () => ({
  transactionsApi: {
    getSummary: vi.fn().mockResolvedValue({
      totalRevenueCents: 1280000,
      pendingAmountCents: 0,
      refundedAmountCents: 0,
      todayRevenueCents: 180000,
    }),
  },
}));

describe('DashboardPage smoke test', () => {
  it('renders core dashboard sections with mocked data', async () => {
    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <App>
          <DashboardPage />
        </App>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('今日执行队列')).toBeInTheDocument();
      expect(screen.getByText('异常优先处理')).toBeInTheDocument();
      expect(screen.getByText('待确认排队')).toBeInTheDocument();
      expect(screen.getByText('运营诊断')).toBeInTheDocument();
      expect(screen.getByText('活跃率')).toBeInTheDocument();
      expect(screen.getByText('近期排程')).toBeInTheDocument();
    });
  });

  it('routes confirmed execution tasks to attendance check-in instead of booking management', () => {
    const onViewDetail = vi.fn();

    render(
      <App>
        <TodayCoursePanel
          items={[
            {
              id: 'booking-1',
              title: 'Morning Flow',
              timeText: '10:00 - 10:50',
              participantText: '会员 林若溪',
              coachName: '李静',
              locationText: '小程序预约',
              statusText: '已确认',
              queueHintText: '跟进签到与到课执行',
              actionText: '去签到核销',
              actionPath: '/attendance',
            },
          ]}
          onViewDetail={onViewDetail}
        />
      </App>,
    );

    const actionButton = screen.getByText('去签到核销').closest('button');
    expect(actionButton).not.toBeNull();

    fireEvent.click(actionButton!);

    expect(onViewDetail).toHaveBeenCalledWith('booking-1', '/attendance');
  });
});
