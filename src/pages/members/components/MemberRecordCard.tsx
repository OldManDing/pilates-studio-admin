import { Button } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import MemberAvatar from '@/components/MemberAvatar';
import StatusTag from '@/components/StatusTag';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import type { AccentTone } from '@/types';

export type MemberRecordCardProps = {
  id: string;
  name: string;
  phone: string;
  planName: string;
  remainingCreditsText: string;
  memberCodeText: string;
  statusLabel: string;
  tone: AccentTone;
  onEdit: () => void;
  onViewDetail: () => void;
};

export default function MemberRecordCard({
  name,
  phone,
  planName,
  remainingCreditsText,
  memberCodeText,
  statusLabel,
  tone,
  onEdit,
  onViewDetail,
}: MemberRecordCardProps) {
  return (
    <div className={`${widgetCls.recordItem} ${widgetCls.workRecordItem} ${pageCls.surface} ${pageCls.memberRecordItem}`}>
      <div className={widgetCls.recordMeta}>
        <MemberAvatar name={name} tone={tone} />
        <div className={pageCls.memberRecordHead}>
          <div className={pageCls.memberRecordNameRow}>
            <span className={pageCls.membersName}>{name}</span>
            <StatusTag status={statusLabel} />
            <span className={pageCls.memberCodePill}>{memberCodeText}</span>
          </div>
          <div className={widgetCls.recordSub}>{phone}</div>
        </div>
      </div>

      <div className={pageCls.memberRecordGrid}>
        <div className={pageCls.memberRecordField}>
          <div className={pageCls.memberRecordLabel}>会籍类型</div>
          <div className={pageCls.memberRecordValue}>{planName}</div>
        </div>
        <div className={pageCls.memberRecordField}>
          <div className={pageCls.memberRecordLabel}>剩余课时</div>
          <div className={pageCls.memberRecordValue}>{remainingCreditsText}</div>
        </div>
      </div>

      <div className={widgetCls.detailActionGroup}>
        <Button type="primary" size="large" className={pageCls.cardActionHalf} onClick={onViewDetail}>查看详情</Button>
        <Button size="large" className={pageCls.cardActionHalf} icon={<EditOutlined />} onClick={onEdit}>编辑</Button>
      </div>
    </div>
  );
}
