import { EditOutlined, EyeOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import MemberAvatar from '@/components/MemberAvatar';
import StatusTag from '@/components/StatusTag';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import type { AccentTone } from '@/types';
import styles from '../index.module.css';

export type CoachRecordCardProps = {
  name: string;
  coachCodeText: string;
  statusLabel: string;
  experienceText: string;
  emailText: string;
  phoneText: string;
  ratingText: string;
  specialtiesText: string;
  specialtiesCountText: string;
  tone: AccentTone;
  onEdit: () => void;
  onViewDetail: () => void;
};

export default function CoachRecordCard({
  name,
  coachCodeText,
  statusLabel,
  experienceText,
  emailText,
  phoneText,
  ratingText,
  specialtiesText,
  specialtiesCountText,
  tone,
  onEdit,
  onViewDetail,
}: CoachRecordCardProps) {
  return (
    <article className={`${widgetCls.recordItem} ${widgetCls.workRecordItem} ${pageCls.surface} ${styles.coachRecordCard}`}>
      <div className={styles.coachRecordMain}>
        <div className={widgetCls.recordMeta}>
          <MemberAvatar name={name} tone={tone} />
          <div className={styles.coachRecordHead}>
            <div className={styles.coachRecordTitleRow}>
              <span className={widgetCls.recordTitle}>{name}</span>
              <StatusTag status={statusLabel} />
              <span className={styles.coachCodeBadge}>{coachCodeText}</span>
            </div>
            <div className={widgetCls.recordSub}>{experienceText}</div>
            <div className={styles.coachRecordSubtext}>{emailText}</div>
          </div>
        </div>

        <div className={styles.coachRecordGrid}>
          <div className={styles.coachRecordField}>
            <div className={styles.coachRecordLabel}>联系电话</div>
            <div className={styles.coachRecordValue}>{phoneText}</div>
          </div>
          <div className={styles.coachRecordField}>
            <div className={styles.coachRecordLabel}>学员评分</div>
            <div className={styles.coachRecordValue}>{ratingText}</div>
          </div>
          <div className={styles.coachRecordField}>
            <div className={styles.coachRecordLabel}>擅长方向</div>
            <div className={`${styles.coachRecordValue} ${styles.coachRecordValueClamp}`}>{specialtiesText}</div>
          </div>
        </div>
      </div>

      <div className={`${widgetCls.detailActionGroup} ${styles.coachRecordActions}`}>
        <span className={styles.coachSpecialtyBadge}>{specialtiesCountText}</span>
        <Button type="primary" size="large" className={pageCls.cardActionHalf} icon={<EditOutlined />} onClick={onEdit}>
          编辑资料
        </Button>
        <Button size="large" className={pageCls.cardActionHalf} icon={<EyeOutlined />} onClick={onViewDetail}>
          查看详情
        </Button>
      </div>
    </article>
  );
}
