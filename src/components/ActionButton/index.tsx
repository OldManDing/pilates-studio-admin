import type { FC, ReactNode } from 'react';
import { Button } from 'antd';
import cls from './index.module.css';

type Props = {
  children: ReactNode;
  icon?: ReactNode;
  ghost?: boolean;
};

const ActionButton: FC<Props> = ({ children, icon, ghost }) => (
  <Button
    className={cls.button}
    icon={icon}
    size="large"
    type={ghost ? 'default' : 'primary'}
  >
    {children}
  </Button>
);

export default ActionButton;
