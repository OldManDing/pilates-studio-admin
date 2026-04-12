import {
  CalendarOutlined,
  ArrowRightOutlined,
  SettingOutlined,
  TeamOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import SectionCard from '@/components/SectionCard';
import styles from '../index.module.css';

export type QuickActionItem = {
  key: 'members' | 'courses' | 'bookings' | 'settings';
  label: string;
  subLabel: string;
  path: string;
};

export type QuickActionPanelProps = {
  items: QuickActionItem[];
  onNavigate: (path: string) => void;
};

const iconMap: Record<QuickActionItem['key'], JSX.Element> = {
  members: <TeamOutlined />,
  courses: <CalendarOutlined />,
  bookings: <UnorderedListOutlined />,
  settings: <SettingOutlined />,
};

export default function QuickActionPanel({ items, onNavigate }: QuickActionPanelProps) {
  return (
    <SectionCard title="模块快捷分流" subtitle="二级导航快捷入口：点击后进入对应业务模块处理完整工作流。">
      <div className={styles.quickActionGrid}>
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            className={styles.quickActionCard}
            onClick={() => onNavigate(item.path)}
          >
            <div className={styles.quickActionIcon}>{iconMap[item.key] ?? <ArrowRightOutlined />}</div>
            <div className={styles.quickActionBody}>
              <div className={styles.quickActionLabel}>{item.label}</div>
              <div className={styles.quickActionSubLabel}>{item.subLabel}</div>
            </div>
            <span className={styles.inlineGhostButton}>
              进入模块
              <ArrowRightOutlined />
            </span>
          </button>
        ))}
      </div>
    </SectionCard>
  );
}
