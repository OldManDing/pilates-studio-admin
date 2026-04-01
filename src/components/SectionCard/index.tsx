import type { FC, ReactNode } from 'react';
import cls from './index.module.css';

type Props = {
  title: string;
  subtitle?: string;
  extra?: ReactNode;
  children: ReactNode;
};

const SectionCard: FC<Props> = ({ title, subtitle, extra, children }) => (
  <section className={cls.card}>
    <div className={cls.header}>
      <div>
        <h3 className={cls.title}>{title}</h3>
        {subtitle ? <div className={cls.subtitle}>{subtitle}</div> : null}
      </div>
      {extra}
    </div>
    {children}
  </section>
);

export default SectionCard;
