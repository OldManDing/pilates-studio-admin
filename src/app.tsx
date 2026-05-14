import type { ReactNode } from 'react';
import { ConfigProvider, App as AntdApp, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import './styles/global.css';

const formValidateMessages = {
  default: '字段校验未通过',
  required: '请输入${label}',
  enum: '${label}必须是指定选项之一',
  whitespace: '${label}不能为空白字符',
  date: {
    format: '${label}日期格式不正确',
    parse: '${label}不能转换为日期',
    invalid: '${label}不是有效日期',
  },
  types: {
    string: '${label}不是有效文本',
    method: '${label}不是有效函数',
    array: '${label}不是有效列表',
    object: '${label}不是有效对象',
    number: '${label}不是有效数字',
    date: '${label}不是有效日期',
    boolean: '${label}不是有效布尔值',
    integer: '${label}不是有效整数',
    float: '${label}不是有效数字',
    regexp: '${label}不是有效表达式',
    email: '请输入有效邮箱地址',
    url: '请输入有效链接',
    hex: '${label}不是有效十六进制值',
  },
  string: {
    len: '${label}必须为 ${len} 个字符',
    min: '${label}至少 ${min} 个字符',
    max: '${label}不能超过 ${max} 个字符',
    range: '${label}长度必须在 ${min}-${max} 个字符之间',
  },
  number: {
    len: '${label}必须等于 ${len}',
    min: '${label}不能小于 ${min}',
    max: '${label}不能大于 ${max}',
    range: '${label}必须在 ${min}-${max} 之间',
  },
  array: {
    len: '${label}必须选择 ${len} 项',
    min: '${label}至少选择 ${min} 项',
    max: '${label}最多选择 ${max} 项',
    range: '${label}选择数量必须在 ${min}-${max} 项之间',
  },
  pattern: {
    mismatch: '${label}格式不正确',
  },
};

export function rootContainer(container: ReactNode) {
  return (
    <ConfigProvider
      locale={zhCN}
      form={{ validateMessages: formValidateMessages }}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#53bfa8',
          colorSuccess: '#53bfa8',
          colorWarning: '#efb169',
          colorError: '#eb96ad',
          colorInfo: '#8878ee',
          borderRadiusSM: 12,
          borderRadius: 16,
          borderRadiusLG: 24,
          fontSize: 15,
          fontFamily:
            'Inter, "Noto Sans SC", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          colorBgLayout: '#faf8f4',
          colorBgContainer: '#fffdfa',
          colorBgElevated: '#fffdfb',
          colorText: '#23313b',
          colorTextSecondary: '#6d7683',
          colorTextTertiary: '#98a2b3',
          colorBorderSecondary: 'rgba(15, 23, 42, 0.08)',
          boxShadowSecondary: '0 18px 38px rgba(18, 38, 63, 0.11)',
        },
      }}
    >
      <AntdApp>{container}</AntdApp>
    </ConfigProvider>
  );
}
