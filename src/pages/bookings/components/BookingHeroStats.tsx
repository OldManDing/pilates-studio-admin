import type { ReactNode } from 'react';
import StatCard from '@/components/StatCard';
import pageCls from '@/styles/page.module.css';
import type { AccentTone } from '@/types';

export type BookingHeroStatItem = {
  key: string;
  title: string;
  value: string;
  hint: string;
  icon: ReactNode;
  tone: AccentTone;
};

export type BookingHeroStatsProps = {
  items: BookingHeroStatItem[];
};

export default function BookingHeroStats({ items }: BookingHeroStatsProps) {
  return (
    <div className={pageCls.heroGrid}>
      {items.map((item) => (
        <StatCard
          key={item.key}
          title={item.title}
          value={item.value}
          hint={item.hint}
          icon={item.icon}
          tone={item.tone}
        />
      ))}
    </div>
  );
}
