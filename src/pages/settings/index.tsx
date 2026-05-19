import { App, Button, Cascader, Col, Descriptions, Drawer, Form, Input, InputNumber, Row, Select, Spin, Switch, TimePicker, message as antdMessage } from 'antd';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import SectionCard from '@/components/SectionCard';
import StatusTag from '@/components/StatusTag';
import { SETTINGS_DETAIL_DRAWER_WIDTH } from '@/styles/dimensions';
import pageCls from '@/styles/page.module.css';
import widgetCls from '@/styles/widgets.module.css';
import { DEFAULT_MINI_PAGE_IMAGES, settingsApi, type MiniPageImageSetting, type NotificationSetting } from '@/services/settings';
import { authApi } from '@/services/auth';
import { getErrorMessage } from '@/utils/errors';
import { hasRequiredPermissions } from '@/utils/menu';
import {
  SettingsActionRow,
  SettingsOverviewCard,
  type SettingsOverviewMetaItem,
  type SettingsOverviewMetric,
} from './components';
import styles from './index.module.css';

interface StoreInfoValues {
  studioName: string;
  phone: string;
  email: string;
  businessHours: string;
  province: string;
  city: string;
  district: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  imageUrl?: string;
  area?: string[];
  hours?: [dayjs.Dayjs, dayjs.Dayjs];
}

const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024;

function validateImageFile(file: File) {
  if (!file.type.startsWith('image/')) {
    return '仅支持上传图片文件';
  }

  if (file.size > MAX_IMAGE_FILE_SIZE) {
    return '图片文件过大，请上传 10MB 以内图片';
  }

  return '';
}

type SecurityActionTitle = '修改密码' | '两步验证' | '权限管理';
type DataActionTitle = '导出备份' | '导出数据' | '数据恢复';

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

const formatStoreAddress = (info: Pick<StoreInfoValues, 'province' | 'city' | 'district' | 'address'>) => {
  const prefix = [info.province, info.city, info.district].filter(Boolean).join(' ');

  if (!info.address) {
    return prefix || '待补充门店地址';
  }

  return prefix && info.address.startsWith(prefix) ? info.address : `${prefix} ${info.address}`.trim();
};

const normalizeAddressText = (value?: string | null) => (value || '').replace(/\s+/g, '');

