import type { FC, ReactNode } from 'react';
import { Button } from 'antd';
import cls from './index.module.css';

type Props = {
  children: ReactNode;
  icon?: ReactNode;
  ghost?: boolean;
  text?: boolean;
  htmlType?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
};

const ActionButton: FC<Props> = ({ children, icon, ghost, text, htmlType = 'button', onClick, disabled, loading }) => (
  <Button
    className={cls.button}
    icon={icon}
    size="large"
    htmlType={htmlType}
    onClick={onClick}
    disabled={disabled}
    loading={loading}
    type={text ? 'text' : ghost ? 'default' : 'primary'}
  >
    {children}
  </Button>
);

export default ActionButton;
