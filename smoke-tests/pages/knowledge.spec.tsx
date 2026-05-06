import { render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import KnowledgePage from '@/pages/knowledge';

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
        permissions: ['READ:KNOWLEDGE', 'WRITE:KNOWLEDGE', 'MANAGE:KNOWLEDGE'],
      },
    }),
  },
}));

vi.mock('@/services/knowledge', () => ({
  knowledgeApi: {
    getAll: vi.fn().mockResolvedValue({
      data: [
        {
          id: 'knowledge-1',
          category: 'booking',
          question: '如何取消预约？',
          answer: '课程开始前可在我的预约中取消。',
          sortOrder: 10,
          isActive: true,
          createdAt: '2026-04-01T08:00:00.000Z',
          updatedAt: '2026-04-01T08:00:00.000Z',
        },
      ],
      meta: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    }),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('KnowledgePage smoke test', () => {
  it('renders knowledge management shell with mocked data', async () => {
    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <App>
          <KnowledgePage />
        </App>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '帮助知识库' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /新增知识/ })).toBeInTheDocument();
      expect(screen.getByText('如何取消预约？')).toBeInTheDocument();
      expect(screen.getByText('预约相关')).toBeInTheDocument();
    }, { timeout: 20000 });
  }, 30000);
});
