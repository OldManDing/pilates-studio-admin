import type { CSSProperties, FC } from 'react';
import { Tag } from 'antd';
import { getToneColor } from '@/utils/format';

const statusToneMap: Record<string, 'mint' | 'violet' | 'orange' | 'pink' | 'slate'> = {
  正常: 'mint',
  ACTIVE: 'mint',
  已确认: 'mint',
  CONFIRMED: 'mint',
  在职: 'mint',
  已读: 'mint',
  READ: 'mint',
  余位充足: 'mint',
  已完成: 'violet',
  COMPLETED: 'violet',
  已发送: 'violet',
  SENT: 'violet',
  待确认: 'orange',
  待发送: 'orange',
  待处理: 'orange',
  PENDING: 'orange',
  待激活: 'orange',
  PROCESSING: 'orange',
  处理中: 'orange',
  ON_LEAVE: 'orange',
  休假中: 'orange',
  '剩余 1 位': 'orange',
  '剩余 2 位': 'orange',
  已取消: 'pink',
  CANCELLED: 'pink',
  失败: 'pink',
  FAILED: 'pink',
  NO_SHOW: 'pink',
  未到场: 'pink',
  已满: 'pink',
  REFUNDED: 'pink',
  已退款: 'pink',
  已过期: 'slate',
  EXPIRED: 'slate',
  SUSPENDED: 'slate',
  INACTIVE: 'slate',
  停用: 'slate',
  已停用: 'slate',
};

const neutralTone = {
  text: 'var(--text-secondary)',
  soft: 'rgba(244, 247, 250, 0.96)',
  border: 'rgba(148, 163, 184, 0.22)',
};

type Props = {
  status: string;
};

const baseTagStyle: CSSProperties = {
  marginInlineEnd: 0,
  minHeight: 28,
  borderRadius: 999,
  paddingInline: 10,
  border: '1px solid transparent',
  display: 'inline-flex',
  alignItems: 'center',
  lineHeight: '18px',
  fontSize: 'var(--font-size-xs)',
  fontWeight: 700,
  letterSpacing: '0.01em',
};

const StatusTag: FC<Props> = ({ status }) => {
  const tone = statusToneMap[status] ?? 'slate';
  const item = tone === 'slate' ? neutralTone : getToneColor(tone);

  return (
    <Tag
      bordered={false}
      // Keep the status colors inline because each tag is data-driven at runtime.
      style={{ ...baseTagStyle, color: item.text, background: item.soft, borderColor: item.border }}
    >
      {status}
    </Tag>
  );
};

export default StatusTag;
