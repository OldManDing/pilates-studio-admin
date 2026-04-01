import type { FC, ReactNode } from 'react';
import cls from './index.module.css';

type Props = {
  title: string;
  subtitle: string;
  extra?: ReactNode;
};

const PageHeader: FC<Props> = ({ title, subtitle, extra }) => (
  <div className={cls.header}>
    <div>
      <h1 className={cls.title}>{title}</h1>
      <div className={cls.subtitle}>{subtitle}</div>
    </div>
    {extra}
  </div>
);

export default PageHeader;
