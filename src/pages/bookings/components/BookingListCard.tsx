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
  courseName: string;
  sessionTimeText: string;
  sessionDateText: string;
  tone: AccentTone;
  primaryActionLabel: string;
  primaryActionLoading?: boolean;
  primaryActionDisabled?: boolean;
  showPrimaryAction?: boolean;
  detailActionDisabled?: boolean;
  onPrimaryAction: () => void;
  onViewDetail: () => void;
};

export default function BookingListCard({
  memberName,
  statusLabel,
  courseName,
  sessionTimeText,
  sessionDateText,
  tone,
  primaryActionLabel,
  primaryActionLoading = false,
  primaryActionDisabled = false,
  showPrimaryAction = true,
  detailActionDisabled = false,
  onPrimaryAction,
  onViewDetail,
}: BookingListCardProps) {
  return (
    <div className={`${widgetCls.recordItem} ${widgetCls.workRecordItem} ${pageCls.surface} ${styles.bookingRecordCard}`}>
      <div className={styles.bookingRecordMain}>
        <div className={widgetCls.recordMeta}>
          <MemberAvatar name={memberName} tone={tone} />
          <div className={styles.bookingRecordIdentity}>
            <div className={`${widgetCls.recordTitle} ${pageCls.recordTitleRow}`}>
              {memberName}
              <StatusTag status={statusLabel} />
            </div>
            <div className={widgetCls.recordSub}>{sessionDateText}</div>
          </div>
        </div>

        <div className={`${pageCls.recordBriefGrid} ${pageCls.recordBriefGridTwo} ${styles.bookingRecordBriefGrid}`}>
          <div className={pageCls.recordBriefField}>
            <div className={pageCls.recordBriefLabel}>课程</div>
            <div className={pageCls.recordBriefValue}>{courseName}</div>
          </div>
          <div className={pageCls.recordBriefField}>
            <div className={pageCls.recordBriefLabel}>上课时间</div>
            <div className={`${pageCls.recordBriefValue} ${pageCls.recordBriefValueStrong}`}>{sessionTimeText}</div>
          </div>
        </div>
      </div>

      <div className={`${widgetCls.detailActionGroup} ${styles.bookingRecordActions}`}>
        {showPrimaryAction ? (
          <Button
            type="primary"
            size="large"
            className={pageCls.cardActionHalf}
            onClick={onPrimaryAction}
            loading={primaryActionLoading}
            disabled={primaryActionDisabled}
          >
            {primaryActionLabel}
          </Button>
        ) : null}
        <Button size="large" className={pageCls.cardActionHalf} onClick={onViewDetail} disabled={detailActionDisabled}>
          查看详情
        </Button>
      </div>
    </div>
  );
}
