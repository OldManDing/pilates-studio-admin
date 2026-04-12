import { Progress } from 'antd';
import SectionCard from '@/components/SectionCard';
import widgetCls from '@/styles/widgets.module.css';
import styles from '../index.module.css';

export type TrainingSummaryCardProps = {
  sessionCountText: string;
  hoursText: string;
  streakDaysText: string;
  goalPercent?: number;
  goalLabel?: string;
};

export default function TrainingSummaryCard({
  sessionCountText,
  hoursText,
  streakDaysText,
  goalPercent,
  goalLabel,
}: TrainingSummaryCardProps) {
  return (
    <SectionCard title="本月训练" subtitle="基于当前报表聚合结果，展示训练节奏与完成度概览。">
      <div className={styles.trainingSummaryWrap}>
        <div className={styles.trainingHeadlineRow}>
          <div>
            <div className={styles.membershipEyebrow}>Sessions</div>
            <div className={styles.trainingPrimaryValue}>{sessionCountText}</div>
          </div>
          <div className={styles.trainingSplit} />
          <div className={widgetCls.metricGrid}>
            <div className={`${widgetCls.metricCard} ${widgetCls.dashboardSummaryCard} ${widgetCls.dashboardSummaryCardViolet}`}>
              <div className={widgetCls.metricLabel}>累计时长</div>
              <div className={widgetCls.metricValue}>{hoursText}</div>
            </div>
            <div className={`${widgetCls.metricCard} ${widgetCls.dashboardSummaryCard} ${widgetCls.dashboardSummaryCardOrange}`}>
              <div className={widgetCls.metricLabel}>连续训练</div>
              <div className={widgetCls.metricValue}>{streakDaysText}</div>
            </div>
          </div>
        </div>

        <div className={styles.trainingProgressBlock}>
          <Progress
            percent={goalPercent ?? 0}
            showInfo={false}
            strokeColor="linear-gradient(90deg, var(--violet) 0%, color-mix(in srgb, var(--violet) 62%, var(--mint)) 100%)"
            trailColor="rgba(31, 42, 51, 0.06)"
          />
          <div className={styles.trainingGoalText}>{goalLabel ?? '月度目标进度待接入'}</div>
        </div>
      </div>
    </SectionCard>
  );
}
