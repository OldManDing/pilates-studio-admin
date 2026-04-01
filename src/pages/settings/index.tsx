import { ArrowRightOutlined, SaveOutlined } from '@ant-design/icons';
import { Button, Col, Form, Input, Row, Switch } from 'antd';
import ActionButton from '@/components/ActionButton';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import { dataActions, notificationSettings, securityActions } from '@/mock';

export default function SettingsPage() {
  return (
    <div className={pageCls.page}>
      <PageHeader title="系统设置" subtitle="配置门店信息、通知策略与系统安全选项。" />

      <SectionCard title="门店信息" subtitle="基础信息与营业时间">
        <Form className={pageCls.settingsForm} layout="vertical" initialValues={{ name: 'Pilates Studio', phone: '400-820-8899', email: 'hello@pilates.com', hours: '06:00 - 22:00', address: '上海市静安区愚园路 168 号' }}>
          <Row gutter={18}>
            <Col span={12}><Form.Item label="门店名称" name="name"><Input className={pageCls.settingsInput} size="large" /></Form.Item></Col>
            <Col span={12}><Form.Item label="联系电话" name="phone"><Input className={pageCls.settingsInput} size="large" /></Form.Item></Col>
            <Col span={12}><Form.Item label="邮箱地址" name="email"><Input className={pageCls.settingsInput} size="large" /></Form.Item></Col>
            <Col span={12}><Form.Item label="营业时间" name="hours"><Input className={pageCls.settingsInput} size="large" /></Form.Item></Col>
            <Col span={24}><Form.Item label="门店地址" name="address"><Input className={pageCls.settingsInput} size="large" /></Form.Item></Col>
          </Row>
          <ActionButton icon={<SaveOutlined />}>保存更改</ActionButton>
        </Form>
      </SectionCard>

      <div className={pageCls.equalCol} style={{ marginTop: 24 }}>
        <div className={widgetCls.settingBlock}>
          <div className={widgetCls.detailHeader}>
            <div>
              <h3 className={widgetCls.detailTitle}>通知设置</h3>
              <div className={widgetCls.smallText}>配置系统通知和提醒</div>
            </div>
          </div>
          {notificationSettings.map((item) => (
            <div key={item.title} className={widgetCls.settingRow}>
              <div>
                <div className={widgetCls.recordTitle}>{item.title}</div>
                <div className={widgetCls.smallText}>{item.description}</div>
              </div>
              <span className={pageCls.settingSwitch}><Switch defaultChecked={item.enabled} /></span>
            </div>
          ))}
        </div>

        <div className={widgetCls.settingBlock}>
          <div className={widgetCls.detailHeader}>
            <div>
              <h3 className={widgetCls.detailTitle}>系统信息</h3>
              <div className={widgetCls.smallText}>当前版本和更新状态</div>
            </div>
          </div>
          <div className={widgetCls.recordList}>
            <div className={widgetCls.metricCard}>
              <div className={widgetCls.metricLabel}>系统版本</div>
              <div className={widgetCls.metricValue}>v2.6.1</div>
            </div>
            <div className={widgetCls.metricCard}>
              <div className={widgetCls.metricLabel}>最后更新</div>
              <div className={widgetCls.metricValue}>2026-03-28</div>
            </div>
            <div className={widgetCls.metricCard}>
              <div className={widgetCls.metricLabel}>运行状态</div>
              <div className={widgetCls.metricValue}>稳定</div>
            </div>
            <Button className={pageCls.settingsUtilityButton} size="large">检查更新</Button>
          </div>
        </div>
      </div>

      <div className={pageCls.equalCol}>
        <div className={widgetCls.settingBlock}>
          <div className={widgetCls.detailHeader}>
            <div>
              <h3 className={widgetCls.detailTitle}>安全设置</h3>
              <div className={widgetCls.smallText}>账户安全和权限管理</div>
            </div>
          </div>
          {securityActions.map((item) => (
            <div key={item.title} className={widgetCls.settingRow}>
              <div>
                <div className={widgetCls.recordTitle}>{item.title}</div>
                <div className={widgetCls.smallText}>{item.description}</div>
              </div>
              <ArrowRightOutlined />
            </div>
          ))}
        </div>

        <div className={widgetCls.settingBlock}>
          <div className={widgetCls.detailHeader}>
            <div>
              <h3 className={widgetCls.detailTitle}>数据管理</h3>
              <div className={widgetCls.smallText}>备份、导出与恢复数据</div>
            </div>
          </div>
          {dataActions.map((item) => (
            <div key={item.title} className={widgetCls.settingRow}>
              <div>
                <div className={widgetCls.recordTitle}>{item.title}</div>
                <div className={widgetCls.smallText}>{item.description}</div>
              </div>
              <ArrowRightOutlined />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
