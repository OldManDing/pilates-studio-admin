import { Button, Progress } from 'antd';
import MemberAvatar from '@/components/MemberAvatar';
import StatusTag from '@/components/StatusTag';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import type { AccentTone } from '@/types';
import styles from '../index.module.css';

export type MemberProfileOverviewCardProps = {
  name: string;
  phone: string;
  email: string;
  memberCodeText: string;
  tierLabel: string;
  planName: string;
  statusLabel: string;
  joinedDateText: string;
  remainingCreditsText: string;
  progressPercent: number;
  progressLabel: string;
  tone: AccentTone;
  onPrimaryAction: () => void;
};

export default function MemberProfileOverviewCard({
  name,
  phone,
  email,
  memberCodeText,
  tierLabel,
  planName,
  statusLabel,
  joinedDateText,
  remainingCreditsText,
  progressPercent,
  progressLabel,
  tone,
  onPrimaryAction,
}: MemberProfileOverviewCardProps) {
  return (
    <section className={styles.profileHeroCard}>
      <div className={styles.profileHeroTop}>
        <div className={styles.profileHeroIdentity}>
          <MemberAvatar name={name} tone={tone} />
          <div>
            <div className={styles.profileHeroBadges}>
              <span className={styles.profileTierBadge}>{tierLabel}</span>
              <StatusTag status={statusLabel} />
            </div>
            <div className={`${widgetCls.recordTitle} ${pageCls.recordTitleRow}`}>
              {name}
            </div>
            <div className={widgetCls.recordSub}>{planName}</div>
          </div>
        </div>
        <span className={styles.profileCodeBadge}>{memberCodeText}</span>
      </div>

      <div className={styles.profileHeroMeta}>
        <div>
          <div className={styles.profileMetaLabel}>联系方式</div>
          <div className={styles.profileMetaValue}>{phone}</div>
          <div className={styles.profileMetaSub}>{email}</div>
        </div>
        <div>
          <div className={styles.profileMetaLabel}>加入时间</div>
          <div className={styles.profileMetaValue}>{joinedDateText}</div>
          <div className={styles.profileMetaSub}>当前会籍运行中</div>
        </div>
        <div>
          <div className={styles.profileMetaLabel}>课时权益</div>
          <div className={styles.profileMetaValue}>{remainingCreditsText}</div>
          <div className={styles.profileMetaSub}>{progressLabel}</div>
        </div>
      </div>

      <div className={styles.profileProgressBlock}>
        <div className={styles.profileProgressHeader}>
          <span className={styles.profileMetaLabel}>使用进度</span>
          <span className={styles.profileProgressText}>{progressLabel}</span>
        </div>
        <Progress percent={progressPercent} showInfo={false} strokeColor="#c4a574" trailColor="rgba(244, 244, 245, 0.95)" />
      </div>

      <div className={styles.profileHeroActionRow}>
        <Button size="large" className={pageCls.cardActionPrimary} onClick={onPrimaryAction}>编辑会员</Button>
      </div>
    </section>
  );
}
