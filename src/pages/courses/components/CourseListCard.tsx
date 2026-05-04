import { EditOutlined, EyeOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import styles from '../index.module.css';

export type CourseListCardProps = {
  id: string;
  codeText: string;
  name: string;
  summaryText: string;
  typeLabel: string;
  levelLabel: string;
  statusLabel: string;
  statusTone: 'active' | 'inactive';
  coachName: string;
  durationText: string;
  capacityText: string;
  sessionCountText: string;
  primaryActionLabel: string;
  primaryActionDisabled?: boolean;
  onEdit: () => void;
  onViewDetail: () => void;
};

export default function CourseListCard({
  codeText,
  name,
  summaryText,
  typeLabel,
  levelLabel,
  statusLabel,
  statusTone,
  coachName,
  sessionCountText,
  primaryActionLabel,
  primaryActionDisabled = false,
  onEdit,
  onViewDetail,
}: CourseListCardProps) {
  return (
    <article className={`${styles.courseCard} ${pageCls.surface}`}>
      <div className={styles.courseCardHeader}>
        <div className={styles.courseCardIdentity}>
          <div className={styles.courseEyebrow}>{codeText}</div>
          <h3 className={styles.courseCardTitle}>{name}</h3>
          <p className={styles.courseCardSummary}>{summaryText}</p>
        </div>

        <div className={`${widgetCls.chipRow} ${styles.courseChipGroup}`}>
          <span className={widgetCls.chipPrimary}>{typeLabel}</span>
          <span className={widgetCls.chipLevel}>{levelLabel}</span>
          <span className={statusTone === 'active' ? styles.courseStatusChipActive : styles.courseStatusChipInactive}>
            {statusLabel}
          </span>
        </div>
      </div>

      <div className={`${pageCls.recordBriefGrid} ${pageCls.recordBriefGridTwo}`}>
        <div className={pageCls.recordBriefField}>
          <div className={pageCls.recordBriefLabel}>授课教练</div>
          <div className={pageCls.recordBriefValue}>{coachName}</div>
        </div>
        <div className={pageCls.recordBriefField}>
          <div className={pageCls.recordBriefLabel}>当前排期</div>
          <div className={`${pageCls.recordBriefValue} ${pageCls.recordBriefValueStrong}`}>{sessionCountText}</div>
        </div>
      </div>

      <div className={styles.courseCardFooter}>
        <div className={styles.courseCardActions}>
          <Button
            type="primary"
            size="large"
            className={`${pageCls.cardActionPrimary} ${pageCls.courseCardActionBtn}`}
            icon={<EditOutlined />}
            onClick={onEdit}
            disabled={primaryActionDisabled}
          >
            {primaryActionLabel}
          </Button>
          <Button
            size="large"
            className={`${pageCls.cardActionSecondary} ${pageCls.courseCardActionBtn}`}
            icon={<EyeOutlined />}
            onClick={onViewDetail}
          >
            查看详情
          </Button>
        </div>
      </div>
    </article>
  );
}
