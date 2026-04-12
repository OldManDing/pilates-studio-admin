import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import NotificationsPage from '@/pages/notifications';
import { membersApi } from '@/services/members';

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
      meta: { page: 1, pageSize: 100, total: 0, totalPages: 1 },
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
      <MemoryRouter>
        <App>
          <NotificationsPage />
        </App>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '通知管理' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /新建通知/ })).toBeInTheDocument();
      expect(screen.getByText('课程提醒')).toBeInTheDocument();
    }, { timeout: 20000 });

    fireEvent.click(screen.getByRole('button', { name: /新建通知/ }));

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: '新建通知' })).toBeInTheDocument();
      expect(screen.getByText('仅向当前选择对象发送。')).toBeInTheDocument();
      expect(membersApi.getAll).toHaveBeenCalledWith(1, 100, { search: undefined });
    }, { timeout: 20000 });
  }, 30000);
});
