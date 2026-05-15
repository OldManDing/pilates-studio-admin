type FormValidationError = {
  errorFields?: Array<{
    errors?: unknown[];
  }>;
};

const englishErrorMessages: Record<string, string> = {
  'Internal server error': '服务器开小差了，请稍后重试',
  'Network request failed': '网络请求失败',
  'Failed to fetch': '网络请求失败',
  'email must be an email': '请输入有效邮箱地址',
  'email should not be empty': '请输入邮箱',
  'Email already registered': '邮箱已被注册',
  'Phone number already registered': '手机号已被注册',
  'Phone or email already registered': '手机号或邮箱已被注册',
  'Member not found': '会员不存在',
  'Remaining credits cannot be negative': '剩余课时不能为负数',
  'Course not found': '课程不存在',
  'Course name already exists': '课程名称已存在',
  'Coach not found': '教练不存在',
  'Course session not found': '课节不存在',
  'Session end time must be after start time': '结束时间必须晚于开始时间',
  'Capacity cannot be lower than current booked count': '容量不能小于当前已预约人数',
  'Coach already has another session during this time range': '教练在该时间段已有其他课节',
  'Session is not open for booking': '该课节暂未开放预约',
  'Session is fully booked': '该课节已约满',
  'Member already booked for this session': '该会员已预约此课节',
  'Insufficient remaining credits': '剩余课时不足',
  'Membership has expired': '会籍已过期',
  'Member is not active': '会员状态不可预约',
  'Member does not have an active membership plan': '会员暂无可用会籍方案',
  'Cannot update a cancelled booking': '已取消的预约不能修改',
  'Cannot update a completed booking': '已完成的预约不能修改',
  'Cannot delete a completed booking': '已完成的预约不能删除',
  'Booking not found': '预约不存在',
  'Attendance already recorded': '该预约已记录签到',
  'Attendance record not found': '签到记录不存在',
  'Membership plan not found': '会籍方案不存在',
  'Plan code already exists': '方案编码已存在',
  'Transaction not found': '交易记录不存在',
  'Only completed transactions can be refunded': '只有已完成交易才能退款',
  'Cannot refund a refund transaction': '退款交易不能再次退款',
  'Refund amount is invalid': '退款金额无效',
  'Admin not found': '管理员不存在',
  'Role not found': '角色不存在',
  'Role code already exists': '角色编码已存在',
  'Reserved roles cannot be deleted': '系统预置角色不能删除',
  'Role cannot be deleted while assigned to admins': '该角色仍被管理员使用，不能删除',
  'Knowledge article not found': '知识条目不存在',
  'Notification not found': '通知不存在',
  'Mini user not found': '小程序用户不存在',
  'Mini user is already linked to another member': '该小程序用户已绑定其他会员',
  'Member is already linked to another mini user': '该会员已绑定其他小程序用户',
  'OpenID already exists': 'OpenID 已存在',
  'UnionID already exists': 'UnionID 已存在',
};

export const localizeErrorText = (message: string): string => {
  const text = message.trim();
  if (!text) return text;

  if (englishErrorMessages[text]) {
    return englishErrorMessages[text];
  }

  if (/^[A-Za-z0-9_.]+ must be an email$/.test(text)) {
    return '请输入有效邮箱地址';
  }

  if (/^[A-Za-z0-9_.]+ should not be empty$/.test(text)) {
    return '请填写必填项';
  }

  if (/^[A-Za-z0-9_.]+ must be a string$/.test(text)) {
    return '字段必须为文本';
  }

  if (/^[A-Za-z0-9_.]+ must not be less than \d+$/.test(text)) {
    return '数值不能小于允许范围';
  }

  if (/^[A-Za-z0-9_.]+ must be longer than or equal to \d+ characters$/.test(text)) {
    return '输入内容长度不足';
  }

  if (!/[\u4e00-\u9fff]/.test(text) && /[A-Za-z]/.test(text)) {
    return '操作失败，请检查输入后重试';
  }

  return text;
};

const getFirstFormValidationMessage = (error: unknown): string | null => {
  if (
    typeof error !== 'object' ||
    error === null ||
    !('errorFields' in error) ||
    !Array.isArray((error as FormValidationError).errorFields)
  ) {
    return null;
  }

  const firstError = (error as FormValidationError).errorFields
    ?.flatMap((field) => field.errors || [])
    .find((item) => typeof item === 'string' && item.trim());

  return typeof firstError === 'string' ? firstError : '请检查表单必填项';
};

export const getErrorMessage = (error: unknown, fallback: string): string => {
  const formValidationMessage = getFirstFormValidationMessage(error);
  if (formValidationMessage) {
    return localizeErrorText(formValidationMessage);
  }

  if (error instanceof Error && error.message.trim()) {
    return localizeErrorText(error.message);
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string' &&
    (error as { message: string }).message.trim()
  ) {
    return localizeErrorText((error as { message: string }).message);
  }

  return fallback;
};
