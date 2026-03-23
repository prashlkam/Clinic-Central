import React, { useState } from 'react';
import { Modal, Form, Input, Button, message, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { doctorApi } from '../../api/doctor.api';

const { Title, Paragraph } = Typography;

interface LoginDialogProps {
  open: boolean;
  doctorName: string;
  onSuccess: () => void;
}

const LoginDialog: React.FC<LoginDialogProps> = ({ open, doctorName, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values: { password: string }) => {
    setLoading(true);
    try {
      await doctorApi.login(values.password);
      onSuccess();
    } catch (err: any) {
      message.error(err.message || 'Invalid password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      closable={false}
      footer={null}
      width={400}
      centered
      maskClosable={false}
    >
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <LockOutlined style={{ fontSize: 40, color: '#0891b2', marginBottom: 8 }} />
        <Title level={3} style={{ margin: 0 }}>Welcome back</Title>
        <Paragraph type="secondary">{doctorName}</Paragraph>
      </div>

      <Form onFinish={handleLogin}>
        <Form.Item name="password" rules={[{ required: true, message: 'Please enter your password' }]}>
          <Input.Password size="large" placeholder="Enter password" autoFocus />
        </Form.Item>

        <Button type="primary" htmlType="submit" block size="large" loading={loading}>
          Unlock
        </Button>
      </Form>
    </Modal>
  );
};

export default LoginDialog;
