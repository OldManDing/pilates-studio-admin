import { CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, FilterOutlined } from '@ant-design/icons';
import { Button, Segmented } from 'antd';
import ActionButton from '@/components/ActionButton';
import MemberAvatar from '@/components/MemberAvatar';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import StatusTag from '@/components/StatusTag';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import { bookingList, bookingStats } from '@/mock';

const iconMap = {
  calendar: <CalendarOutlined />,
  schedule: <CalendarOutlined />,
  clock: <ClockCircleOutlined />,
  check: <CheckCircleOutlined />
};

export default function BookingsPage() {
  return (
    <div className={pageCls.page}>
      <PageHeader title="预约管理" subtitle="管理所有课程预约和签到记录。" />

      <div className={pageCls.heroGrid}>
        {bookingStats.map((item) => (
          <StatCard key={item.title} {...item} icon={iconMap[item.icon]} />
        ))}
      </div>

      <div className={pageCls.toolbar}>
        <div className={pageCls.segmentedSoft}>
          <Segmented size="large" options={['今天', '明天', '本周']} defaultValue="今天" />
        </div>
        <ActionButton icon={<FilterOutlined />} ghost>筛选</ActionButton>
      </div>

      <div className={widgetCls.recordList}>
        {bookingList.map((item) => (
          <div key={item.id} className={`${widgetCls.recordItem} ${pageCls.surface}`}>
            <div className={widgetCls.recordMeta}>
              <MemberAvatar name={item.name} tone={item.tone} />
              <div>
                <div className={widgetCls.recordTitle} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {item.name}
                  <StatusTag status={item.status} />
                </div>
                <div className={widgetCls.recordSub}>{item.code}</div>
                <div className={widgetCls.recordSub}>{item.course} · {item.time}</div>
              </div>
            </div>

            <div className={widgetCls.infoStack}>
              <div>教练：{item.coach}</div>
              <div>预约时间：{item.bookedAt}</div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Button type="primary" size="large" className={pageCls.cardActionHalf}>
                {item.status === '已完成' ? '复盘' : item.status === '待确认' ? '确认' : '签到'}
              </Button>
              <Button size="large" className={pageCls.cardActionHalf}>详情</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
