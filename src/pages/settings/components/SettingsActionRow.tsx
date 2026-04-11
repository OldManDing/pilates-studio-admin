import { ArrowRightOutlined } from '@ant-design/icons';
import StatusTag from '@/components/StatusTag';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import styles from '../index.module.css';

export type SettingsActionRowProps = {
  title: string;
  description: string;
  statusLabel: '正常' | '待激活' | '处理中';
  onClick: () => void;
};

export default function SettingsActionRow({
  title,
  description,
  statusLabel,
  onClick,
}: SettingsActionRowProps) {
  return (
    <button
      type="button"
      className={`${widgetCls.settingRow} ${pageCls.plainActionRowButton}`}
      onClick={onClick}
    >
      <div className={styles.settingsActionRowContent}>
        <div className={widgetCls.recordTitle}>{title}</div>
        <div className={widgetCls.smallText}>{description}</div>
      </div>

      <div className={pageCls.statusMetaWrap}>
        <StatusTag status={statusLabel} />
        <ArrowRightOutlined className={styles.settingsActionRowIcon} />
      </div>
    </button>
  );
}
