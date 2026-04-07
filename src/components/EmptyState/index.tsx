import type { FC, ReactNode } from 'react';
import { Empty } from 'antd';
import ActionButton from '@/components/ActionButton';
import cls from './index.module.css';

type Props = {
  title?: string;
  description?: string;
  image?: ReactNode;
  actionText?: string;
  onAction?: () => void;
};

const EmptyState: FC<Props> = ({ title, description, image, actionText, onAction }) => (
  <div className={cls.wrapper}>
    <Empty
      image={image}
      description={
        <div>
          {title ? <div className={cls.title}>{title}</div> : null}
          <div className={cls.description}>{description ?? '暂无数据'}</div>
          {actionText ? (
            <div className={cls.action}>
              <ActionButton onClick={onAction}>{actionText}</ActionButton>
            </div>
          ) : null}
        </div>
      }
    />
  </div>
);

export default EmptyState;
