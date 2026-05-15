import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { localizeErrorMessage } from './localized-error-message';

type ConstraintFormatter = (label: string, fallback: string) => string;

const fieldLabels: Record<string, string> = {
  account: '账号',
  address: '详细地址',
  answer: '回答内容',
  avatarUrl: '照片地址',
  bio: '个人简介',
  businessHours: '营业时间',
  capacity: '容量',
  category: '分类',
  certificates: '资质认证',
  channel: '发送渠道',
  code: '编码',
  content: '内容',
  courseId: '课程',
  displayName: '显示名称',
  email: '邮箱',
  endsAt: '结束时间',
  experience: '经验信息',
  imageUrl: '图片地址',
  initialCredits: '初始课时',
  kind: '交易类型',
  location: '上课地点',
  memberId: '会员',
  name: '名称',
  openId: 'OpenID',
  pageKey: '页面',
  password: '密码',
  phone: '手机号',
  planId: '会籍方案',
  question: '问题标题',
  rating: '评分',
  reason: '原因',
  remainingCredits: '剩余课时',
  roleId: '角色',
  sessionId: '课程时段',
  sortOrder: '排序值',
  specialties: '专长领域',
  startsAt: '开始时间',
  status: '状态',
  studioName: '门店名称',
  title: '标题',
  type: '类型',
  unionId: 'UnionID',
};

const formatters: Record<string, ConstraintFormatter> = {
  isBoolean: (label) => `${label}必须是布尔值`,
  isDateString: (label) => `${label}必须是有效日期`,
  isEmail: () => '请输入有效邮箱地址',
  isEnum: (label) => `请选择有效${label}`,
  isInt: (label) => `${label}必须是整数`,
  isJWT: () => '登录凭证无效',
  isNotEmpty: (label) => `请输入${label}`,
  isNumber: (label) => `${label}必须是数字`,
  isObject: (label) => `${label}必须是对象`,
  isString: (label) => `${label}必须是文本`,
  max: (label, fallback) => `${label}不能大于 ${fallback.match(/\d+/)?.[0] ?? '允许上限'}`,
  maxLength: (label, fallback) => `${label}不能超过 ${fallback.match(/\d+/)?.[0] ?? '允许长度'} 个字符`,
  min: (label, fallback) => `${label}不能小于 ${fallback.match(/\d+/)?.[0] ?? '允许下限'}`,
  minLength: (label, fallback) => `${label}至少 ${fallback.match(/\d+/)?.[0] ?? '指定'} 个字符`,
  matches: (label) => `${label}格式不正确`,
};

const getFieldLabel = (property: string) => fieldLabels[property] || property;

const collectValidationDetails = (
  errors: ValidationError[],
  parentPath = '',
): Record<string, string[]> => {
  return errors.reduce<Record<string, string[]>>((details, error) => {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;
    const label = getFieldLabel(error.property);

    if (error.constraints) {
      const messages = Object.keys(error.constraints).map((key) => {
        const formatter = formatters[key];
        const fallback = String(error.constraints?.[key] || '表单校验未通过');
        if (/[\u4e00-\u9fff]/.test(fallback)) {
          return fallback;
        }
        return formatter ? formatter(label, fallback) : localizeErrorMessage(fallback, '表单校验未通过');
      });
      details[path] = messages;
    }

    if (error.children?.length) {
      Object.assign(details, collectValidationDetails(error.children, path));
    }

    return details;
  }, {});
};

export const createLocalizedValidationException = (errors: ValidationError[]) => {
  const details = collectValidationDetails(errors);
  const firstMessage = Object.values(details)[0]?.[0] || '表单校验未通过';

  return new BadRequestException({
    error: 'VALIDATION_ERROR',
    message: firstMessage,
    details,
  });
};
