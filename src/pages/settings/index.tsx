import { ArrowRightOutlined, SaveOutlined } from '@ant-design/icons';
import { App, Button, Col, Descriptions, Drawer, Form, Input, Row, Select, Switch } from 'antd';
import { useMemo, useState } from 'react';
import ActionButton from '@/components/ActionButton';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatusTag from '@/components/StatusTag';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import { dataActions, notificationSettings, securityActions } from '@/mock';

type StoreInfoValues = {
  name: string;
  phone: string;
  email: string;
  hours: string;
  address: string;
};

type NotificationItem = (typeof notificationSettings)[number] & { key: string };
type SecurityActionTitle = (typeof securityActions)[number]['title'];
type DataActionTitle = (typeof dataActions)[number]['title'];

type SecurityActionState = {
  title: SecurityActionTitle;
  description: string;
  status: '正常' | '待激活' | '处理中';
  detail: string;
};

type DataActionState = {
  title: DataActionTitle;
  description: string;
  status: '正常' | '待激活' | '处理中';
  detail: string;
};

type SecurityDrawerKey = SecurityActionTitle | null;
type DataDrawerKey = DataActionTitle | null;

const initialStoreInfo: StoreInfoValues = {
  name: 'Pilates Studio',
  phone: '400-820-8899',
  email: 'hello@pilates.com',
  hours: '06:00 - 22:00',
  address: '上海市静安区愚园路 168 号'
};

const todayText = () => new Date().toLocaleString('zh-CN', {
  hour12: false,
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
}).replace('/', '-').replace('/', '-');

