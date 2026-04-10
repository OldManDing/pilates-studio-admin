import type { CSSProperties, FC } from 'react';
import cls from './index.module.css';

type Props = {
  width?: number | string;
  height?: number | string;
  circle?: boolean;
  className?: string;
};

const Skeleton: FC<Props> = ({ width, height, circle, className }) => {
  const style: CSSProperties = {
    width: width ?? '100%',
    height: height ?? 16,
  };

  return (
    <div
      className={`${cls.skeleton} ${circle ? cls.circle : ''} ${className ?? ''}`}
      style={style}
    />
  );
};

type CardProps = {
  rows?: number;
};

const Card: FC<CardProps> = ({ rows = 3 }) => (
  <div className={cls.card}>
    <div className={cls.cardHeader}>
      <Skeleton width={120} height={20} />
      <Skeleton width={80} height={32} />
    </div>
    <div className={cls.cardContent}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={14} />
      ))}
    </div>
  </div>
);

const SkeletonWithCard = Object.assign(Skeleton, { Card });

export default SkeletonWithCard;
