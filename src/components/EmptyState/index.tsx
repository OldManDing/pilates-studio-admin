import type { FC, ReactNode } from 'react';
import { Empty } from 'antd';
import ActionButton from '@/components/ActionButton';

type Props = {
  title?: string;
  description?: string;
  image?: ReactNode;
  actionText?: string;
  onAction?: () => void;
};

const EmptyState: FC<Props> = ({ title, description, image, actionText, onAction }) => (
  <Empty
    image={image}
    description={
      <div>
        {title ? <div style={{ fontWeight: 800, color: 'var(--text-heading)', marginBottom: 6 }}>{title}</div> : null}
        <div style={{ color: 'var(--text-tertiary)', lineHeight: 1.6 }}>{description ?? '暂无数据'}</div>
        {actionText ? (
          <div style={{ marginTop: 16 }}>
            <ActionButton onClick={onAction}>{actionText}</ActionButton>
          </div>
        ) : null}
      </div>
    }
    style={{ padding: '32px 0' }}
  />
);

export default EmptyState;
