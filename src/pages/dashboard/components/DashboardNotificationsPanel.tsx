import { Button } from 'antd';
import EmptyState from '@/components/EmptyState';
import SectionCard from '@/components/SectionCard';
import StatusTag from '@/components/StatusTag';
import styles from '../index.module.css';

export type DashboardNotificationItem = {
  id: string;
  title: string;
  typeText: string;
  summaryText: string;
  senderText: string;
  createdAtText: string;
  statusText: string;
  targetPath: string;
  urgent?: boolean;
};

export type DashboardNotificationsPanelProps = {
  items: DashboardNotificationItem[];
  pendingCount: number;
  onViewAll: () => void;
  onOpenItem?: (item: DashboardNotificationItem) => void;
};

export default function DashboardNotificationsPanel({
  items,
  pendingCount,
  onViewAll,
  onOpenItem,
}: DashboardNotificationsPanelProps) {
  return (
    <SectionCard
      title="后台通知"
      subtitle="用户提交的信息与待处理事项"
      extra={<Button type="text" className={styles.sectionAction} onClick={onViewAll}>查看通知列表</Button>}
    >
      <div className={styles.notificationPanelHead}>
        <span className={`${styles.notificationPanelPill} ${pendingCount > 0 ? styles.notificationPanelPillWarn : styles.notificationPanelPillCalm}`}>
          {pendingCount > 0 ? `待处理 ${pendingCount} 条` : '当前无待处理'}
        </span>
        <span className={styles.notificationPanelHint}>点击通知进入对应业务页面处理。</span>
      </div>

      {items.length > 0 ? (
        <div className={styles.notificationPanelList}>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${styles.notificationPanelItem} ${item.urgent ? styles.notificationPanelItemUrgent : ''}`}
              onClick={() => onOpenItem?.(item)}
            >
              <div className={styles.notificationPanelItemTop}>
                <span className={styles.notificationPanelType}>{item.typeText}</span>
                <StatusTag status={item.statusText} />
              </div>
              <div className={styles.notificationPanelTitle}>{item.title}</div>
              <div className={styles.notificationPanelSummary}>{item.summaryText}</div>
              <div className={styles.notificationPanelMeta}>
                <span>{item.senderText}</span>
                <span>{item.createdAtText}</span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState size="compact" title="暂无用户提交信息" description="小程序反馈、续费申请和注销申请会在这里优先展示。" />
      )}
    </SectionCard>
  );
}
