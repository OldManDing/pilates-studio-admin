import type { FC, ReactNode } from 'react';
import SectionCard from '@/components/SectionCard';

type Props = {
  title: string;
  subtitle?: string;
  extra?: ReactNode;
  children: ReactNode;
};

const ChartCard: FC<Props> = (props) => <SectionCard {...props} />;

export default ChartCard;
