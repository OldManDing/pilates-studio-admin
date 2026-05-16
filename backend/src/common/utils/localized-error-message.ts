const exactMessages: Record<string, string> = {
  'Internal server error': '服务器内部错误',
  'Invalid business date value': '业务日期无效',
  'User not authenticated': '用户未登录',
  'Mini user is not allowed to access this resource': '小程序用户无权访问该资源',
  'Knowledge article not found': '知识条目不存在',
  'Notification not found': '通知不存在',
  'Account deletion requests must be processed through the dedicated endpoint': '账号注销申请需要在专用入口处理',
  'Notification is not an account deletion request': '该通知不是账号注销申请',
  'Member not found': '会员不存在',
  'Mini user not found': '小程序用户不存在',
  'Transaction not found': '交易记录不存在',
  'Cannot access another member transaction': '不能访问其他会员的交易记录',
  'Cannot refund a refund transaction': '退款交易不能再次退款',
  'Only completed transactions can be refunded': '只有已完成交易才能退款',
  'Refund amount is invalid': '退款金额无效',
  'Membership renewal transaction must include member and plan': '会籍续费交易必须包含会员和方案',
  'Current membership has not expired; only same-plan renewal is supported': '当前会籍尚未到期，仅支持同方案续费',
  'Feedback content is required': '请输入反馈内容',
  'An account deletion request is already pending': '已有待处理的账号注销申请',
  'Course name already exists': '课程名称已存在',
  'Course not found': '课程不存在',
  'Cannot delete course with related sessions. Disable it instead.': '该课程已有相关排课，不能删除，请改为停用',
  'Only owner can export full backups': '只有店长可以导出完整备份',
  'Only owner can restore backups': '只有店长可以恢复备份',
  'Mini user is already linked to another member': '该小程序用户已绑定其他会员',
  'Member is already linked to another mini user': '该会员已绑定其他小程序用户',
  'OpenID already exists': 'OpenID 已存在',
  'UnionID already exists': 'UnionID 已存在',
  'Mini user is disabled': '小程序用户已停用',
  'code is required': '请输入微信登录凭证',
  'WeChat app credentials are not configured': '微信小程序凭证未配置',
  'Course session not found': '课节不存在',
  'Coach not found': '教练不存在',
  'Capacity cannot be lower than current booked count': '容量不能小于当前已预约人数',
  'Cannot delete a session with active bookings': '存在有效预约的课节不能删除',
  'Cannot delete a session with booking history': '已有预约历史的课节不能删除',
  'Invalid session time': '课节时间无效',
  'Session end time must be after start time': '结束时间必须晚于开始时间',
  'Coach already has another session during this time range': '教练在该时间段已有其他课节',
  'Unable to generate a unique session code': '无法生成唯一课节编号，请重试',
  'Missing WeChat Pay signature headers': '缺少微信支付签名头',
  'Invalid WeChat Pay signature': '微信支付签名无效',
  'Mini user openId is required for WeChat Pay': '微信支付需要小程序 OpenID',
  'Transaction not found for payment notification': '未找到支付通知对应的交易',
  'Payment amount does not match transaction amount': '支付金额与交易金额不一致',
  'Mock payment completion is only available in mock mode': '模拟支付完成仅可在模拟模式使用',
  'Member profile not found': '会员档案不存在',
  'Active membership plan not found': '未找到可用会籍方案',
  'Member ID is required': '请选择会员',
  'Mini user ID is required': '缺少小程序用户身份',
  'Cannot create booking for another member': '不能为其他会员创建预约',
  'Session is not open for booking': '该课节暂未开放预约',
  'Session is fully booked': '该课节已约满',
  'Member already booked for this session': '该会员已预约此课节',
  'Cannot access another member booking': '不能访问其他会员的预约',
  'Cannot update a cancelled booking': '已取消的预约不能修改',
  'Cannot update a completed booking': '已完成的预约不能修改',
  'Insufficient remaining credits': '剩余课时不足',
  'Cannot delete a completed booking': '已完成的预约不能删除',
  'Cannot cancel another member booking': '不能取消其他会员的预约',
  'Booking was updated concurrently, please retry': '预约已被其他操作更新，请重试',
  'Unable to generate a unique booking code': '无法生成唯一预约编号，请重试',
  'Member is not active': '会员状态不可预约',
  'Member does not have an active membership plan': '会员暂无可用会籍方案',
  'Membership has expired': '会籍已过期',
  'Phone or email already registered': '手机号或邮箱已被注册',
  'Phone number already registered': '手机号已被注册',
  'Admin not found': '管理员不存在',
  'Owner admin cannot be deleted': '超级管理员账号禁止删除',
  'Email already registered': '邮箱已被注册',
  'Access token is required': '请先登录',
  'Mini user not found or disabled': '小程序用户不存在或已停用',
  'User not found': '用户不存在',
  'Invalid or expired token': '登录状态已失效，请重新登录',
  'Invalid refresh token': '登录状态已失效，请重新登录',
  'New password and confirmation do not match': '两次输入的新密码不一致',
  'Current password is incorrect': '当前密码不正确',
  'Password changed successfully': '密码已更新',
  'Secret generated. Please verify with a code to enable 2FA.': '已生成密钥，请输入验证码完成两步验证启用',
  'Two-factor authentication not set up': '两步验证尚未设置',
  'Invalid code format': '验证码格式不正确',
  'Invalid verification code': '验证码不正确',
  'Two-factor authentication enabled': '两步验证已开启',
  'Invalid password': '密码不正确',
  'Two-factor authentication disabled': '两步验证已关闭',
  'Code must be a 6-digit number': '请输入 6 位数字验证码',
  'Plan code already exists': '方案编码已存在',
  'Membership plan not found': '会籍方案不存在',
  'Cannot delete plan with active members. Disable it instead.': '该方案仍有关联会员，不能删除，请改为停用',
  'Booking not found': '预约不存在',
  'Cannot check in for a cancelled or no-show booking': '已取消或未到的预约不能签到',
  'Attendance already recorded': '该预约已记录签到',
  'Session must be checked in before completing': '请先签到后再完成课程',
  'Course review requires a completed attendance record': '课程评价需要已完成的签到记录',
  'Attendance record not found': '签到记录不存在',
  'Attendance was updated concurrently, please retry': '签到记录已被其他操作更新，请重试',
  'WeChat Pay request failed': '微信支付请求失败，请稍后重试',
};

