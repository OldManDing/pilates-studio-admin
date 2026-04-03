import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { App, Form, Input } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ActionButton from '@/components/ActionButton';
import { authApi, setTokens } from '@/services/auth';
import { getSafeRedirectPath } from '@/utils/mockAuth';
import cls from './index.module.css';

type LoginValues = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const redirectPath = useMemo(() => {
    const from = location.state as { from?: string } | undefined;
    return getSafeRedirectPath(from?.from);
  }, [location.state]);

  useEffect(() => {
    const token = localStorage.getItem('pilates_access_token');
    if (token) {
      navigate(redirectPath, { replace: true });
    }
  }, [navigate, redirectPath]);

  const handleFinish = async (values: LoginValues) => {
    setLoading(true);
    try {
      const res = await authApi.login({
        email: values.email,
        password: values.password,
      });
      setTokens(res.accessToken, res.refreshToken);
      message.success('登录成功，欢迎回来');
      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      message.error(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cls.shell}>
      <div className={cls.backdrop} />
      <div className={cls.panel}>
        <div className={cls.brand}>Pilates Studio</div>
        <h1 className={cls.title}>欢迎登录门店管理后台</h1>
        <p className={cls.subtitle}>请使用管理员账号密码登录。</p>

        <Form<LoginValues>
          className={cls.form}
          layout="vertical"
          onFinish={handleFinish}
          initialValues={{ email: 'owner@pilates.com' }}
        >
          <Form.Item
            label="邮箱"
            name="email"
            rules={[{ required: true, message: '请输入邮箱' }]}
          >
            <Input
              size="large"
              prefix={<UserOutlined />}
              className={cls.input}
              placeholder="请输入邮箱"
            />
          </Form.Item>

          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
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

          <ActionButton icon={<LockOutlined />} htmlType="submit" loading={loading}>
            进入管理后台
          </ActionButton>
        </Form>
      </div>
    </div>
  );
}
