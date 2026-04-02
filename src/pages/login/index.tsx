import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { App, Form, Input } from 'antd';
import { useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ActionButton from '@/components/ActionButton';
import { getSafeRedirectPath, isDemoAuthed, saveDemoSession } from '@/utils/mockAuth';
import cls from './index.module.css';

type LoginValues = {
  account: string;
  password: string;
};

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = App.useApp();

  const redirectPath = useMemo(() => {
    const from = location.state as { from?: string } | undefined;
    return getSafeRedirectPath(from?.from);
  }, [location.state]);

  useEffect(() => {
    if (isDemoAuthed()) {
      navigate(redirectPath, { replace: true });
    }
  }, [navigate, redirectPath]);

  const handleFinish = (values: LoginValues) => {
    const ok = saveDemoSession(values.account, values.password);
    if (!ok) {
      message.warning('请输入账号和密码后再登录');
      return;
    }

    message.success('登录成功，欢迎回来');
    navigate(redirectPath, { replace: true });
  };

  return (
    <div className={cls.shell}>
      <div className={cls.backdrop} />
      <div className={cls.panel}>
        <div className={cls.brand}>Pilates Studio</div>
        <h1 className={cls.title}>欢迎登录门店管理后台</h1>
        <p className={cls.subtitle}>使用任意邮箱或手机号与密码即可进入预览环境，便于体验不同角色下的后台界面。</p>

        <Form<LoginValues> className={cls.form} layout="vertical" onFinish={handleFinish} initialValues={{ account: 'admin@pilates.com' }}>
          <Form.Item
            label="账号"
            name="account"
            rules={[{ required: true, message: '请输入登录账号' }]}
          >
            <Input
              size="large"
              prefix={<UserOutlined />}
              className={cls.input}
              placeholder="请输入邮箱或手机号"
            />
          </Form.Item>

          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入登录密码' }]}
          >
            <Input.Password
              size="large"
              prefix={<LockOutlined />}
              className={cls.input}
              placeholder="请输入密码"
            />
          </Form.Item>

          <div className={cls.helperRow}>
            <Link className={cls.helperLink} to="/forgot-password">忘记密码？</Link>
          </div>

          <ActionButton icon={<LockOutlined />} htmlType="submit">进入管理后台</ActionButton>
        </Form>
      </div>
    </div>
  );
}
