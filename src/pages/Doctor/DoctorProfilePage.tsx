import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, message, Row, Col, Space, TimePicker, Select, InputNumber, Upload, Avatar, Divider } from 'antd';
import { SaveOutlined, UploadOutlined, UserOutlined, LockOutlined } from '@ant-design/icons';
import { doctorApi } from '../../api/doctor.api';
import dayjs from 'dayjs';

const weekdays = [
  { label: 'Sunday', value: 'Sun' },
  { label: 'Monday', value: 'Mon' },
  { label: 'Tuesday', value: 'Tue' },
  { label: 'Wednesday', value: 'Wed' },
  { label: 'Thursday', value: 'Thu' },
  { label: 'Friday', value: 'Fri' },
  { label: 'Saturday', value: 'Sat' },
];

const DoctorProfilePage: React.FC = () => {
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    doctorApi.getProfile().then((profile: any) => {
      if (profile) {
        form.setFieldsValue({
          ...profile,
          consultation_fee: profile.consultation_fee_paise ? profile.consultation_fee_paise / 100 : undefined,
          working_hours_start: profile.working_hours_start ? dayjs(profile.working_hours_start, 'HH:mm') : dayjs('09:00', 'HH:mm'),
          working_hours_end: profile.working_hours_end ? dayjs(profile.working_hours_end, 'HH:mm') : dayjs('18:00', 'HH:mm'),
          days_off: profile.days_off ? profile.days_off.split(',').filter(Boolean) : [],
        });
        setPhoto(profile.photo || null);
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    const values = await form.validateFields();
    const data: any = {
      name: values.name,
      email: values.email,
      phone: values.phone || '',
      specialization: values.specialization || '',
      qualification: values.qualification || '',
      registration_number: values.registration_number || '',
      bio: values.bio || '',
      experience_years: values.experience_years || null,
      consultation_fee_paise: values.consultation_fee ? Math.round(values.consultation_fee * 100) : 0,
      working_hours_start: values.working_hours_start?.format('HH:mm') || '09:00',
      working_hours_end: values.working_hours_end?.format('HH:mm') || '18:00',
      days_off: (values.days_off || []).join(','),
      photo: photo || '',
    };
    await doctorApi.updateProfile(data);
    message.success('Profile updated');
  };

  const handleChangePassword = async () => {
    const values = await passwordForm.validateFields();
    if (values.new_password !== values.confirm_password) {
      message.error('New passwords do not match');
      return;
    }
    try {
      await doctorApi.changePassword(values.old_password, values.new_password);
      message.success('Password changed');
      passwordForm.resetFields();
    } catch (err: any) {
      message.error(err.message || 'Failed to change password');
    }
  };

  const handlePhotoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
    return false; // prevent auto upload
  };

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Doctor's Profile</h2>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="Profile Information" loading={loading}>
            <Form form={form} layout="vertical" onFinish={handleSave}>
              <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
                <Input placeholder="Dr. John Doe" />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
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

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="registration_number" label="Registration Number">
                    <Input placeholder="e.g. KA-12345" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="experience_years" label="Experience (years)">
                    <InputNumber min={0} max={70} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="consultation_fee" label="Consultation Fee (INR)">
                <InputNumber min={0} prefix="Rs." style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item name="bio" label="About / Bio">
                <Input.TextArea rows={3} placeholder="Brief description about you and your practice..." />
              </Form.Item>

              <Button type="primary" icon={<SaveOutlined />} htmlType="submit">Save Profile</Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <Card title="Photo">
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <Avatar
                  size={100}
                  src={photo}
                  icon={!photo ? <UserOutlined /> : undefined}
                  style={{ marginBottom: 12 }}
                />
              </div>
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={handlePhotoUpload}
              >
                <Button icon={<UploadOutlined />} block>Upload Photo</Button>
              </Upload>
              {photo && (
                <Button block style={{ marginTop: 8 }} danger onClick={() => setPhoto(null)}>
                  Remove Photo
                </Button>
              )}
            </Card>

            <Card title="Working Hours">
              <Form form={form} layout="vertical">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="working_hours_start" label="Start Time">
                      <TimePicker format="HH:mm" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="working_hours_end" label="End Time">
                      <TimePicker format="HH:mm" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="days_off" label="Days Off">
                  <Select mode="multiple" placeholder="Select days off" options={weekdays} />
                </Form.Item>
              </Form>
            </Card>

            <Card title="Change Password">
              <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword}>
                <Form.Item name="old_password" label="Current Password" rules={[{ required: true }]}>
                  <Input.Password />
                </Form.Item>
                <Form.Item name="new_password" label="New Password" rules={[{ required: true, min: 4 }]}>
                  <Input.Password />
                </Form.Item>
                <Form.Item name="confirm_password" label="Confirm New Password" rules={[{ required: true }]}>
                  <Input.Password />
                </Form.Item>
                <Button icon={<LockOutlined />} htmlType="submit" block>Change Password</Button>
              </Form>
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  );
};

export default DoctorProfilePage;
