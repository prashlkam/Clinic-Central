import React, { useState } from 'react';
import { Modal, Form, Input, Button, message, Row, Col, Typography } from 'antd';
import { UserAddOutlined } from '@ant-design/icons';
import { doctorApi } from '../../api/doctor.api';

const { Title, Paragraph } = Typography;

interface RegisterDialogProps {
  open: boolean;
  onSuccess: () => void;
}

const RegisterDialog: React.FC<RegisterDialogProps> = ({ open, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const values = await form.validateFields();
    if (values.password !== values.confirm_password) {
      message.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await doctorApi.register({
        name: values.name,
        email: values.email,
        phone: values.phone,
        specialization: values.specialization,
        qualification: values.qualification,
        registration_number: values.registration_number,
        password: values.password,
      });
      message.success('Registration successful!');
      onSuccess();
    } catch (err: any) {
      message.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      closable={false}
      footer={null}
      width={600}
      centered
      maskClosable={false}
    >
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <UserAddOutlined style={{ fontSize: 40, color: '#0891b2', marginBottom: 8 }} />
        <Title level={3} style={{ margin: 0 }}>Welcome to Clinic Central</Title>
        <Paragraph type="secondary">Set up your doctor profile to get started</Paragraph>
      </div>

      <Form form={form} layout="vertical" onFinish={handleRegister}>
        <Form.Item name="name" label="Full Name" rules={[{ required: true, message: 'Please enter your name' }]}>
          <Input placeholder="Dr. John Doe" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Please enter a valid email' }]}>
              <Input placeholder="doctor@clinic.com" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="phone" label="Phone">
              <Input placeholder="+91 98765 43210" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="specialization" label="Specialization">
              <Input placeholder="e.g. General Dentistry" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="qualification" label="Qualification">
              <Input placeholder="e.g. BDS, MDS" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="registration_number" label="Medical Registration Number">
          <Input placeholder="e.g. KA-12345" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="password" label="Password" rules={[{ required: true, min: 4, message: 'Minimum 4 characters' }]}>
              <Input.Password placeholder="Set a password" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="confirm_password" label="Confirm Password" rules={[{ required: true, message: 'Please confirm password' }]}>
              <Input.Password placeholder="Confirm password" />
            </Form.Item>
          </Col>
        </Row>

        <Button type="primary" htmlType="submit" block size="large" loading={loading}>
          Register & Get Started
        </Button>
      </Form>
    </Modal>
  );
};

export default RegisterDialog;
