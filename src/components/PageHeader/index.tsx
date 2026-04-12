import type { FC, ReactNode } from 'react';
import cls from './index.module.css';

type Props = {
  title: string;
  subtitle?: string;
  extra?: ReactNode;
};

const PageHeader: FC<Props> = ({ title, subtitle, extra }) => (
  <section className={cls.header}>
    <div className={cls.content}>
      <h1 className={cls.title}>{title}</h1>
      {subtitle ? <p className={cls.subtitle}>{subtitle}</p> : null}
    </div>
    {extra ? <div className={cls.extra}>{extra}</div> : null}
  </section>
);

export default PageHeader;