export default function SettingsPage() {
  const [storeForm] = Form.useForm<StoreInfoValues>();
  const { message } = App.useApp();
  const [storeInfo, setStoreInfo] = useState(initialStoreInfo);
  const [savedStoreInfo, setSavedStoreInfo] = useState(initialStoreInfo);
  const [storeSavedAt, setStoreSavedAt] = useState('今天 09:20');
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    notificationSettings.map((item, index) => ({ ...item, key: `notification-${index + 1}` }))
  );
  const [savedNotifications, setSavedNotifications] = useState<NotificationItem[]>(
    notificationSettings.map((item, index) => ({ ...item, key: `notification-${index + 1}` }))
  );
  const [notificationSavedAt, setNotificationSavedAt] = useState('今天 09:30');
  const [securityState, setSecurityState] = useState<Record<SecurityActionTitle, SecurityActionState>>({
    修改密码: {
      title: '修改密码',
      description: '定期更新管理员账号密码',
      status: '正常',
      detail: '最近更新于 03-28 10:30'
    },
    两步验证: {
      title: '两步验证',
      description: '为核心账号开启短信或邮箱二次验证',
      status: '待激活',
      detail: '当前未开启二次验证'
    },
    权限管理: {
      title: '权限管理',
      description: '配置前台、店长和财务的页面权限',
      status: '处理中',
      detail: '最近一次权限核对在 03-25 完成'
    }
  });
  const [dataState, setDataState] = useState<Record<DataActionTitle, DataActionState>>({
    数据备份: {
      title: '数据备份',
      description: '每日自动备份课程、预约和交易数据',
      status: '正常',
      detail: '最近备份于 03-30 22:00'
    },
    导出数据: {
      title: '导出数据',
      description: '按时间范围导出经营与会员报表',
      status: '正常',
      detail: '最近导出：近 30 天经营报表'
    },
    数据恢复: {
      title: '数据恢复',
      description: '从最近一次备份恢复门店数据',
      status: '待激活',
      detail: '尚未执行恢复演练'
    }
  });
  const [passwordDraft, setPasswordDraft] = useState({ current: '', next: '', confirm: '' });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [exportRange, setExportRange] = useState('近 30 天');
  const [restoreSource, setRestoreSource] = useState('最近一次备份');
  const [systemVersion, setSystemVersion] = useState('v2.6.1');
  const [lastUpdated, setLastUpdated] = useState('2026-03-28');
  const [systemStatus, setSystemStatus] = useState<'稳定' | '检查中'>('稳定');
  const [openSecurityDrawer, setOpenSecurityDrawer] = useState<SecurityDrawerKey>(null);
  const [openDataDrawer, setOpenDataDrawer] = useState<DataDrawerKey>(null);
  const watchedStoreInfo = Form.useWatch([], storeForm) as Partial<StoreInfoValues> | undefined;

  const notificationDirtyCount = useMemo(
    () => notifications.filter((item, index) => item.enabled !== savedNotifications[index]?.enabled).length,
    [notifications, savedNotifications]
  );

  const storeChanged = JSON.stringify(watchedStoreInfo ?? savedStoreInfo) !== JSON.stringify(savedStoreInfo);

  const handleSaveStoreInfo = async () => {
    const values = await storeForm.validateFields();

    setStoreInfo(values);
    setSavedStoreInfo(values);
    setStoreSavedAt(todayText());
    message.success('门店信息已保存到当前页面状态');
  };

  const handleToggleNotification = (key: string, checked: boolean) => {
    setNotifications((current) => current.map((item) => (item.key === key ? { ...item, enabled: checked } : item)));
  };

  const handleSaveNotifications = () => {
    setSavedNotifications(notifications.map((item) => ({ ...item })));
    setNotificationSavedAt(todayText());
    message.success('通知设置已保存');
  };

  const handleCheckUpdate = () => {
    setSystemStatus('检查中');
    setSystemVersion('v2.6.2-beta');
    setLastUpdated('2026-04-02');
    setSystemStatus('稳定');
    message.success('已完成本地更新检查，发现预发布版本 v2.6.2-beta');
  };

  const handleSavePassword = () => {
    if (!passwordDraft.current || !passwordDraft.next || !passwordDraft.confirm) {
      message.warning('请完整填写密码信息');
      return;
    }

    if (passwordDraft.next !== passwordDraft.confirm) {
      message.error('两次输入的新密码不一致');
      return;
    }

    const timestamp = todayText();

    setSecurityState((current) => ({
      ...current,
      修改密码: {
        ...current.修改密码,
        status: '正常',
        detail: `最近更新于 ${timestamp}`
      }
    }));
    setPasswordDraft({ current: '', next: '', confirm: '' });
    message.success('管理员密码更新记录已保存');
    setOpenSecurityDrawer(null);
  };

  const handleSaveTwoFactor = () => {
    setSecurityState((current) => ({
      ...current,
      两步验证: {
        ...current.两步验证,
        status: twoFactorEnabled ? '正常' : '待激活',
        detail: twoFactorEnabled ? '短信与邮箱二次验证已开启' : '当前未开启二次验证'
      }
    }));
    message.success(twoFactorEnabled ? '已开启两步验证' : '已关闭两步验证');
    setOpenSecurityDrawer(null);
  };

  const handleSyncPermissions = () => {
    const timestamp = todayText();

    setSecurityState((current) => ({
      ...current,
      权限管理: {
        ...current.权限管理,
        status: '正常',
        detail: `已在 ${timestamp} 完成本地权限模板核对`
      }
    }));
    message.success('角色权限检查结果已记录');
    setOpenSecurityDrawer(null);
  };

  const handleRunBackup = () => {
    const timestamp = todayText();

    setDataState((current) => ({
      ...current,
      数据备份: {
        ...current.数据备份,
        status: '正常',
        detail: `最近备份于 ${timestamp}`
      }
    }));
    message.success('已完成一次本地备份演练');
    setOpenDataDrawer(null);
  };

  const handleExportData = () => {
    const timestamp = todayText();

    setDataState((current) => ({
      ...current,
      导出数据: {
        ...current.导出数据,
        status: '正常',
        detail: `最近导出：${exportRange} · ${timestamp}`
      }
    }));
    message.success(`已记录 ${exportRange} 的本地导出操作`);
    setOpenDataDrawer(null);
  };

  const handleRestoreData = () => {
    const timestamp = todayText();

    setDataState((current) => ({
      ...current,
      数据恢复: {
        ...current.数据恢复,
        status: '处理中',
        detail: `已从“${restoreSource}”执行恢复演练 · ${timestamp}`
      }
    }));
    message.success(`已记录从 ${restoreSource} 执行的数据恢复演练`);
    setOpenDataDrawer(null);
  };

  return (
    <div className={pageCls.page}>
      <PageHeader title="系统设置" subtitle="配置门店信息、通知策略与系统安全选项。" />

      <SectionCard title="门店信息" subtitle={`基础信息与营业时间 · 最近保存 ${storeSavedAt}${storeChanged ? ' · 有未保存修改' : ''}`}>
        <Form
          form={storeForm}
          className={pageCls.settingsForm}
          layout="vertical"
          initialValues={storeInfo}
        >
          <Row gutter={18}>
            <Col span={12}><Form.Item label="门店名称" name="name" rules={[{ required: true, message: '请输入门店名称' }]}><Input className={pageCls.settingsInput} size="large" /></Form.Item></Col>
            <Col span={12}><Form.Item label="联系电话" name="phone" rules={[{ required: true, message: '请输入联系电话' }]}><Input className={pageCls.settingsInput} size="large" /></Form.Item></Col>
            <Col span={12}><Form.Item label="邮箱地址" name="email" rules={[{ required: true, message: '请输入邮箱地址' }, { type: 'email', message: '请输入有效邮箱地址' }]}><Input className={pageCls.settingsInput} size="large" /></Form.Item></Col>
            <Col span={12}><Form.Item label="营业时间" name="hours" rules={[{ required: true, message: '请输入营业时间' }]}><Input className={pageCls.settingsInput} size="large" /></Form.Item></Col>
            <Col span={24}><Form.Item label="门店地址" name="address" rules={[{ required: true, message: '请输入门店地址' }]}><Input className={pageCls.settingsInput} size="large" /></Form.Item></Col>
          </Row>
          <ActionButton icon={<SaveOutlined />} onClick={handleSaveStoreInfo}>保存更改</ActionButton>
        </Form>
      </SectionCard>

      <div className={pageCls.equalCol} style={{ marginTop: 24 }}>
        <div className={pageCls.settingsSectionShell}>
          <div className={widgetCls.detailHeader}>
            <div>
              <h3 className={widgetCls.detailTitle}>通知设置</h3>
              <div className={widgetCls.smallText}>配置系统通知和提醒 · 最近保存 {notificationSavedAt}</div>
            </div>
            <ActionButton ghost icon={<SaveOutlined />} onClick={handleSaveNotifications}>
              保存 {notificationDirtyCount > 0 ? `(${notificationDirtyCount})` : ''}
            </ActionButton>
          </div>
          <div className={pageCls.settingsSectionList}>
            {notifications.map((item) => (
              <div key={item.key} className={widgetCls.settingRow}>
                <div>
                  <div className={widgetCls.recordTitle}>{item.title}</div>
                  <div className={widgetCls.smallText}>{item.description}</div>
                </div>
                <span className={pageCls.settingSwitch}><Switch checked={item.enabled} onChange={(checked) => handleToggleNotification(item.key, checked)} /></span>
              </div>
            ))}
          </div>
        </div>

        <div className={pageCls.settingsSectionShell}>
          <div className={widgetCls.detailHeader}>
            <div>
              <h3 className={widgetCls.detailTitle}>系统信息</h3>
              <div className={widgetCls.smallText}>当前版本和更新状态</div>
            </div>
          </div>
          <div className={widgetCls.recordList}>
            <div className={widgetCls.metricCard}>
              <div className={widgetCls.metricLabel}>系统版本</div>
              <div className={widgetCls.metricValue}>{systemVersion}</div>
            </div>
            <div className={widgetCls.metricCard}>
              <div className={widgetCls.metricLabel}>最后更新</div>
              <div className={widgetCls.metricValue}>{lastUpdated}</div>
            </div>
            <div className={widgetCls.metricCard}>
              <div className={widgetCls.metricLabel}>运行状态</div>
              <div className={widgetCls.metricValue}>{systemStatus}</div>
            </div>
            <Button className={pageCls.settingsUtilityButton} size="large" onClick={handleCheckUpdate}>检查更新</Button>
          </div>
        </div>
      </div>

      <div className={pageCls.equalCol}>
        <div className={pageCls.settingsSectionShell}>
          <div className={widgetCls.detailHeader}>
            <div>
              <h3 className={widgetCls.detailTitle}>安全设置</h3>
              <div className={widgetCls.smallText}>账户安全和权限管理</div>
            </div>
          </div>
          <div className={pageCls.settingsSectionList}>
            {securityActions.map((item) => (
              <button
                key={item.title}
                type="button"
                className={widgetCls.settingRow}
                style={{ width: '100%', border: 0, background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
                onClick={() => {
                  if (item.title === '两步验证') {
                    setTwoFactorEnabled(securityState.两步验证.status === '正常');
                  }
                  setOpenSecurityDrawer(item.title);
                }}
              >
                <div>
                  <div className={widgetCls.recordTitle}>{item.title}</div>
                  <div className={widgetCls.smallText}>{securityState[item.title].detail}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <StatusTag status={securityState[item.title].status} />
                  <ArrowRightOutlined />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className={pageCls.settingsSectionShell}>
          <div className={widgetCls.detailHeader}>
            <div>
              <h3 className={widgetCls.detailTitle}>数据管理</h3>
              <div className={widgetCls.smallText}>备份、导出与恢复数据</div>
            </div>
          </div>
          <div className={pageCls.settingsSectionList}>
            {dataActions.map((item) => (
              <button
                key={item.title}
                type="button"
                className={widgetCls.settingRow}
                style={{ width: '100%', border: 0, background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
                onClick={() => setOpenDataDrawer(item.title)}
              >
                <div>
                  <div className={widgetCls.recordTitle}>{item.title}</div>
                  <div className={widgetCls.smallText}>{dataState[item.title].detail}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <StatusTag status={dataState[item.title].status} />
                  <ArrowRightOutlined />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <Drawer
        open={openSecurityDrawer !== null}
        width={420}
        title={openSecurityDrawer ?? '安全设置'}
        onClose={() => setOpenSecurityDrawer(null)}
      >
        {openSecurityDrawer ? (
          <div className={pageCls.settingsDetailDrawerBody}>
            <div className={widgetCls.detailOverviewPanel}>
              <div className={widgetCls.recordTitle} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {securityState[openSecurityDrawer].title}
                <StatusTag status={securityState[openSecurityDrawer].status} />
              </div>
              <div className={widgetCls.detailOverviewText}>{securityState[openSecurityDrawer].description}</div>
              <div className={widgetCls.detailOverviewText}>{securityState[openSecurityDrawer].detail}</div>
            </div>

            {openSecurityDrawer === '修改密码' ? (
              <div className={pageCls.settingsDetailForm}>
                <Input.Password className={pageCls.settingsInput} placeholder="当前密码" value={passwordDraft.current} onChange={(event) => setPasswordDraft((current) => ({ ...current, current: event.target.value }))} />
                <Input.Password className={pageCls.settingsInput} placeholder="新密码" value={passwordDraft.next} onChange={(event) => setPasswordDraft((current) => ({ ...current, next: event.target.value }))} />
                <Input.Password className={pageCls.settingsInput} placeholder="确认新密码" value={passwordDraft.confirm} onChange={(event) => setPasswordDraft((current) => ({ ...current, confirm: event.target.value }))} />
                <Button type="primary" className={pageCls.cardActionPrimary} size="large" onClick={handleSavePassword}>更新密码</Button>
              </div>
            ) : null}

            {openSecurityDrawer === '两步验证' ? (
              <div className={pageCls.settingsDetailForm}>
                <div className={widgetCls.settingRow} style={{ margin: 0 }}>
                  <div>
                    <div className={widgetCls.recordTitle}>开启二次验证</div>
                    <div className={widgetCls.smallText}>启用后，核心账号登录需经过短信或邮箱验证。</div>
                  </div>
                  <span className={pageCls.settingSwitch}><Switch checked={twoFactorEnabled} onChange={setTwoFactorEnabled} /></span>
                </div>
                <Button type="primary" className={pageCls.cardActionPrimary} size="large" onClick={handleSaveTwoFactor}>保存验证策略</Button>
              </div>
            ) : null}

            {openSecurityDrawer === '权限管理' ? (
              <div className={pageCls.settingsDetailDrawerBody}>
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="当前状态">{securityState.权限管理.detail}</Descriptions.Item>
                  <Descriptions.Item label="本地联动">角色页权限矩阵仍可继续编辑与保存</Descriptions.Item>
                </Descriptions>
                <Button type="primary" className={pageCls.cardActionPrimary} size="large" onClick={handleSyncPermissions}>记录本次核对</Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Drawer>

      <Drawer
        open={openDataDrawer !== null}
        width={420}
        title={openDataDrawer ?? '数据管理'}
        onClose={() => setOpenDataDrawer(null)}
      >
        {openDataDrawer ? (
          <div className={pageCls.settingsDetailDrawerBody}>
            <div className={widgetCls.detailOverviewPanel}>
              <div className={widgetCls.recordTitle} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {dataState[openDataDrawer].title}
                <StatusTag status={dataState[openDataDrawer].status} />
              </div>
              <div className={widgetCls.detailOverviewText}>{dataState[openDataDrawer].description}</div>
              <div className={widgetCls.detailOverviewText}>{dataState[openDataDrawer].detail}</div>
            </div>

            {openDataDrawer === '数据备份' ? (
              <Button type="primary" className={pageCls.cardActionPrimary} size="large" onClick={handleRunBackup}>立即备份</Button>
            ) : null}

            {openDataDrawer === '导出数据' ? (
              <div className={pageCls.settingsDetailForm}>
                <div>
                  <div className={`${widgetCls.smallText} ${pageCls.settingsFieldLabel}`}>导出时间范围</div>
                  <Select
                    value={exportRange}
                    className={pageCls.settingsInput}
                    style={{ width: '100%' }}
                    options={['近 7 天', '近 30 天', '本季度'].map((item) => ({ label: item, value: item }))}
                    onChange={setExportRange}
                  />
                </div>
                <Button type="primary" className={pageCls.cardActionPrimary} size="large" onClick={handleExportData}>记录导出</Button>
              </div>
            ) : null}

            {openDataDrawer === '数据恢复' ? (
              <div className={pageCls.settingsDetailForm}>
                <div>
                  <div className={`${widgetCls.smallText} ${pageCls.settingsFieldLabel}`}>恢复来源</div>
                  <Select
                    value={restoreSource}
                    className={pageCls.settingsInput}
                    style={{ width: '100%' }}
                    options={['最近一次备份', '03-28 每日备份', '03-21 周度备份'].map((item) => ({ label: item, value: item }))}
                    onChange={setRestoreSource}
                  />
                </div>
                <Button type="primary" className={pageCls.cardActionPrimary} size="large" onClick={handleRestoreData}>执行恢复演练</Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
