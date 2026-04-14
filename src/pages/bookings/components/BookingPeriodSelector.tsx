import { FilterOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Input } from 'antd';
import ActionButton from '@/components/ActionButton';
import pageCls from '@/styles/page.module.css';
import styles from '../index.module.css';

export type BookingPeriodSelectorItem = {
  value: string;
  label: string;
  metaText: string;
  active: boolean;
};

export type BookingPeriodSelectorProps = {
  eyebrow?: string;
  title: string;
  subtitle: string;
  resultCountText: string;
  periods: BookingPeriodSelectorItem[];
  searchValue: string;
  searchPlaceholder: string;
  onPeriodChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onOpenFilter: () => void;
};

export default function BookingPeriodSelector({
  eyebrow,
  title,
  subtitle,
  resultCountText,
  periods,
  searchValue,
  searchPlaceholder,
  onPeriodChange,
  onSearchChange,
  onOpenFilter,
}: BookingPeriodSelectorProps) {
  return (
    <section className={`${pageCls.surface} ${styles.bookingSelectorCard}`}>
      <div className={styles.bookingSelectorHeader}>
        <div>
          {eyebrow ? <div className={styles.bookingSelectorEyebrow}>{eyebrow}</div> : null}
          <div className={styles.bookingSelectorTitleRow}>
            <h2 className={styles.bookingSelectorTitle}>{title}</h2>
            <span className={styles.bookingSelectorCount}>{resultCountText}</span>
          </div>
          <p className={styles.bookingSelectorSubtitle}>{subtitle}</p>
        </div>
      </div>

      <div className={styles.bookingSelectorBody}>
        <div className={styles.bookingPeriodGrid}>
          {periods.map((period) => (
            <Button
              key={period.value}
              type={period.active ? 'primary' : 'default'}
              className={`${styles.bookingPeriodButton} ${period.active ? styles.bookingPeriodButtonActive : ''}`}
              onClick={() => onPeriodChange(period.value)}
            >
              <span className={styles.bookingPeriodButtonBody}>
                <span className={styles.bookingPeriodMeta}>{period.metaText}</span>
                <span className={styles.bookingPeriodLabel}>{period.label}</span>
              </span>
            </Button>
          ))}
        </div>

        <div className={styles.bookingSelectorSearchRow}>
          <Input
            className={`${pageCls.toolbarSearch} ${styles.bookingSelectorSearch}`}
            size="large"
            value={searchValue}
            prefix={<SearchOutlined />}
            placeholder={searchPlaceholder}
            onChange={(event) => onSearchChange(event.target.value)}
          />
          <ActionButton icon={<FilterOutlined />} ghost className={pageCls.toolbarGhostAction} onClick={onOpenFilter}>
            筛选条件
          </ActionButton>
        </div>
      </div>
    </section>
  );
}
