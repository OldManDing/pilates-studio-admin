import type { FC } from 'react';
import { Tag } from 'antd';

const colorMap: Record<string, { color: string; bg: string }> = {
  正常: { color: '#3a8f7e', bg: '#edf8f3' },
  已确认: { color: '#3a8f7e', bg: '#edf8f3' },
  已完成: { color: '#766be2', bg: '#f1efff' },
  待确认: { color: '#c38a48', bg: '#fff5e8' },
  待激活: { color: '#c38a48', bg: '#fff5e8' },
  已取消: { color: '#cf7891', bg: '#fff2f5' },
  已满: { color: '#cf7891', bg: '#fff2f5' },
  余位充足: { color: '#3a8f7e', bg: '#edf8f3' },
  '剩余 1 位': { color: '#c38a48', bg: '#fff5e8' },
  '剩余 2 位': { color: '#c38a48', bg: '#fff5e8' },
  已过期: { color: '#64748b', bg: '#f1f5f9' },
  在职: { color: '#3a8f7e', bg: '#edf8f3' },
  休假中: { color: '#cf7891', bg: '#fff2f5' },
  处理中: { color: '#c38a48', bg: '#fff5e8' }
};

type Props = {
  status: string;
};

const StatusTag: FC<Props> = ({ status }) => {
  const item = colorMap[status] ?? { color: '#475569', bg: '#f1f5f9' };
  return (
    <Tag
      bordered={false}
      style={{
        marginInlineEnd: 0,
        borderRadius: 999,
        paddingInline: 10,
        lineHeight: '26px',
        color: item.color,
        background: item.bg,
        fontWeight: 700
      }}
    >
      {status}
    </Tag>
  );
};

export default StatusTag;