export const localizeErrorMessage = (message: unknown, fallback = '操作失败，请检查输入后重试'): string => {
  if (Array.isArray(message)) {
    const normalized = message
      .map((item) => localizeErrorMessage(item, ''))
      .filter(Boolean);
    return normalized.length ? normalized.join('；') : fallback;
  }

  if (typeof message !== 'string') {
    return fallback;
  }

  const text = message.trim();
  if (!text) {
    return fallback;
  }

  if (exactMessages[text]) {
    return exactMessages[text];
  }

  const invalidDateMatch = text.match(/^Invalid (.+) date value(?:: (.+))?$/);
  if (invalidDateMatch) {
    const value = invalidDateMatch[2] ? `：${invalidDateMatch[2]}` : '';
    return `日期参数 ${invalidDateMatch[1]} 无效${value}`;
  }

  const invalidRangeMatch = text.match(/^Invalid (.+) range: from must be earlier than to$/);
  if (invalidRangeMatch) {
    return `日期范围 ${invalidRangeMatch[1]} 无效，开始时间必须早于结束时间`;
  }

  if (text.startsWith('Required permissions:')) {
    return '当前账号权限不足，无法执行此操作';
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

  if (/^[A-Za-z0-9_.]+ must be longer than or equal to \d+ characters$/.test(text)) {
    return '输入内容长度不足';
  }

  if (!/[\u4e00-\u9fff]/.test(text) && /[A-Za-z]/.test(text)) {
    return fallback;
  }

  return text;
};

export const localizeErrorDetails = (details: unknown): Record<string, string[]> | undefined => {
  if (!details || typeof details !== 'object' || Array.isArray(details)) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(details as Record<string, unknown>).map(([key, value]) => [
      key,
      Array.isArray(value)
        ? value.map((item) => localizeErrorMessage(item)).filter(Boolean)
        : [localizeErrorMessage(value)],
    ]),
  );
};
