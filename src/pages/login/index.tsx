import { LockOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons';
import { App, Form, Input } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ActionButton from '@/components/ActionButton';
import { authApi, setTokens, type AuthResponse, type LoginMfaChallenge } from '@/services/auth';
import { getErrorMessage } from '@/utils/errors';
import { getSafeRedirectPath } from '@/utils/mockAuth';
import cls from './index.module.css';

type LoginValues = {
  email: string;
  password: string;
  code: string;
};

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<LoginValues>();
  const [mfaChallenge, setMfaChallenge] = useState<LoginMfaChallenge | null>(null);

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

      if ('requiresTwoFactor' in res && res.requiresTwoFactor) {
        setMfaChallenge(res);
        message.info('请输入两步验证码以完成登录');
        return;
      }

      const authRes = res as AuthResponse;
      setTokens(authRes.accessToken, authRes.refreshToken);
      message.success('登录成功，欢迎回来');
      navigate(redirectPath, { replace: true });
    } catch (err) {
      message.error(getErrorMessage(err, '登录失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTwoFactor = async () => {
    try {
      const code = form.getFieldValue('code');
      if (!code) {
        message.warning('请输入两步验证码');
        return;
      }

      setLoading(true);
      const res = await authApi.verifyLoginTwoFactor({
        mfaToken: mfaChallenge!.mfaToken,
        code,
      });
      setTokens(res.accessToken, res.refreshToken);
      message.success('登录成功，欢迎回来');
      navigate(redirectPath, { replace: true });
    } catch (err) {
      message.error(getErrorMessage(err, '两步验证失败'));
    } finally {
      setLoading(false);
    }
  };

  const resetMfaChallenge = () => {
    setMfaChallenge(null);
    form.setFieldValue('code', '');
  };

  return (
    <div className={cls.shell}>
      <div className={cls.backdrop} />
      <div className={cls.panel}>
        <div className={cls.brand}>普拉提工作室</div>
        <h1 className={cls.title}>欢迎登录门店管理后台</h1>
        <p className={cls.subtitle}>{mfaChallenge ? '请输入动态验证码完成登录。' : '请使用管理员账号密码登录。'}</p>

        <Form<LoginValues>
          form={form}
          className={cls.form}
          layout="vertical"
          onFinish={mfaChallenge ? handleVerifyTwoFactor : handleFinish}
          initialValues={{ email: 'owner@pilates.com' }}
        >
          {!mfaChallenge ? (
            <>
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
            </>
          ) : (
            <>
              <Form.Item
                label="两步验证码"
                name="code"
                rules={[
                  { required: true, message: '请输入两步验证码' },
                  { pattern: /^\d{6}$/, message: '请输入 6 位数字验证码' },
                ]}
              >
                <Input
                  size="large"
                  prefix={<SafetyCertificateOutlined />}
                  className={cls.input}
                  placeholder="请输入 6 位动态验证码"
                  maxLength={6}
                />
              </Form.Item>

              <div className={cls.helperRow}>
                <button type="button" className={cls.helperLink} onClick={resetMfaChallenge}>
                  返回账号密码登录
                </button>
              </div>

              <ActionButton icon={<SafetyCertificateOutlined />} htmlType="submit" loading={loading}>
                验证并登录
              </ActionButton>
            </>
          )}
        </Form>
      </div>
    </div>
  );
}
