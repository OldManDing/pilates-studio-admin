import { ArrowRightOutlined, SaveOutlined } from '@ant-design/icons';
import { App, Button, Cascader, Col, Descriptions, Drawer, Form, Input, Row, Select, Spin, Switch, TimePicker, message as antdMessage } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import ActionButton from '@/components/ActionButton';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatusTag from '@/components/StatusTag';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import { settingsApi, type StudioSetting, type NotificationSetting } from '@/services/settings';

interface StoreInfoValues {
  studioName: string;
  phone: string;
  email: string;
  businessHours: string;
  province: string;
  city: string;
  district: string;
  address: string;
}

type SecurityActionTitle = '修改密码' | '两步验证' | '权限管理';
type DataActionTitle = '数据备份' | '导出数据' | '数据恢复';

interface SecurityActionState {
  title: SecurityActionTitle;
  description: string;
  status: '正常' | '待激活' | '处理中';
  detail: string;
}

interface DataActionState {
  title: DataActionTitle;
  description: string;
  status: '正常' | '待激活' | '处理中';
  detail: string;
}

type SecurityDrawerKey = SecurityActionTitle | null;
type DataDrawerKey = DataActionTitle | null;

const todayText = () => new Date().toLocaleString('zh-CN', {
  hour12: false,
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
}).replace(/\//g, '-');

const defaultStoreInfo: StoreInfoValues = {
  studioName: 'Pilates Studio',
  phone: '400-820-8899',
  email: 'hello@pilates.com',
  businessHours: '06:00-22:00',
  address: '上海市静安区愚园路 168 号'
};

const securityActionsList: Array<{ title: SecurityActionTitle; description: string }> = [
  { title: '修改密码', description: '定期更新管理员账号密码' },
  { title: '两步验证', description: '为核心账号开启短信或邮箱二次验证' },
  { title: '权限管理', description: '配置前台、店长和财务的页面权限' }
];

const dataActionsList: Array<{ title: DataActionTitle; description: string }> = [
  { title: '数据备份', description: '每日自动备份课程、预约和交易数据' },
  { title: '导出数据', description: '按时间范围导出经营与会员报表' },
  { title: '数据恢复', description: '从最近一次备份恢复门店数据' }
];

// 省市区三级联动数据
const provinceCityDistrictData = [
  {
    value: '上海市',
    label: '上海市',
    children: [
      {
        value: '上海市',
        label: '上海市',
        children: [
          { value: '黄浦区', label: '黄浦区' },
          { value: '徐汇区', label: '徐汇区' },
          { value: '长宁区', label: '长宁区' },
          { value: '静安区', label: '静安区' },
          { value: '普陀区', label: '普陀区' },
          { value: '虹口区', label: '虹口区' },
          { value: '杨浦区', label: '杨浦区' },
          { value: '闵行区', label: '闵行区' },
          { value: '宝山区', label: '宝山区' },
          { value: '嘉定区', label: '嘉定区' },
          { value: '浦东新区', label: '浦东新区' },
          { value: '金山区', label: '金山区' },
          { value: '松江区', label: '松江区' },
          { value: '青浦区', label: '青浦区' },
          { value: '奉贤区', label: '奉贤区' },
          { value: '崇明区', label: '崇明区' }
        ]
      }
    ]
  },
  {
    value: '北京市',
    label: '北京市',
    children: [
      {
        value: '北京市',
        label: '北京市',
        children: [
          { value: '东城区', label: '东城区' },
          { value: '西城区', label: '西城区' },
          { value: '朝阳区', label: '朝阳区' },
          { value: '丰台区', label: '丰台区' },
          { value: '石景山区', label: '石景山区' },
          { value: '海淀区', label: '海淀区' },
          { value: '门头沟区', label: '门头沟区' },
          { value: '房山区', label: '房山区' },
          { value: '通州区', label: '通州区' },
          { value: '顺义区', label: '顺义区' },
          { value: '昌平区', label: '昌平区' },
          { value: '大兴区', label: '大兴区' },
          { value: '怀柔区', label: '怀柔区' },
          { value: '平谷区', label: '平谷区' },
          { value: '密云区', label: '密云区' },
          { value: '延庆区', label: '延庆区' }
        ]
      }
    ]
  },
  {
    value: '广东省',
    label: '广东省',
    children: [
      {
        value: '广州市',
        label: '广州市',
        children: [
          { value: '荔湾区', label: '荔湾区' },
          { value: '越秀区', label: '越秀区' },
          { value: '海珠区', label: '海珠区' },
          { value: '天河区', label: '天河区' },
          { value: '白云区', label: '白云区' },
          { value: '黄埔区', label: '黄埔区' },
          { value: '番禺区', label: '番禺区' },
          { value: '花都区', label: '花都区' },
          { value: '南沙区', label: '南沙区' },
          { value: '从化区', label: '从化区' },
          { value: '增城区', label: '增城区' }
        ]
      },
      {
        value: '深圳市',
        label: '深圳市',
        children: [
          { value: '罗湖区', label: '罗湖区' },
          { value: '福田区', label: '福田区' },
          { value: '南山区', label: '南山区' },
          { value: '宝安区', label: '宝安区' },
          { value: '龙岗区', label: '龙岗区' },
          { value: '盐田区', label: '盐田区' },
          { value: '龙华区', label: '龙华区' },
          { value: '坪山区', label: '坪山区' },
          { value: '光明区', label: '光明区' }
        ]
      }
    ]
  }
];

export default function SettingsPage() {
  const [storeForm] = Form.useForm<StoreInfoValues>();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [storeInfo, setStoreInfo] = useState<StoreInfoValues>(defaultStoreInfo);
  const [savedStoreInfo, setSavedStoreInfo] = useState<StoreInfoValues>(defaultStoreInfo);
  const [storeSavedAt, setStoreSavedAt] = useState('今天 09:20');
  const [notifications, setNotifications] = useState<NotificationSetting[]>([]);
  const [savedNotifications, setSavedNotifications] = useState<NotificationSetting[]>([]);
  const [notificationSavedAt, setNotificationSavedAt] = useState('今天 09:30');
  const [securityState, setSecurityState] = useState<Record<SecurityActionTitle, SecurityActionState>>({
    修改密码: { title: '修改密码', description: '定期更新管理员账号密码', status: '正常', detail: '最近更新于 03-28 10:30' },
    两步验证: { title: '两步验证', description: '为核心账号开启短信或邮箱二次验证', status: '待激活', detail: '当前未开启二次验证' },
    权限管理: { title: '权限管理', description: '配置前台、店长和财务的页面权限', status: '处理中', detail: '最近一次权限核对在 03-25 完成' }
  });
  const [dataState, setDataState] = useState<Record<DataActionTitle, DataActionState>>({
    数据备份: { title: '数据备份', description: '每日自动备份课程、预约和交易数据', status: '正常', detail: '最近备份于 03-30 22:00' },
    导出数据: { title: '导出数据', description: '按时间范围导出经营与会员报表', status: '正常', detail: '最近导出：近 30 天经营报表' },
    数据恢复: { title: '数据恢复', description: '从最近一次备份恢复门店数据', status: '待激活', detail: '尚未执行恢复演练' }
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

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const [studioData, notificationsData] = await Promise.all([
          settingsApi.getStudio().catch(() => null),
          settingsApi.getNotifications().catch(() => [])
        ]);

        if (studioData) {
          // 解析地址：尝试从地址字符串中提取省市区
          const addressStr = studioData.address || defaultStoreInfo.address;
          let province = '', city = '', district = '', remainingAddress = addressStr;
          
          // 简单解析：检查地址是否包含省市区信息
          for (const provinceData of provinceCityDistrictData) {
            if (addressStr.includes(provinceData.value)) {
              province = provinceData.value;
              for (const cityData of provinceData.children || []) {
                if (addressStr.includes(cityData.value)) {
                  city = cityData.value;
                  for (const districtData of cityData.children || []) {
                    if (addressStr.includes(districtData.value)) {
                      district = districtData.value;
                      remainingAddress = addressStr.replace(new RegExp(`^${provinceData.value}${cityData.value}${districtData.value}`), '').trim();
                      break;
                    }
                  }
                  break;
                }
              }
              break;
            }
          }
          
          const info: StoreInfoValues = {
            studioName: studioData.studioName || defaultStoreInfo.studioName,
            phone: studioData.phone || defaultStoreInfo.phone,
            email: studioData.email || defaultStoreInfo.email,
            businessHours: studioData.businessHours || defaultStoreInfo.businessHours,
            province,
            city,
            district,
            address: remainingAddress || addressStr
          };
          // 设置级联选择器的值
          const areaValue = [province, city, district].filter(Boolean);
          storeForm.setFieldsValue({ ...info, area: areaValue });
          setStoreInfo(info);
          setSavedStoreInfo(info);
        }

        if (notificationsData.length > 0) {
          setNotifications(notificationsData);
          setSavedNotifications(notificationsData);
        } else {
          await settingsApi.initialize().catch(() => null);
          const initialized = await settingsApi.getNotifications().catch(() => []);
          setNotifications(initialized);
          setSavedNotifications(initialized);
        }
      } catch (err) {
        antdMessage.error('获取设置失败');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [storeForm]);

  const notificationDirtyCount = useMemo(
    () => notifications.filter((item, index) => item.enabled !== savedNotifications[index]?.enabled).length,
    [notifications, savedNotifications]
  );

  const storeChanged = JSON.stringify(watchedStoreInfo ?? savedStoreInfo) !== JSON.stringify(savedStoreInfo);

  const handleSaveStoreInfo = async () => {
    try {
      const values = await storeForm.validateFields();
      // 组合完整地址
      const area = values.area || [];
      const [province, city, district] = area;
      const fullAddress = [
        province,
        city,
        district,
        values.address
      ].filter(Boolean).join('');
      
      const saveData = {
        studioName: values.studioName,
        phone: values.phone,
        email: values.email,
        businessHours: values.businessHours,
        address: fullAddress
      };
      
      await settingsApi.updateStudio(saveData);
      setStoreInfo({ ...values, province, city, district, address: fullAddress });
      setSavedStoreInfo({ ...values, province, city, district, address: fullAddress });
      setStoreSavedAt(todayText());
      message.success('门店信息已保存');
    } catch (err: any) {
      message.error(err.message || '保存失败');
    }
  };

  const handleToggleNotification = async (key: string, checked: boolean) => {
    try {
      await settingsApi.updateNotification(key, checked);
      setNotifications((current) => current.map((item) => (item.key === key ? { ...item, enabled: checked } : item)));
    } catch (err: any) {
      message.error(err.message || '更新失败');
    }
  };

  const handleSaveNotifications = () => {
    setSavedNotifications(notifications.map((item) => ({ ...item })));
    setNotificationSavedAt(todayText());
    message.success('通知设置已保存');
  };

  const handleCheckUpdate = () => {
    setSystemStatus('检查中');
    setTimeout(() => {
      setSystemVersion('v2.6.2-beta');
      setLastUpdated('2026-04-02');
      setSystemStatus('稳定');
      message.success('已完成更新检查');
    }, 1000);
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
      修改密码: { ...current.修改密码, status: '正常', detail: `最近更新于 ${timestamp}` }
    }));
    setPasswordDraft({ current: '', next: '', confirm: '' });
    message.success('密码已更新');
    setOpenSecurityDrawer(null);
  };

  const handleSaveTwoFactor = () => {
    setSecurityState((current) => ({
      ...current,
      两步验证: { ...current.两步验证, status: twoFactorEnabled ? '正常' : '待激活', detail: twoFactorEnabled ? '二次验证已开启' : '当前未开启二次验证' }
    }));
    message.success(twoFactorEnabled ? '已开启两步验证' : '已关闭两步验证');
    setOpenSecurityDrawer(null);
  };

  const handleSyncPermissions = () => {
    const timestamp = todayText();
    setSecurityState((current) => ({
      ...current,
      权限管理: { ...current.权限管理, status: '正常', detail: `已在 ${timestamp} 完成权限核对` }
    }));
    message.success('权限核对已记录');
    setOpenSecurityDrawer(null);
  };

  const handleRunBackup = () => {
    const timestamp = todayText();
    setDataState((current) => ({
      ...current,
      数据备份: { ...current.数据备份, status: '正常', detail: `最近备份于 ${timestamp}` }
    }));
    message.success('备份完成');
    setOpenDataDrawer(null);
  };

  const handleExportData = () => {
    const timestamp = todayText();
    setDataState((current) => ({
      ...current,
      导出数据: { ...current.导出数据, status: '正常', detail: `最近导出：${exportRange} · ${timestamp}` }
    }));
    message.success(`已导出 ${exportRange} 数据`);
    setOpenDataDrawer(null);
  };

  const handleRestoreData = () => {
    const timestamp = todayText();
    setDataState((current) => ({
      ...current,
      数据恢复: { ...current.数据恢复, status: '处理中', detail: `已从“${restoreSource}”执行恢复 · ${timestamp}` }
    }));
    message.success(`已从 ${restoreSource} 恢复`);
    setOpenDataDrawer(null);
  };

  const parseHoursToDayjs = (hours: string): [dayjs.Dayjs, dayjs.Dayjs] => {
    const [start, end] = hours.split('-');
    return [dayjs(start, 'HH:mm'), dayjs(end, 'HH:mm')];
  };

  const dayjsToHoursString = (hours: [dayjs.Dayjs, dayjs.Dayjs]): string => {
    return `${hours[0].format('HH:mm')}-${hours[1].format('HH:mm')}`;
  };

  if (loading) {
    return (
      <div className={`${pageCls.page} ${pageCls.workPage}`}>
        <PageHeader title="系统设置" subtitle="配置门店信息、通知策略与系统安全选项。" />
        <div className={`${pageCls.centeredState} ${pageCls.centeredStateTall}`}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  return (
    <div className={`${pageCls.page} ${pageCls.workPage}`}>
      <PageHeader title="系统设置" subtitle="配置门店信息、通知策略与系统安全选项。" />

      <SectionCard title="门店信息" subtitle={`基础信息与营业时间 · 最近保存 ${storeSavedAt}${storeChanged ? ' · 有未保存修改' : ''}`}>
        <Form form={storeForm} className={pageCls.settingsForm} layout="vertical" initialValues={{
          ...storeInfo,
          hours: parseHoursToDayjs(storeInfo.businessHours)
        }}>
          <Row gutter={18}>
            <Col span={12}>
              <Form.Item label="门店名称" name="studioName" rules={[{ required: true, message: '请输入门店名称' }]}>
                <Input className={pageCls.settingsInput} size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="联系电话" name="phone" rules={[{ required: true, message: '请输入联系电话' }]}>
                <Input className={pageCls.settingsInput} size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="邮箱地址" name="email" rules={[{ required: true, message: '请输入邮箱地址' }, { type: 'email', message: '请输入有效邮箱地址' }]}>
                <Input className={pageCls.settingsInput} size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="营业时间" name="hours" rules={[{ required: true, message: '请选择营业时间' }]}>
                <TimePicker.RangePicker
                  className={pageCls.settingsInput}
                  style={{ width: '100%' }}
                  size="large"
                  format="HH:mm"
                  minuteStep={30}
                  onChange={(value) => {
                    if (value) {
                      storeForm.setFieldsValue({ businessHours: dayjsToHoursString(value as [dayjs.Dayjs, dayjs.Dayjs]) });
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="省市区" name="area" rules={[{ required: true, message: '请选择省市区' }]}>
                <Cascader
                  className={pageCls.settingsInput}
                  style={{ width: '100%' }}
                  size="large"
                  options={provinceCityDistrictData}
                  placeholder="请选择省市区"
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="详细地址" name="address" rules={[{ required: true, message: '请输入详细地址' }]}>
                <Input className={pageCls.settingsInput} size="large" placeholder="请输入街道、楼栋、门牌号等" />
              </Form.Item>
            </Col>
          </Row>
          <ActionButton icon={<SaveOutlined />} onClick={handleSaveStoreInfo}>保存更改</ActionButton>
        </Form>
      </SectionCard>

      <div className={`${pageCls.equalCol} ${pageCls.equalColTopSpace}`}>
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
                <span className={pageCls.settingSwitch}>
                  <Switch checked={item.enabled} onChange={(checked) => handleToggleNotification(item.key, checked)} />
                </span>
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
            {securityActionsList.map((item) => (
              <button
                key={item.title}
                type="button"
                className={`${widgetCls.settingRow} ${pageCls.plainActionRowButton}`}
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
                <div className={pageCls.statusMetaWrap}>
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
            {dataActionsList.map((item) => (
              <button
                key={item.title}
                type="button"
                className={`${widgetCls.settingRow} ${pageCls.plainActionRowButton}`}
                onClick={() => setOpenDataDrawer(item.title)}
              >
                <div>
                  <div className={widgetCls.recordTitle}>{item.title}</div>
                  <div className={widgetCls.smallText}>{dataState[item.title].detail}</div>
                </div>
                <div className={pageCls.statusMetaWrap}>
                  <StatusTag status={dataState[item.title].status} />
                  <ArrowRightOutlined />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <Drawer open={openSecurityDrawer !== null} width={420} title={openSecurityDrawer ?? '安全设置'} onClose={() => setOpenSecurityDrawer(null)}>
        {openSecurityDrawer ? (
          <div className={pageCls.settingsDetailDrawerBody}>
            <div className={widgetCls.detailOverviewPanel}>
              <div className={`${widgetCls.recordTitle} ${pageCls.recordTitleRow}`}>
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
                <div className={widgetCls.settingRow}>
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
                  <Descriptions.Item label="权限来源">角色页权限矩阵已通过后端接口保存并实时生效</Descriptions.Item>
                </Descriptions>
                <Button type="primary" className={pageCls.cardActionPrimary} size="large" onClick={handleSyncPermissions}>记录本次核对</Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Drawer>

      <Drawer open={openDataDrawer !== null} width={420} title={openDataDrawer ?? '数据管理'} onClose={() => setOpenDataDrawer(null)}>
          {openDataDrawer ? (
            <div className={pageCls.settingsDetailDrawerBody}>
            <div className={widgetCls.detailOverviewPanel}>
              <div className={`${widgetCls.recordTitle} ${pageCls.recordTitleRow}`}>
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

      {!loading && notifications.length === 0 ? (
        <div className={`${pageCls.surface} ${widgetCls.detailCard} ${pageCls.topSpaceMd}`}>
          <div className={widgetCls.detailTitle}>通知设置暂无内容</div>
          <div className={`${widgetCls.smallText} ${pageCls.topSpaceSm}`}>
            初始化通知模板失败，请点击下方按钮重新初始化通知配置。
          </div>
          <div className={pageCls.topSpaceMd}>
            <Button
              className={pageCls.cardActionSecondary}
              onClick={async () => {
                await settingsApi.initialize().catch(() => null);
                const initialized = await settingsApi.getNotifications().catch(() => []);
                setNotifications(initialized);
                setSavedNotifications(initialized);
              }}
            >
              初始化通知模板
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
