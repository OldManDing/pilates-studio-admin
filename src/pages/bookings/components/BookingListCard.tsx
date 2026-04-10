import { Button } from 'antd';
import MemberAvatar from '@/components/MemberAvatar';
import StatusTag from '@/components/StatusTag';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import type { AccentTone } from '@/types';
import styles from '../index.module.css';

export type BookingListCardProps = {
  memberName: string;
  statusLabel: string;
  bookingCode: string;
  courseName: string;
  sessionTimeText: string;
  sessionDateText: string;
  bookedAtText: string;
  coachName: string;
  sourceText: string;
  tone: AccentTone;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  onViewDetail: () => void;
};

export default function BookingListCard({
  memberName,
  statusLabel,
  bookingCode,
  courseName,
  sessionTimeText,
  sessionDateText,
  bookedAtText,
  coachName,
  sourceText,
  tone,
  primaryActionLabel,
  onPrimaryAction,
  onViewDetail,
}: BookingListCardProps) {
  return (
    <div className={`${widgetCls.recordItem} ${widgetCls.workRecordItem} ${pageCls.surface} ${styles.bookingRecordCard}`}>
      <div className={styles.bookingRecordMain}>
        <div className={styles.bookingScheduleBlock}>
          <div className={`${widgetCls.dashboardTimeBadge} ${styles.bookingScheduleBadge}`}>{sessionTimeText}</div>
          <div className={styles.bookingScheduleDate}>{sessionDateText}</div>
        </div>

        <div className={styles.bookingRecordBody}>
          <div className={widgetCls.recordMeta}>
            <MemberAvatar name={memberName} tone={tone} />
            <div className={styles.bookingIdentity}>
              <div className={styles.bookingIdentityTop}>
                <div className={styles.bookingIdentityCopy}>
                  <div className={`${widgetCls.recordTitle} ${pageCls.recordTitleRow}`}>
                    {memberName}
                    <StatusTag status={statusLabel} />
                  </div>
                  <div className={styles.bookingCourseTitle}>{courseName}</div>
                </div>
                <span className={styles.bookingCodeBadge}>{bookingCode}</span>
              </div>
              <div className={styles.bookingSubtext}>预约于 {bookedAtText}</div>
            </div>
          </div>

          <div className={styles.bookingMetaGrid}>
            <div className={styles.bookingMetaCard}>
              <div className={styles.bookingMetaLabel}>开课日期</div>
              <div className={styles.bookingMetaValue}>{sessionDateText}</div>
            </div>
            <div className={styles.bookingMetaCard}>
              <div className={styles.bookingMetaLabel}>授课教练</div>
              <div className={styles.bookingMetaValue}>{coachName}</div>
            </div>
            <div className={styles.bookingMetaCard}>
              <div className={styles.bookingMetaLabel}>预约来源</div>
              <div className={styles.bookingMetaValue}>{sourceText}</div>
            </div>
          </div>
        </div>
      </div>

      <div className={`${widgetCls.detailActionGroup} ${styles.bookingRecordActions}`}>
        <Button type="primary" size="large" className={pageCls.cardActionHalf} onClick={onPrimaryAction}>
          {primaryActionLabel}
        </Button>
        <Button size="large" className={pageCls.cardActionHalf} onClick={onViewDetail}>
          详情
        </Button>
      </div>
    </div>
  );
}
