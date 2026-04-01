import { Button } from 'antd';
import ActionButton from '@/components/ActionButton';
import MemberAvatar from '@/components/MemberAvatar';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatusTag from '@/components/StatusTag';
import { todayBookings, todayCourses } from '@/mock';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import { useNavigate } from 'react-router-dom';

export default function DashboardBookingsPage() {
  const navigate = useNavigate();
  const go = (path: string) => navigate(path);

  return (
    <div className={pageCls.page}>
      <PageHeader
        title="今日预约明细"
        subtitle="聚焦仪表盘内的预约跟进事项，快速确认、联系与处理异常。"
        extra={<ActionButton ghost onClick={() => go('/dashboard')}>返回仪表盘</ActionButton>}
      />

      <SectionCard title="待处理预约" subtitle="按预约时间排序" extra={<Button type="text" onClick={() => go('/bookings')}>进入完整预约模块</Button>}>
        <div className={widgetCls.recordList}>
          {todayBookings.map((item) => (
            <div key={item.name} className={widgetCls.recordItem}>
              <div className={widgetCls.recordMeta}>
                <MemberAvatar name={item.name} tone={item.tone} />
                <div>
                  <div className={widgetCls.recordTitle} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {item.name}
                    <StatusTag status={item.status} />
                  </div>
                  <div className={widgetCls.recordSub}>{item.course}</div>
                  <div className={widgetCls.recordSub}>{item.phone}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Button type="primary" size="large" className={pageCls.cardActionHalf}>{item.status === '待确认' ? '立即确认' : '联系会员'}</Button>
                <Button size="large" className={pageCls.cardActionHalf}>查看详情</Button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className={pageCls.equalCol}>
        <SectionCard title="预约关联课程" subtitle="今日课程容量与预约情况">
          <div className={widgetCls.recordListDense}>
            {todayCourses.map((course) => (
              <div key={`${course.time}-${course.title}`} className={widgetCls.recordItem}>
                <div>
                  <div className={widgetCls.recordTitle}>{course.title}</div>
                  <div className={widgetCls.recordSub}>{course.time} · {course.type} · 教练 {course.coach}</div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <strong>{course.booking}</strong>
                  <StatusTag status={course.status} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="处理建议" subtitle="基于当前预约状态的即时提醒">
          <div className={widgetCls.infoStack}>
            <div>• 优先确认「待确认」预约，避免临近开课空位浪费。</div>
            <div>• 对「已取消」会员发起候补邀约，提高当日上座率。</div>
            <div>• 在开课前 30 分钟完成签到提醒，提高准时到课率。</div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
