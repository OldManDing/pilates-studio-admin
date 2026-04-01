import { MailOutlined, UndoOutlined } from '@ant-design/icons';
import { App, Form, Input } from 'antd';
import { useNavigate } from 'react-router-dom';
import ActionButton from '@/components/ActionButton';
import cls from './index.module.css';

type ForgotValues = {
  account: string;
};

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { message } = App.useApp();

  const handleFinish = ({ account }: ForgotValues) => {
    if (!account.trim()) {
      message.warning('请输入账号后再提交');
      return;
    }

    message.success(`演示模式：重置指引已发送到 ${account}`);
  };

  return (
    <div className={cls.shell}>
      <div className={cls.backdrop} />
      <div className={cls.panel}>
        <div className={cls.brand}>Pilates Studio</div>
        <h1 className={cls.title}>找回登录密码</h1>
        <p className={cls.subtitle}>演示环境：输入任意邮箱或手机号后，将展示模拟的重置提示，不会真的发送邮件。</p>

        <Form<ForgotValues> className={cls.form} layout="vertical" onFinish={handleFinish} initialValues={{ account: 'admin@pilates.com' }}>
          <Form.Item label="账号" name="account" rules={[{ required: true, message: '请输入账号' }]}>
            <Input size="large" prefix={<MailOutlined />} className={cls.input} placeholder="请输入邮箱或手机号" />
          </Form.Item>

          <div className={cls.actions}>
            <ActionButton ghost icon={<UndoOutlined />} onClick={() => navigate('/login', { replace: true })}>返回登录</ActionButton>
            <ActionButton icon={<MailOutlined />} htmlType="submit">发送演示指引</ActionButton>
          </div>
        </Form>
      </div>
    </div>
  );
}
