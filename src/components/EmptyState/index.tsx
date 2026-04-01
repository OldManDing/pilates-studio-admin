import type { FC } from 'react';
import { Empty } from 'antd';

const EmptyState: FC<{ description?: string }> = ({ description }) => (
  <Empty description={description ?? '暂无数据'} style={{ padding: '32px 0' }} />
);

export default EmptyState;