const todayText = () => new Date().toLocaleString('zh-CN', {
  hour12: false,
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
}).replace(/\//g, '-');

function parseHoursToDayjs(hours: string): [dayjs.Dayjs, dayjs.Dayjs] {
  const [start, end] = hours.split('-');
  return [dayjs(start, 'HH:mm'), dayjs(end, 'HH:mm')];
}

function dayjsToHoursString(hours: [dayjs.Dayjs, dayjs.Dayjs]): string {
  return `${hours[0].format('HH:mm')}-${hours[1].format('HH:mm')}`;
}

const PLACEHOLDER_STORE_INFO: StoreInfoValues = {
  studioName: '',
  phone: '',
  email: '',
  businessHours: '06:00-22:00',
  province: '',
  city: '',
  district: '',
  address: '',
  latitude: null,
  longitude: null,
};

const defaultStoreInfo: StoreInfoValues = {
  ...PLACEHOLDER_STORE_INFO,
  area: [],
};

const HIDDEN_MINI_PAGE_IMAGE_KEYS = new Set(['coaches']);

const normalizeMiniPageImages = (items: MiniPageImageSetting[]) => items
  .filter((item) => !HIDDEN_MINI_PAGE_IMAGE_KEYS.has(item.pageKey));

const MAX_RESTORE_FILE_SIZE = 10 * 1024 * 1024;
const BACKUP_REQUIRED_DATA_KEYS = ['members', 'coaches', 'courses', 'sessions', 'bookings', 'transactions', 'membershipPlans', 'adminUsers'] as const;

function validateRestoreFile(file: File) {
  const lowerName = file.name.toLowerCase();
  if (!lowerName.endsWith('.json')) {
    return '仅支持上传 .json 备份文件';
  }

  if (file.size <= 0) {
    return '备份文件为空，请重新选择';
  }

  if (file.size > MAX_RESTORE_FILE_SIZE) {
    return '备份文件过大，请上传 10MB 以内文件';
  }

  return '';
}

function validateRestorePayload(rawText: string) {
  try {
    const payload = JSON.parse(rawText) as { version?: string; data?: Record<string, unknown> };
    if (!payload || typeof payload !== 'object') {
      return '备份文件格式无效';
    }

    if (!payload.version || typeof payload.version !== 'string') {
      return '备份文件缺少 version 字段';
    }

    if (!payload.data || typeof payload.data !== 'object') {
      return '备份文件缺少 data 数据块';
    }

    const missingKeys = BACKUP_REQUIRED_DATA_KEYS.filter((key) => !(key in payload.data!));
    if (missingKeys.length > 0) {
      return `备份文件缺少字段：${missingKeys.join('、')}`;
    }

    return '';
  } catch {
    return '备份文件不是有效 JSON';
  }
}

const securityActionsList: Array<{ title: SecurityActionTitle; description: string }> = [
  { title: '修改密码', description: '定期更新管理员账号密码' },
  { title: '两步验证', description: '为核心账号开启验证器二次校验' },
  { title: '权限管理', description: '配置前台、店长和财务的页面权限' }
];

const dataActionsList: Array<{ title: DataActionTitle; description: string }> = [
  { title: '导出备份', description: '下载当前数据快照用于人工备份' },
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
  },
  {
    value: '江苏省',
    label: '江苏省',
    children: [
      {
        value: '南京市',
        label: '南京市',
        children: [
          { value: '玄武区', label: '玄武区' },
          { value: '秦淮区', label: '秦淮区' },
          { value: '建邺区', label: '建邺区' },
          { value: '鼓楼区', label: '鼓楼区' },
          { value: '浦口区', label: '浦口区' },
          { value: '栖霞区', label: '栖霞区' },
          { value: '雨花台区', label: '雨花台区' },
          { value: '江宁区', label: '江宁区' },
          { value: '六合区', label: '六合区' },
          { value: '溧水区', label: '溧水区' },
          { value: '高淳区', label: '高淳区' }
        ]
      }
    ]
  }
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const [storeForm] = Form.useForm<StoreInfoValues>();
  const storeImageInputRef = useRef<HTMLInputElement | null>(null);
  const { message, modal } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [storeInfo, setStoreInfo] = useState<StoreInfoValues>(defaultStoreInfo);
  const [savedStoreInfo, setSavedStoreInfo] = useState<StoreInfoValues>(defaultStoreInfo);
  const [storeSavedAt, setStoreSavedAt] = useState('');
  const [notifications, setNotifications] = useState<NotificationSetting[]>([]);
  const [miniPageImages, setMiniPageImages] = useState<MiniPageImageSetting[]>([]);
  const [notificationSavedAt, setNotificationSavedAt] = useState('');
  const [miniPageImageSavedAt, setMiniPageImageSavedAt] = useState('');
  const [isSavingStoreInfo, setIsSavingStoreInfo] = useState(false);
  const [isUploadingStoreImage, setIsUploadingStoreImage] = useState(false);
  const [savingMiniPageImageKey, setSavingMiniPageImageKey] = useState<string | null>(null);
  const [initializingNotifications, setInitializingNotifications] = useState(false);
  const [togglingNotificationKey, setTogglingNotificationKey] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSavingTwoFactor, setIsSavingTwoFactor] = useState(false);
  const [securityState, setSecurityState] = useState<Record<SecurityActionTitle, SecurityActionState>>({
    修改密码: { title: '修改密码', description: '定期更新管理员账号密码', status: '正常', detail: '可在此更新密码' },
    两步验证: { title: '两步验证', description: '为核心账号开启验证器二次校验', status: '待激活', detail: '可在此启用两步验证' },
    权限管理: { title: '权限管理', description: '配置前台、店长和财务的页面权限', status: '正常', detail: '进入角色权限页面调整' }
  });
  const [dataState, setDataState] = useState<Record<DataActionTitle, DataActionState>>({
    导出备份: { title: '导出备份', description: '下载当前数据快照用于人工备份', status: '正常', detail: '支持导出 JSON 快照' },
    导出数据: { title: '导出数据', description: '按时间范围导出经营与会员报表', status: '正常', detail: '导出经营数据' },
    数据恢复: { title: '数据恢复', description: '从最近一次备份恢复门店数据', status: '正常', detail: '上传备份文件恢复' }
  });
  const [passwordDraft, setPasswordDraft] = useState({ current: '', next: '', confirm: '' });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [exportRange, setExportRange] = useState('近 30 天');
  const [systemVersion] = useState('当前构建');
  const [systemStatus] = useState<'稳定'>('稳定');
  const [openSecurityDrawer, setOpenSecurityDrawer] = useState<SecurityDrawerKey>(null);
  const [openDataDrawer, setOpenDataDrawer] = useState<DataDrawerKey>(null);
  const [currentUserPermissions, setCurrentUserPermissions] = useState<string[]>([]);
  const [currentUserRoleCode, setCurrentUserRoleCode] = useState('');
  const miniPageImageInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const watchedStoreInfo = Form.useWatch([], storeForm) as Partial<StoreInfoValues> | undefined;
  const canManageSettings = currentUserRoleCode === 'OWNER' || hasRequiredPermissions(currentUserPermissions, ['MANAGE:SETTINGS']);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const [studioData, notificationsData, miniPageImagesData, twoFactorStatus, currentUser] = await Promise.all([
          settingsApi.getStudio().catch(() => null),
          settingsApi.getNotifications().catch(() => []),
          settingsApi.getMiniPageImages()
            .then((data) => normalizeMiniPageImages(data.length > 0 ? data : DEFAULT_MINI_PAGE_IMAGES))
            .catch(() => normalizeMiniPageImages(DEFAULT_MINI_PAGE_IMAGES)),
          authApi.getTwoFactorStatus().catch(() => ({ enabled: false, hasSecret: false })),
          authApi.getMe().catch(() => null),
        ]);

        setCurrentUserPermissions(currentUser?.role?.permissions || []);
        setCurrentUserRoleCode(currentUser?.role?.code || '');

        if (studioData) {
          // 解析地址：尝试从地址字符串中提取省市区
          const addressStr = studioData.address || '';
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
            studioName: studioData.studioName || PLACEHOLDER_STORE_INFO.studioName,
            phone: studioData.phone || PLACEHOLDER_STORE_INFO.phone,
            email: studioData.email || PLACEHOLDER_STORE_INFO.email,
            businessHours: studioData.businessHours || PLACEHOLDER_STORE_INFO.businessHours,
            province,
            city,
            district,
            address: remainingAddress || addressStr,
            latitude: studioData.latitude ?? null,
            longitude: studioData.longitude ?? null,
            imageUrl: studioData.imageUrl || '',
            area: [province, city, district].filter(Boolean),
            hours: parseHoursToDayjs(studioData.businessHours || PLACEHOLDER_STORE_INFO.businessHours),
          };
          storeForm.setFieldsValue(info);
          setStoreInfo(info);
          setSavedStoreInfo(info);
        }

        if (notificationsData.length > 0) {
          setNotifications(notificationsData);
        } else {
          await settingsApi.initialize().catch(() => null);
          const initialized = await settingsApi.getNotifications().catch(() => []);
          setNotifications(initialized);
        }

        setMiniPageImages(miniPageImagesData);

        setTwoFactorEnabled(twoFactorStatus.enabled);
        setSecurityState((current) => ({
          ...current,
          两步验证: {
            ...current.两步验证,
            status: twoFactorStatus.enabled ? '正常' : twoFactorStatus.hasSecret ? '处理中' : '待激活',
            detail: twoFactorStatus.enabled
              ? '当前账号已开启两步验证'
              : twoFactorStatus.hasSecret
                ? '已发起设置，可重新生成密钥完成启用'
                : '点击设置两步验证',
          },
        }));
      } catch (err) {
        antdMessage.error('获取设置失败');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [storeForm]);

  const enabledNotificationCount = useMemo(
    () => notifications.filter((item) => item.enabled).length,
    [notifications]
  );

  const securityHealthyCount = useMemo(
    () => Object.values(securityState).filter((item) => item.status === '正常').length,
    [securityState]
  );

  const dataHealthyCount = useMemo(
    () => Object.values(dataState).filter((item) => item.status === '正常').length,
    [dataState]
  );

  const normalizeStoreFormValues = (values?: Partial<StoreInfoValues> | null) => {
    const area = values?.area || [values?.province, values?.city, values?.district].filter(Boolean) as string[];
    const hoursValue = values?.hours;
    const businessHours = hoursValue && hoursValue[0] && hoursValue[1]
      ? dayjsToHoursString(hoursValue)
      : values?.businessHours || '';

    return {
      studioName: values?.studioName || '',
      phone: values?.phone || '',
      email: values?.email || '',
      businessHours,
      province: area[0] || values?.province || '',
      city: area[1] || values?.city || '',
      district: area[2] || values?.district || '',
      address: values?.address || '',
      latitude: values?.latitude ?? null,
      longitude: values?.longitude ?? null,
      imageUrl: values?.imageUrl || '',
    };
  };

  const buildStoreSaveState = (values: StoreInfoValues) => {
    const area = values.area || [];
    const [province, city, district] = area;
    const fullAddress = [
      province,
      city,
      district,
      values.address
    ].filter(Boolean).join('');
    const addressChanged = normalizeAddressText(fullAddress) !== normalizeAddressText(formatStoreAddress(savedStoreInfo));
    const coordinatesChanged = values.latitude !== savedStoreInfo.latitude || values.longitude !== savedStoreInfo.longitude;
    const shouldResolveCoordinatesFromAddress = addressChanged && !coordinatesChanged;
    const businessHours = dayjsToHoursString(values.hours as [dayjs.Dayjs, dayjs.Dayjs]);
    const saveData = {
      studioName: values.studioName,
      phone: values.phone,
      email: values.email,
      businessHours,
      address: fullAddress,
      latitude: shouldResolveCoordinatesFromAddress ? null : values.latitude ?? null,
      longitude: shouldResolveCoordinatesFromAddress ? null : values.longitude ?? null,
      imageUrl: values.imageUrl || '',
    };
    const nextInfo: StoreInfoValues = {
      ...values,
      businessHours,
      province,
      city,
      district,
      address: values.address,
      latitude: saveData.latitude,
      longitude: saveData.longitude,
      imageUrl: values.imageUrl || '',
      area: values.area || [province, city, district].filter(Boolean),
      hours: values.hours,
    };

    return { saveData, nextInfo };
  };

  const storeChanged = JSON.stringify(normalizeStoreFormValues(watchedStoreInfo)) !== JSON.stringify(normalizeStoreFormValues(savedStoreInfo));
  const storeSavedLabel = storeSavedAt ? `最近保存 ${storeSavedAt}` : '尚未记录';
  const notificationSavedLabel = notificationSavedAt ? `最近保存 ${notificationSavedAt}` : '尚未记录';
  const miniPageImageSavedLabel = miniPageImageSavedAt ? `最近保存 ${miniPageImageSavedAt}` : '尚未记录';
  const configuredMiniPageImageCount = useMemo(
    () => miniPageImages.filter((item) => !item.isDefault).length,
    [miniPageImages]
  );

  const settingsOverviewMetaItems = useMemo<SettingsOverviewMetaItem[]>(() => [
    {
      label: '联系方式',
      value: storeInfo.phone || '待补充联系电话',
      hint: storeInfo.email || '待补充邮箱地址',
    },
    {
      label: '营业时间',
      value: storeInfo.businessHours || '待设置营业时间',
      hint: storeSavedLabel,
    },
    {
      label: '门店地址',
      value: formatStoreAddress(storeInfo),
      hint: '用于门店档案与前台展示',
    },
  ], [storeInfo, storeSavedLabel]);

  const settingsOverviewMetrics = useMemo<SettingsOverviewMetric[]>(() => [
    {
      label: '已启用通知',
      value: `${enabledNotificationCount}/${notifications.length || 0}`,
      hint: notificationSavedLabel,
      tone: 'mint',
    },
    {
      label: '安全策略',
      value: `${securityHealthyCount}/${securityActionsList.length}`,
      hint: securityHealthyCount === securityActionsList.length ? '安全项状态正常' : '仍有项目待处理',
      tone: 'violet',
    },
    {
      label: '数据任务',
      value: `${dataHealthyCount}/${dataActionsList.length}`,
      hint: dataHealthyCount === dataActionsList.length ? '备份与恢复入口可用' : '存在待处理项',
      tone: 'orange',
    },
  ], [dataHealthyCount, enabledNotificationCount, notificationSavedLabel, notifications.length, securityHealthyCount]);

  const notificationSectionLabel = `${enabledNotificationCount}/${notifications.length || 0} 已启用`;
  const miniPageImageSectionLabel = `${configuredMiniPageImageCount}/${miniPageImages.length || 0} 已配置`;
  const securitySectionLabel = securityHealthyCount === securityActionsList.length ? '状态稳定' : '需要跟进';
  const dataSectionLabel = dataHealthyCount === dataActionsList.length ? '入口可用' : '待处理';

  const securityActionRows = useMemo(
    () => securityActionsList.map((item) => ({
      title: item.title,
      description: securityState[item.title].detail,
      statusLabel: securityState[item.title].status,
    })),
    [securityState]
  );

  const dataActionRows = useMemo(
    () => dataActionsList.map((item) => ({
      title: item.title,
      description: dataState[item.title].detail,
      statusLabel: dataState[item.title].status,
    })),
    [dataState]
  );

  const handleSaveStoreInfo = async () => {
    if (!canManageSettings) {
      message.warning('当前账号只有查看权限，不能保存门店图片或门店信息');
      return;
    }

    try {
      setIsSavingStoreInfo(true);
      const values = await storeForm.validateFields();
      const { saveData, nextInfo } = buildStoreSaveState(values);
      
      const updatedStudio = await settingsApi.updateStudio(saveData);
      const savedInfo = {
        ...nextInfo,
        latitude: updatedStudio.latitude ?? null,
        longitude: updatedStudio.longitude ?? null,
      };
      setStoreInfo(savedInfo);
      setSavedStoreInfo(savedInfo);
      storeForm.setFieldsValue(savedInfo);
      setStoreSavedAt(todayText());
      message.success('门店信息已保存');
    } catch (err) {
      message.error(getErrorMessage(err, '保存失败'));
    } finally {
      setIsSavingStoreInfo(false);
    }
  };

  const handleToggleNotification = async (key: string, checked: boolean) => {
    try {
      setTogglingNotificationKey(key);
      await settingsApi.updateNotification(key, checked);
      setNotifications((current) => current.map((item) => (item.key === key ? { ...item, enabled: checked } : item)));
      setNotificationSavedAt(todayText());
      message.success('通知设置已自动保存');
    } catch (err) {
      message.error(getErrorMessage(err, '更新失败'));
    } finally {
      setTogglingNotificationKey(null);
    }
  };

  const handleGoToNotifications = () => {
    navigate('/notifications');
  };

  const handleSelectStoreImage = () => {
    if (!canManageSettings) {
      message.warning('当前账号没有门店信息管理权限');
      return;
    }

    storeImageInputRef.current?.click();
  };

  const handleStoreImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const validationMessage = validateImageFile(file);
      if (validationMessage) {
        message.warning(validationMessage);
        return;
      }

      const values = await storeForm.validateFields();
      setIsUploadingStoreImage(true);
      const uploaded = await settingsApi.uploadImage(file, 'studio');
      const nextValues: StoreInfoValues = {
        ...values,
        imageUrl: uploaded.url,
      };
      const { saveData, nextInfo } = buildStoreSaveState(nextValues);

      const updatedStudio = await settingsApi.updateStudio(saveData);
      const savedInfo = {
        ...nextInfo,
        latitude: updatedStudio.latitude ?? null,
        longitude: updatedStudio.longitude ?? null,
      };
      setStoreInfo(savedInfo);
      setSavedStoreInfo(savedInfo);
      storeForm.setFieldsValue(savedInfo);
      setStoreSavedAt(todayText());
      message.success(`店面图片已压缩上传并保存（${Math.ceil(uploaded.size / 1024)}KB）`);
    } catch (err) {
      message.error(getErrorMessage(err, '店面图片上传失败'));
    } finally {
      setIsUploadingStoreImage(false);
      event.target.value = '';
    }
  };

  const handleSelectMiniPageImage = (pageKey: string) => {
    if (!canManageSettings) {
      message.warning('当前账号没有小程序页面图片管理权限');
      return;
    }

    miniPageImageInputRefs.current[pageKey]?.click();
  };

  const handleMiniPageImageChange = async (pageKey: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const validationMessage = validateImageFile(file);
      if (validationMessage) {
        message.warning(validationMessage);
        return;
      }

      setSavingMiniPageImageKey(pageKey);
      const uploaded = await settingsApi.uploadImage(file, 'miniPageHero');
      const updated = await settingsApi.updateMiniPageImage(pageKey, { imageUrl: uploaded.url });
      setMiniPageImages((current) => current.map((item) => (item.pageKey === pageKey ? updated : item)));
      setMiniPageImageSavedAt(todayText());
      message.success(`${updated.label}头图已压缩上传（${Math.ceil(uploaded.size / 1024)}KB）`);
    } catch (err) {
      message.error(getErrorMessage(err, '小程序页面图片保存失败'));
    } finally {
      setSavingMiniPageImageKey(null);
      event.target.value = '';
    }
  };

  const handleResetMiniPageImage = async (pageKey: string) => {
    if (!canManageSettings) {
      message.warning('当前账号没有小程序页面图片管理权限');
      return;
    }

    try {
      setSavingMiniPageImageKey(pageKey);
      const updated = await settingsApi.updateMiniPageImage(pageKey, { imageUrl: '' });
      setMiniPageImages((current) => current.map((item) => (item.pageKey === pageKey ? updated : item)));
      setMiniPageImageSavedAt(todayText());
      message.success(`${updated.label}头图已恢复默认`);
    } catch (err) {
      message.error(getErrorMessage(err, '恢复默认图片失败'));
    } finally {
      setSavingMiniPageImageKey(null);
    }
  };

  const handleInitializeNotifications = async () => {
    try {
      setInitializingNotifications(true);
      await settingsApi.initialize();
      const initialized = await settingsApi.getNotifications();
      setNotifications(initialized);
      setNotificationSavedAt(todayText());
      message.success('通知模板已初始化');
    } catch (err) {
      message.error(getErrorMessage(err, '通知模板初始化失败'));
    } finally {
      setInitializingNotifications(false);
    }
  };

  const handleSavePassword = async () => {
    if (!passwordDraft.current || !passwordDraft.next || !passwordDraft.confirm) {
      message.warning('请完整填写密码信息');
      return;
    }
    if (passwordDraft.next !== passwordDraft.confirm) {
      message.error('两次输入的新密码不一致');
      return;
    }
    try {
      setIsSavingPassword(true);
      await authApi.changePassword({
        currentPassword: passwordDraft.current,
        newPassword: passwordDraft.next,
        confirmPassword: passwordDraft.confirm,
      });
      const timestamp = todayText();
      setSecurityState((current) => ({
        ...current,
        修改密码: { ...current.修改密码, status: '正常', detail: `最近更新于 ${timestamp}` }
      }));
      setPasswordDraft({ current: '', next: '', confirm: '' });
      message.success('密码已更新');
      setOpenSecurityDrawer(null);
    } catch (err) {
      message.error(getErrorMessage(err, '密码修改失败'));
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleSaveTwoFactor = async () => {
    try {
      setIsSavingTwoFactor(true);
      if (twoFactorEnabled) {
        // Disable 2FA
        await authApi.disableTwoFactor(disablePassword);
        setTwoFactorEnabled(false);
        setTwoFactorSecret(null);
        setDisablePassword('');
        setSecurityState((current) => ({
          ...current,
          两步验证: { ...current.两步验证, status: '待激活', detail: '点击设置两步验证' },
        }));
        message.success('已关闭两步验证');
      } else if (twoFactorSecret) {
        // Verify and enable 2FA
        await authApi.verifyTwoFactor(twoFactorCode);
        setTwoFactorEnabled(true);
        setTwoFactorCode('');
        setSecurityState((current) => ({
          ...current,
          两步验证: { ...current.两步验证, status: '正常', detail: `最近启用于 ${todayText()}` },
        }));
        message.success('已开启两步验证');
      } else {
        // Generate secret first
        const res = await authApi.generateTwoFactorSecret();
        setTwoFactorSecret(res.secret);
        setSecurityState((current) => ({
          ...current,
          两步验证: { ...current.两步验证, status: '处理中', detail: '已生成密钥，请输入验证码完成启用' },
        }));
        message.info('请使用验证器扫描密钥，然后输入验证码');
        return;
      }
      setOpenSecurityDrawer(null);
    } catch (err) {
      message.error(getErrorMessage(err, '操作失败'));
    } finally {
      setIsSavingTwoFactor(false);
    }
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

  const handleRunBackup = async () => {
    try {
      const success = await handleExportData('全部', '门店备份');
      if (!success) {
        return;
      }
      const timestamp = todayText();
      setDataState((current) => ({
        ...current,
        导出备份: { ...current.导出备份, status: '正常', detail: `最近导出备份于 ${timestamp}` }
      }));
    } catch (err) {
      message.error('备份失败');
    }
  };

  const handleExportData = async (range = exportRange, filePrefix = '门店数据') => {
    try {
      const blob = await settingsApi.exportData(range);
      const url = URL.createObjectURL(blob as Blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.href = url;
      link.download = `${filePrefix}-${timestamp}.json`;
      link.click();
      URL.revokeObjectURL(url);

      const now = todayText();
      setDataState((current) => ({
        ...current,
        导出数据: { ...current.导出数据, status: '正常', detail: `最近导出：${now}` }
      }));
      message.success('数据已导出');
      return true;
    } catch (err) {
      message.error(getErrorMessage(err, '导出失败'));
      return false;
    }
  };

  const handleRestoreData = async () => {
    try {
      modal.confirm({
        title: '确认恢复数据',
        content: '恢复操作会覆盖现有数据，请确认后继续。',
        okText: '继续恢复',
        cancelText: '取消',
        okButtonProps: { danger: true },
        onOk: async () => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.json';
          input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            try {
              const fileError = validateRestoreFile(file);
              if (fileError) {
                message.error(fileError);
                return;
              }

              const rawText = await file.text();
              const payloadError = validateRestorePayload(rawText);
              if (payloadError) {
                message.error(payloadError);
                return;
              }

              const res = await settingsApi.restoreData(file);
              if (res.success) {
                const timestamp = todayText();
                setDataState((current) => ({
                  ...current,
                  数据恢复: { ...current.数据恢复, status: '正常', detail: `最近恢复于 ${timestamp}` }
                }));
                message.success('数据恢复成功');
                setOpenDataDrawer(null);
              } else {
                message.error(res.message || '恢复失败');
              }
            } catch (err) {
              message.error(getErrorMessage(err, '恢复失败'));
            }
          };
          input.click();
        },
      });
    } catch (err) {
      message.error(getErrorMessage(err, '恢复失败'));
    }
  };

  if (loading) {
    return (
      <div className={`${pageCls.page} ${pageCls.workPage}`}>
        <PageHeader title="系统设置" />
        <div className={`${pageCls.centeredState} ${pageCls.centeredStateTall}`}>
          <Spin size="large" />
          <div className={widgetCls.smallText}>正在加载系统设置…</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${pageCls.page} ${pageCls.workPage} ${styles.settingsPage}`}>
      <PageHeader title="系统设置" />

      <SettingsOverviewCard
        title={storeInfo.studioName || '门店档案待补充'}
        summary={storeChanged ? '当前有门店档案修改待保存。' : '集中维护门店档案与关键系统设置。'}
        statusLabel={storeChanged ? '处理中' : '正常'}
        savedBadgeText={storeSavedLabel}
        metaItems={settingsOverviewMetaItems}
        metrics={settingsOverviewMetrics}
        primaryActionLabel="保存门店信息"
        primaryActionDisabled={!canManageSettings || !storeChanged || isSavingStoreInfo}
        primaryActionLoading={isSavingStoreInfo}
        onPrimaryAction={handleSaveStoreInfo}
      />

      <SectionCard
        title="门店信息"
        subtitle={storeChanged ? '先完成档案更新，再同步其他设置。' : '基础档案与营业信息保持最新。'}
        extra={<span className={styles.settingsSectionPill}>{storeChanged ? '待保存修改' : '信息已同步'}</span>}
      >
        <div className={styles.settingsSectionStack}>
          <div className={styles.settingsSectionSummaryCompact}>
            <div className={styles.settingsSectionSummaryText}>
              营业时间、联系方式与门店地址会同步到后台基础档案。
            </div>
            <div className={styles.settingsSectionSubnote}>{storeSavedLabel}</div>
          </div>

          <Form form={storeForm} className={pageCls.settingsForm} layout="vertical">
            <div className={styles.settingsFormSectionGrid}>
              <div className={styles.settingsFormSectionCard}>
                <h3 className={styles.settingsFormSectionTitle}>基础档案</h3>
                <Row gutter={18}>
                  <Col span={24}>
                    <Form.Item label="门店名称" name="studioName" rules={[{ required: true, message: '请输入门店名称' }]}>
                      <Input className={pageCls.settingsInput} size="large" />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item label="联系电话" name="phone" rules={[{ required: true, message: '请输入联系电话' }]}>
                      <Input className={pageCls.settingsInput} size="large" />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item label="邮箱地址" name="email" rules={[{ required: true, message: '请输入邮箱地址' }, { type: 'email', message: '请输入有效邮箱地址' }]}> 
                      <Input className={pageCls.settingsInput} size="large" />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item label="店面图片" name="imageUrl">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <input
                          ref={storeImageInputRef}
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={handleStoreImageChange}
                        />
                        <Button onClick={handleSelectStoreImage} disabled={!canManageSettings || isUploadingStoreImage} loading={isUploadingStoreImage}>上传店面图片</Button>
                        <Form.Item noStyle shouldUpdate>
                          {() => {
                            const imageUrl = storeForm.getFieldValue('imageUrl');
                            return imageUrl ? (
                              <img src={imageUrl} alt="店面图片预览" style={{ width: '100%', maxWidth: 260, borderRadius: 16, border: '1px solid var(--border-subtle)' }} />
                            ) : null;
                          }}
                        </Form.Item>
                      </div>
                    </Form.Item>
                  </Col>
                </Row>
              </div>

              <div className={styles.settingsFormSectionCard}>
                <h3 className={styles.settingsFormSectionTitle}>营业与地址</h3>
                <Row gutter={18}>
                  <Col span={24}>
                    <Form.Item label="营业时间" name="hours" rules={[{ required: true, message: '请选择营业时间' }]}>
                      <TimePicker.RangePicker
                        className={`${pageCls.settingsInput} ${pageCls.fullWidthControl}`}
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
                        className={`${pageCls.settingsInput} ${pageCls.fullWidthControl}`}
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
                  <Form.Item name="latitude" hidden>
                    <InputNumber />
                  </Form.Item>
                  <Form.Item name="longitude" hidden>
                    <InputNumber />
                  </Form.Item>
                  <Col span={24}>
                    <Descriptions size="small" column={2} bordered>
                      <Descriptions.Item label="地图定位">
                        {watchedStoreInfo?.latitude && watchedStoreInfo?.longitude
                          ? `${watchedStoreInfo.latitude}, ${watchedStoreInfo.longitude}`
                          : '保存地址后自动解析'}
                      </Descriptions.Item>
                      <Descriptions.Item label="维护方式">
                        只需填写门店地址，无需手填坐标
                      </Descriptions.Item>
                    </Descriptions>
                  </Col>
                </Row>
              </div>
            </div>

          </Form>
        </div>
      </SectionCard>

      <SectionCard
        title="小程序页面图片"
        subtitle="只配置各页面顶部图片；课程封面、教练头像和门店图片仍在原模块维护。"
        extra={<span className={styles.settingsSectionPill}>{miniPageImageSectionLabel}</span>}
      >
        <div className={styles.settingsSectionStack}>
          <div className={styles.settingsSectionSummaryCompact}>
            <div className={styles.settingsSectionSummaryText}>
              上传后会自动保存并同步到小程序；恢复默认后，小程序继续使用内置默认头图。
            </div>
            <div className={styles.settingsSectionSubnote}>{miniPageImageSavedLabel}</div>
          </div>

          {miniPageImages.length > 0 ? (
            <div className={styles.miniPageImageGrid}>
              {miniPageImages.map((item) => {
                const isSaving = savingMiniPageImageKey === item.pageKey;
                const previewImage = item.imageUrl?.trim();

                return (
                  <div key={item.pageKey} className={styles.miniPageImageCard}>
                    <input
                      ref={(node) => {
                        miniPageImageInputRefs.current[item.pageKey] = node;
                      }}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(event) => handleMiniPageImageChange(item.pageKey, event)}
                    />
                    <div className={styles.miniPageImagePreview}>
                      {previewImage ? (
                        <img src={previewImage} alt={`${item.label}头图预览`} className={styles.miniPageImagePreviewImage} />
                      ) : (
                        <div className={styles.miniPageImagePlaceholder}>
                          <span>{item.label}</span>
                          <small>使用默认图</small>
                        </div>
                      )}
                    </div>
                    <div className={styles.miniPageImageContent}>
                      <div>
                        <div className={widgetCls.recordTitle}>{item.label}</div>
                        <div className={widgetCls.smallText}>{item.path}</div>
                      </div>
                      <span className={`${styles.settingsSectionPill} ${styles.miniPageImageStatusPill}`}>{item.isDefault ? '默认图' : '已上传'}</span>
                    </div>
                    <div className={styles.miniPageImageActions}>
                      <Button
                        className={pageCls.cardActionSecondary}
                        onClick={() => handleSelectMiniPageImage(item.pageKey)}
                        loading={isSaving}
                        disabled={!canManageSettings || (savingMiniPageImageKey !== null && !isSaving)}
                      >
                        上传图片
                      </Button>
                      <Button
                        onClick={() => handleResetMiniPageImage(item.pageKey)}
                        disabled={!canManageSettings || item.isDefault || (savingMiniPageImageKey !== null && !isSaving)}
                      >
                        恢复默认
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.settingsEmptyStateCard}>
              <div>
                <div className={widgetCls.recordTitle}>小程序页面图片暂未加载</div>
                <div className={widgetCls.smallText}>请检查后端设置接口是否正常。</div>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      <div className={`${pageCls.equalCol} ${pageCls.equalColTopSpace}`}>
        <SectionCard
          title="通知设置"
          subtitle="仅保留日常需要处理的提醒开关。"
          extra={
            <div className={styles.settingsSectionExtraStack}>
              <span className={styles.settingsSectionPill}>{notificationSectionLabel}</span>
              <Button className={pageCls.cardActionSecondary} onClick={handleGoToNotifications}>进入通知中心</Button>
            </div>
          }
        >
          <div className={styles.settingsSectionStack}>
            <div className={styles.settingsSectionSummaryCompact}>
              <div className={styles.settingsSectionSummaryText}>高频提醒保持开启，其余通知按门店节奏调整。</div>
              <div className={styles.settingsSectionSubnote}>{notificationSavedLabel}</div>
            </div>
            {notifications.length > 0 ? (
              notifications.map((item) => {
                const switchReadableLabel = `${item.title}，${item.description}`;
                return (
                  <div key={item.key} className={widgetCls.settingRow}>
                    <div>
                      <div className={widgetCls.recordTitle}>{item.title}</div>
                      <div className={widgetCls.smallText}>{item.description}</div>
                    </div>
                    <span className={pageCls.settingSwitch}>
                      <Switch
                        checked={item.enabled}
                        onChange={(checked) => handleToggleNotification(item.key, checked)}
                        loading={togglingNotificationKey === item.key}
                        disabled={initializingNotifications || (togglingNotificationKey !== null && togglingNotificationKey !== item.key)}
                        aria-label={switchReadableLabel}
                      />
                    </span>
                  </div>
                );
              })
            ) : (
              <div className={styles.settingsEmptyStateCard}>
                <div>
                  <div className={widgetCls.recordTitle}>通知设置暂无内容</div>
                  <div className={widgetCls.smallText}>初始化后即可管理预约、会籍与支付提醒。</div>
                </div>
                <Button
                  className={pageCls.cardActionSecondary}
                  onClick={handleInitializeNotifications}
                  loading={initializingNotifications}
                  disabled={initializingNotifications || togglingNotificationKey !== null}
                >
                  初始化通知模板
                </Button>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="系统信息"
          subtitle="查看当前运行版本与基础状态。"
          extra={<span className={styles.settingsSectionPill}>系统正常</span>}
        >
          <div className={styles.settingsSectionStack}>
            <div className={styles.settingsSectionSummaryCompact}>
              <div className={styles.settingsSectionSummaryText}>当前页只保留设置判断需要的信息，不再堆叠额外说明。</div>
            </div>
          <div className={styles.settingsUtilityGrid}>
            <div className={widgetCls.metricCard}>
              <div className={widgetCls.metricLabel}>系统版本</div>
              <div className={widgetCls.metricValue}>{systemVersion}</div>
            </div>
            <div className={widgetCls.metricCard}>
              <div className={widgetCls.metricLabel}>运行状态</div>
              <div className={widgetCls.metricValue}>{systemStatus}</div>
            </div>
          </div>
          </div>
        </SectionCard>
      </div>

      <div className={pageCls.equalCol}>
        <SectionCard
          title="安全设置"
          subtitle="密码、两步验证与权限核对集中处理。"
          extra={<span className={styles.settingsSectionPill}>{securitySectionLabel}</span>}
        >
          <div className={styles.settingsSectionStack}>
            <div className={styles.settingsSectionSummaryCompact}>
              <div className={styles.settingsSectionSummaryText}>先处理待激活或处理中项目，再做周期性核对。</div>
            </div>
            {securityActionRows.map((item) => (
              <SettingsActionRow
                key={item.title}
                title={item.title}
                description={item.description}
                statusLabel={item.statusLabel}
                onClick={() => {
                  if (item.title === '两步验证') {
                    setTwoFactorEnabled(securityState.两步验证.status === '正常');
                  }
                  setOpenSecurityDrawer(item.title as SecurityActionTitle);
                }}
              />
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="数据管理"
          subtitle="备份、导出与恢复动作分开处理。"
          extra={<span className={styles.settingsSectionPill}>{dataSectionLabel}</span>}
        >
          <div className={styles.settingsSectionStack}>
            <div className={styles.settingsSectionSummaryCompact}>
              <div className={styles.settingsSectionSummaryText}>常用导出保持轻量，恢复操作始终单独确认。</div>
            </div>
            {dataActionRows.map((item) => (
              <SettingsActionRow
                key={item.title}
                title={item.title}
                description={item.description}
                statusLabel={item.statusLabel}
                onClick={() => setOpenDataDrawer(item.title as DataActionTitle)}
              />
            ))}
          </div>
        </SectionCard>
      </div>

      <Drawer rootClassName={pageCls.responsiveDetailDrawer} open={openSecurityDrawer !== null} width={SETTINGS_DETAIL_DRAWER_WIDTH} title={openSecurityDrawer ?? '安全设置'} onClose={() => setOpenSecurityDrawer(null)}>
        {openSecurityDrawer ? (
          <div className={styles.settingsDrawerStack}>
            <div className={`${widgetCls.detailOverviewPanel} ${styles.settingsDrawerOverview}`}>
              <div className={`${widgetCls.recordTitle} ${pageCls.recordTitleRow}`}>
                {securityState[openSecurityDrawer].title}
                <StatusTag status={securityState[openSecurityDrawer].status} />
              </div>
              <div className={widgetCls.detailOverviewText}>{securityState[openSecurityDrawer].description}</div>
              <div className={styles.settingsDrawerLead}>{securityState[openSecurityDrawer].detail}</div>
            </div>

            {openSecurityDrawer === '修改密码' ? (
              <div className={styles.settingsDrawerPanel}>
                <div className={styles.settingsDrawerNotice}>建议定期更换密码，并避免与其他后台账号共用。</div>
                <div className={styles.settingsDrawerFieldStack}>
                <Input.Password
                  className={pageCls.settingsInput}
                  placeholder="当前密码"
                  aria-label="修改密码-当前密码"
                  value={passwordDraft.current}
                  onChange={(event) => setPasswordDraft((current) => ({ ...current, current: event.target.value }))}
                />
                <Input.Password
                  className={pageCls.settingsInput}
                  placeholder="新密码"
                  aria-label="修改密码-新密码"
                  value={passwordDraft.next}
                  onChange={(event) => setPasswordDraft((current) => ({ ...current, next: event.target.value }))}
                />
                <Input.Password
                  className={pageCls.settingsInput}
                  placeholder="确认新密码"
                  aria-label="修改密码-确认新密码"
                  value={passwordDraft.confirm}
                  onChange={(event) => setPasswordDraft((current) => ({ ...current, confirm: event.target.value }))}
                />
                </div>
                <div className={styles.settingsDrawerActions}>
                <Button
                  type="primary"
                  className={pageCls.cardActionPrimary}
                  size="large"
                  onClick={handleSavePassword}
                  loading={isSavingPassword}
                  disabled={isSavingPassword}
                >
                  更新密码
                </Button>
                </div>
              </div>
            ) : null}

            {openSecurityDrawer === '两步验证' ? (
              <div className={styles.settingsDrawerPanel}>
                {!twoFactorEnabled ? (
                  <>
                    {!twoFactorSecret ? (
                      <div className={styles.settingsDrawerStackCompact}>
                        <div className={styles.settingsDrawerNotice}>建议为店长与财务等高权限账号开启二次校验。</div>
                        <div className={widgetCls.settingRow}>
                          <div>
                            <div className={widgetCls.recordTitle}>开启两步验证</div>
                            <div className={widgetCls.smallText}>启用后，登录时需要输入验证器生成的验证码。</div>
                          </div>
                        </div>
                        <div className={styles.settingsDrawerActions}>
                        <Button
                          type="primary"
                          className={pageCls.cardActionPrimary}
                          size="large"
                          onClick={handleSaveTwoFactor}
                          loading={isSavingTwoFactor}
                          disabled={isSavingTwoFactor}
                        >
                          开始设置
                        </Button>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.settingsDrawerStackCompact}>
                        <div className={widgetCls.recordTitle}>验证密钥</div>
                        <div className={widgetCls.smallText}>请使用验证器应用扫描或手动输入以下密钥。</div>
                        <Input.TextArea
                          value={twoFactorSecret}
                          readOnly
                          rows={2}
                          className={styles.settingsDrawerSecret}
                        />
                        <div className={widgetCls.smallText}>输入验证器生成的 6 位验证码。</div>
                        <Input
                          className={pageCls.settingsInput}
                          placeholder="6 位验证码"
                          aria-label="两步验证-验证码"
                          value={twoFactorCode}
                          onChange={(e) => setTwoFactorCode(e.target.value)}
                          maxLength={6}
                        />
                        <div className={styles.settingsDrawerActions}>
                          <Button
                            type="primary"
                            className={pageCls.cardActionPrimary}
                            size="large"
                            onClick={handleSaveTwoFactor}
                            loading={isSavingTwoFactor}
                            disabled={isSavingTwoFactor}
                          >
                            验证并开启
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className={styles.settingsDrawerStackCompact}>
                    <div className={`${widgetCls.recordTitle} ${pageCls.successText}`}>两步验证已开启</div>
                    <div className={styles.settingsDrawerNotice}>关闭前请确认已有其他安全措施可覆盖高权限登录。</div>
                    <div className={widgetCls.smallText}>输入当前密码后可关闭两步验证。</div>
                    <Input.Password
                      className={pageCls.settingsInput}
                      placeholder="当前密码"
                      aria-label="关闭两步验证-当前密码"
                      value={disablePassword}
                      onChange={(e) => setDisablePassword(e.target.value)}
                    />
                    <div className={styles.settingsDrawerActions}>
                      <Button
                        className={pageCls.cardActionWarning}
                        size="large"
                        onClick={handleSaveTwoFactor}
                        loading={isSavingTwoFactor}
                        disabled={isSavingTwoFactor}
                      >
                        关闭两步验证
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {openSecurityDrawer === '权限管理' ? (
              <div className={styles.settingsDrawerPanel}>
                <div className={styles.settingsDrawerNotice}>角色权限在独立页面维护，这里只记录当前核对状态。</div>
                <Descriptions column={1} size="small" bordered className={pageCls.detailDescriptions}>
                  <Descriptions.Item label="当前状态">{securityState.权限管理.detail}</Descriptions.Item>
                  <Descriptions.Item label="权限来源">角色权限页面维护</Descriptions.Item>
                </Descriptions>
                <div className={styles.settingsDrawerActions}>
                <Button type="primary" className={pageCls.cardActionPrimary} size="large" onClick={handleSyncPermissions}>记录本次核对</Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Drawer>

      <Drawer rootClassName={pageCls.responsiveDetailDrawer} open={openDataDrawer !== null} width={SETTINGS_DETAIL_DRAWER_WIDTH} title={openDataDrawer ?? '数据管理'} onClose={() => setOpenDataDrawer(null)}>
          {openDataDrawer ? (
            <div className={styles.settingsDrawerStack}>
            <div className={`${widgetCls.detailOverviewPanel} ${styles.settingsDrawerOverview}`}>
              <div className={`${widgetCls.recordTitle} ${pageCls.recordTitleRow}`}>
                {dataState[openDataDrawer].title}
                <StatusTag status={dataState[openDataDrawer].status} />
              </div>
              <div className={widgetCls.detailOverviewText}>{dataState[openDataDrawer].description}</div>
              <div className={styles.settingsDrawerLead}>{dataState[openDataDrawer].detail}</div>
            </div>

            {openDataDrawer === '导出备份' ? (
              <div className={styles.settingsDrawerPanel}>
                <div className={styles.settingsDrawerNotice}>当前动作会下载一份 JSON 快照，请保存到门店指定备份位置。</div>
                <div className={styles.settingsDrawerActions}>
                  <Button type="primary" className={pageCls.cardActionPrimary} size="large" onClick={handleRunBackup}>导出备份文件</Button>
                </div>
              </div>
            ) : null}

            {openDataDrawer === '导出数据' ? (
              <div className={styles.settingsDrawerPanel}>
                <div className={styles.settingsDrawerFieldStack}>
                  <div className={widgetCls.smallText}>导出时间范围</div>
                   <Select
                     value={exportRange}
                     aria-label="导出数据时间范围"
                     className={`${pageCls.settingsInput} ${pageCls.fullWidthControl}`}
                     options={['近 7 天', '近 30 天', '本季度'].map((item) => ({ label: item, value: item }))}
                     onChange={setExportRange}
                   />
                </div>
                <div className={styles.settingsDrawerActions}>
                  <Button type="primary" className={pageCls.cardActionPrimary} size="large" onClick={() => { void handleExportData(); }}>导出并下载</Button>
                </div>
              </div>
            ) : null}

            {openDataDrawer === '数据恢复' ? (
              <div className={styles.settingsDrawerPanel}>
                <div className={styles.settingsDrawerNotice}>恢复会覆盖现有数据，建议先完成一次最新备份再继续。</div>
                <div className={styles.settingsDrawerActions}>
                  <Button className={pageCls.cardActionWarning} size="large" onClick={handleRestoreData}>上传备份文件</Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Drawer>

    </div>
  );
}
