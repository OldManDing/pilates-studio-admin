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
    <div
      className={cls.card}
      style={{
        ['--stat-accent' as string]: colors.text,
        ['--stat-accent-border' as string]: colors.border,
      }}
    >
      <div className={cls.top}>
        <div className={cls.title}>{title}</div>
        <div
          className={cls.icon}
          style={{ background: colors.soft, color: colors.text, borderColor: colors.border }}
        >
          {icon}
        </div>
      </div>
      <div className={cls.value}>{value}</div>
      <div className={cls.hint}>{hint}</div>
    </div>
  );
};

export default StatCard;
