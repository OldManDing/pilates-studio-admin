import { SaveOutlined } from '@ant-design/icons';
import ActionButton from '@/components/ActionButton';
import StatusTag from '@/components/StatusTag';
import widgetCls from '@/styles/widgets.module.css';
import styles from '../index.module.css';

export type SettingsOverviewMetricTone = 'mint' | 'violet' | 'orange';

export type SettingsOverviewMetric = {
  label: string;
  value: string;
  hint: string;
  tone: SettingsOverviewMetricTone;
};

export type SettingsOverviewMetaItem = {
  label: string;
  value: string;
  hint: string;
};

export type SettingsOverviewCardProps = {
  eyebrow: string;
  title: string;
  summary: string;
  statusLabel: '正常' | '处理中';
  savedBadgeText: string;
  metaItems: SettingsOverviewMetaItem[];
  metrics: SettingsOverviewMetric[];
  primaryActionLabel: string;
  primaryActionDisabled?: boolean;
  onPrimaryAction: () => void;
};

const metricToneClassNameMap: Record<SettingsOverviewMetricTone, string> = {
  mint: widgetCls.detailOverviewStatMint,
  violet: widgetCls.detailOverviewStatViolet,
  orange: widgetCls.detailOverviewStatOrange,
};

export default function SettingsOverviewCard({
  eyebrow,
  title,
  summary,
  statusLabel,
  savedBadgeText,
  metaItems,
  metrics,
  primaryActionLabel,
  primaryActionDisabled = false,
  onPrimaryAction,
}: SettingsOverviewCardProps) {
  return (
    <section className={`${widgetCls.detailOverviewPanel} ${styles.settingsOverviewCard}`}>
      <div className={styles.settingsOverviewTop}>
        <div className={styles.settingsOverviewContent}>
          <div className={styles.settingsOverviewBadges}>
            <span className={styles.settingsOverviewEyebrow}>{eyebrow}</span>
            <StatusTag status={statusLabel} />
          </div>

          <div className={styles.settingsOverviewTitleRow}>
            <h2 className={styles.settingsOverviewTitle}>{title}</h2>
            <span className={styles.settingsOverviewSavedBadge}>{savedBadgeText}</span>
          </div>

          <p className={widgetCls.detailOverviewText}>{summary}</p>
        </div>

        <div className={styles.settingsOverviewAction}>
          <ActionButton
            icon={<SaveOutlined />}
            onClick={onPrimaryAction}
            disabled={primaryActionDisabled}
          >
            {primaryActionLabel}
          </ActionButton>
        </div>
      </div>

      <div className={styles.settingsOverviewMetaGrid}>
        {metaItems.map((item) => (
          <div key={item.label} className={styles.settingsOverviewMetaCard}>
            <div className={styles.settingsOverviewLabel}>{item.label}</div>
            <div className={styles.settingsOverviewValue}>{item.value}</div>
            <div className={styles.settingsOverviewHint}>{item.hint}</div>
          </div>
        ))}
      </div>

      <div className={widgetCls.detailOverviewStatGrid}>
        {metrics.map((item) => (
          <div
            key={item.label}
            className={`${widgetCls.detailOverviewStatCard} ${metricToneClassNameMap[item.tone]}`}
          >
            <div className={widgetCls.detailInsightLabel}>{item.label}</div>
            <div className={`${widgetCls.detailOverviewStatValue} ${widgetCls.detailOverviewStatValueLarge}`}>
              {item.value}
            </div>
            <div className={styles.settingsOverviewMetricHint}>{item.hint}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
