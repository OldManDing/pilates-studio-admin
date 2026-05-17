import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import NotificationsPage from '@/pages/notifications';
import { membersApi } from '@/services/members';

vi.mock('@/services/auth', () => ({
  authApi: {
    getMe: vi.fn().mockResolvedValue({
      id: 'admin-1',
      email: 'owner@pilates.com',
      displayName: 'Owner',
      role: {
        id: 'role-1',
        code: 'OWNER',
        name: 'Owner',
        permissions: ['READ:NOTIFICATIONS', 'WRITE:NOTIFICATIONS', 'READ:ADMINS', 'WRITE:MEMBERS', 'WRITE:MINI_USERS'],
      },
    }),
  },
}));

vi.mock('@/services/members', () => ({
  membersApi: {
    getAll: vi.fn().mockResolvedValue({
      data: [
        {
          id: 'member-1',
          memberCode: 'M000001',
          name: '林若溪',
          phone: '13800000000',
          email: 'lin@example.com',
          status: 'ACTIVE',
          joinedAt: '2026-04-01T08:00:00.000Z',
          remainingCredits: 12,
        },
      ],
      meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
    }),
  },
}));

vi.mock('@/services/miniUsers', () => ({
  miniUsersApi: {
    getAll: vi.fn().mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 500, total: 0, totalPages: 1 },
    }),
  },
}));

vi.mock('@/services/admins', () => ({
  adminsApi: {
    getAll: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/services/notifications', () => ({
  notificationsApi: {
    getAll: vi.fn().mockResolvedValue({
      data: [
        {
          id: 'notification-1',
          channel: 'INTERNAL',
          status: 'PENDING',
          type: 'BOOKING_REMINDER',
          title: '课程提醒',
          content: '您预约的课程将在 1 小时后开始。',
          memberId: 'member-1',
          miniUserId: null,
          adminUserId: null,
          member: { id: 'member-1', name: '林若溪', memberCode: 'M000001', phone: '13800000000' },
          miniUser: null,
          adminUser: null,
          payload: {
            bookingId: 'booking-1',
            sessionId: 'session-1',
            courseName: '普拉提私教课',
            startsAt: '2026-04-11T10:00:00.000Z',
            page: 'pages/my-bookings/index',
          },
          sentAt: null,
          readAt: null,
          createdAt: '2026-04-11T08:00:00.000Z',
          updatedAt: '2026-04-11T08:00:00.000Z',
        },
      ],
      meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    }),
    getById: vi.fn().mockResolvedValue({
      id: 'notification-1',
      channel: 'INTERNAL',
      status: 'PENDING',
      type: 'BOOKING_REMINDER',
      title: '课程提醒',
      content: '您预约的课程将在 1 小时后开始。',
      memberId: 'member-1',
      miniUserId: null,
      adminUserId: null,
      member: { id: 'member-1', name: '林若溪', memberCode: 'M000001', phone: '13800000000' },
      miniUser: null,
      adminUser: null,
      sentAt: null,
      readAt: null,
      createdAt: '2026-04-11T08:00:00.000Z',
      updatedAt: '2026-04-11T08:00:00.000Z',
    }),
    create: vi.fn(),
    markAsRead: vi.fn().mockResolvedValue({
      id: 'notification-1',
      channel: 'INTERNAL',
      status: 'READ',
      type: 'BOOKING_REMINDER',
      title: '课程提醒',
      content: '您预约的课程将在 1 小时后开始。',
      memberId: 'member-1',
      miniUserId: null,
      adminUserId: null,
      member: { id: 'member-1', name: '林若溪', memberCode: 'M000001', phone: '13800000000' },
      miniUser: null,
      adminUser: null,
      sentAt: null,
      readAt: '2026-04-11T09:00:00.000Z',
      createdAt: '2026-04-11T08:00:00.000Z',
      updatedAt: '2026-04-11T09:00:00.000Z',
    }),
  },
}));

describe('NotificationsPage smoke test', () => {
  it('renders notifications management shell with searchable recipient picker', async () => {
    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <App>
          <NotificationsPage />
        </App>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '通知管理' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /新建通知/ })).toBeInTheDocument();
      expect(screen.getAllByText('课程提醒').length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText(/课程：普拉提私教课/)).toBeInTheDocument();
      expect(screen.queryByText(/booking-1/)).not.toBeInTheDocument();
      expect(screen.queryByText(/session-1/)).not.toBeInTheDocument();
    }, { timeout: 20000 });

    fireEvent.click(screen.getByRole('button', { name: /新建通知/ }));

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: '新建通知' })).toBeInTheDocument();
      expect(screen.getByText('仅向当前选择对象发送。')).toBeInTheDocument();
      expect(membersApi.getAll).toHaveBeenCalledWith(1, 100, { search: undefined });
    }, { timeout: 20000 });
  }, 30000);
});
