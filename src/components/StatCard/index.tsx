import type { FC, ReactNode } from 'react';
import cls from './index.module.css';
import { getToneColor } from '@/utils/format';
import type { AccentTone } from '@/types';

type Props = {
  title: string;
  value: string;
  hint: string;
  icon: ReactNode;
  tone?: AccentTone;
};

const StatCard: FC<Props> = ({ title, value, hint, icon, tone = 'mint' }) => {
  const colors = getToneColor(tone);

  return (
    <div className={cls.card}>
      <div className={cls.top}>
        <div className={cls.title}>{title}</div>
        <div className={cls.icon} style={{ background: colors.soft, color: colors.solid }}>
          {icon}
        </div>
      </div>
      <div className={cls.value}>{value}</div>
      <div className={cls.hint}>{hint}</div>
    </div>
  );
};

export default StatCard;
