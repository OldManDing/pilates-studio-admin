import type { CSSProperties, FC } from 'react';
import { Tag } from 'antd';

const colorMap: Record<string, { color: string; bg: string }> = {
  正常: { color: 'var(--text-mint)', bg: 'var(--mint-soft)' },
  ACTIVE: { color: 'var(--text-mint)', bg: 'var(--mint-soft)' },
  已确认: { color: 'var(--text-mint)', bg: 'var(--mint-soft)' },
  CONFIRMED: { color: 'var(--text-mint)', bg: 'var(--mint-soft)' },
  已完成: { color: 'var(--text-violet)', bg: 'var(--violet-soft)' },
  COMPLETED: { color: 'var(--text-violet)', bg: 'var(--violet-soft)' },
  待确认: { color: 'var(--text-orange)', bg: 'var(--orange-soft)' },
  PENDING: { color: 'var(--text-orange)', bg: 'var(--orange-soft)' },
  待激活: { color: 'var(--text-orange)', bg: 'var(--orange-soft)' },
  PROCESSING: { color: 'var(--text-orange)', bg: 'var(--orange-soft)' },
  已取消: { color: 'var(--text-pink)', bg: 'var(--pink-soft)' },
  CANCELLED: { color: 'var(--text-pink)', bg: 'var(--pink-soft)' },
  已发送: { color: 'var(--text-violet)', bg: 'var(--violet-soft)' },
  SENT: { color: 'var(--text-violet)', bg: 'var(--violet-soft)' },
  已读: { color: 'var(--text-mint)', bg: 'var(--mint-soft)' },
  READ: { color: 'var(--text-mint)', bg: 'var(--mint-soft)' },
  失败: { color: 'var(--text-pink)', bg: 'var(--pink-soft)' },
  FAILED: { color: 'var(--text-pink)', bg: 'var(--pink-soft)' },
  NO_SHOW: { color: 'var(--text-pink)', bg: 'var(--pink-soft)' },
  已满: { color: 'var(--text-pink)', bg: 'var(--pink-soft)' },
  余位充足: { color: 'var(--text-mint)', bg: 'var(--mint-soft)' },
  '剩余 1 位': { color: 'var(--text-orange)', bg: 'var(--orange-soft)' },
  '剩余 2 位': { color: 'var(--text-orange)', bg: 'var(--orange-soft)' },
  已过期: { color: 'var(--text-secondary)', bg: 'rgba(241, 245, 249, 0.92)' },
  EXPIRED: { color: 'var(--text-secondary)', bg: 'rgba(241, 245, 249, 0.92)' },
  SUSPENDED: { color: 'var(--text-secondary)', bg: 'rgba(241, 245, 249, 0.92)' },
  在职: { color: 'var(--text-mint)', bg: 'var(--mint-soft)' },
  ON_LEAVE: { color: 'var(--text-pink)', bg: 'var(--pink-soft)' },
  INACTIVE: { color: 'var(--text-pink)', bg: 'var(--pink-soft)' },
  REFUNDED: { color: 'var(--text-pink)', bg: 'var(--pink-soft)' },
  休假中: { color: 'var(--text-pink)', bg: 'var(--pink-soft)' },
  处理中: { color: 'var(--text-orange)', bg: 'var(--orange-soft)' }
};

type Props = {
  status: string;
};

const baseTagStyle: CSSProperties = {
  marginInlineEnd: 0,
  borderRadius: 999,
  paddingInline: 8,
  lineHeight: '24px',
  fontSize: 'var(--font-size-xs)',
  fontWeight: 600
};

const StatusTag: FC<Props> = ({ status }) => {
  const item = colorMap[status] ?? { color: 'var(--text-secondary)', bg: 'rgba(241, 245, 249, 0.92)' };
  return (
    <Tag
      bordered={false}
      // Keep the status colors inline because each tag is data-driven at runtime.
      style={{ ...baseTagStyle, color: item.color, background: item.bg }}
    >
      {status}
    </Tag>
  );
};

export default StatusTag;
