import type { FC, ReactNode } from 'react';
import { Button } from 'antd';
import cls from './index.module.css';

type Props = {
  children: ReactNode;
  icon?: ReactNode;
  ghost?: boolean;
  htmlType?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
};

const ActionButton: FC<Props> = ({ children, icon, ghost, htmlType = 'button', onClick }) => (
  <Button
    className={cls.button}
    icon={icon}
    size="large"
    htmlType={htmlType}
    onClick={onClick}
    type={ghost ? 'default' : 'primary'}
  >
    {children}
  </Button>
);

export default ActionButton;
