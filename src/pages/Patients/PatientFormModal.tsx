import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, DatePicker, Row, Col } from 'antd';
import { Patient } from '../../types/patient.types';
import dayjs from 'dayjs';

interface Props {
  open: boolean;
  patient?: Patient | null;
  onClose: () => void;
  onSave: (data: any) => void;
  loading?: boolean;
}

const PatientFormModal: React.FC<Props> = ({ open, patient, onClose, onSave, loading }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      if (patient) {
        form.setFieldsValue({
          ...patient,
          date_of_birth: patient.date_of_birth ? dayjs(patient.date_of_birth) : null,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, patient]);

  const handleOk = () => {
    form.validateFields().then(values => {
      onSave({
        ...values,
        date_of_birth: values.date_of_birth ? values.date_of_birth.format('YYYY-MM-DD') : null,
      });
    });
  };

  return (
    <Modal
      title={patient ? 'Edit Patient' : 'New Patient'}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={loading}
      width={640}
      destroyOnClose
    >
      <Form form={form} layout="vertical" size="middle">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="first_name" label="First Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="last_name" label="Last Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="phone_primary" label="Phone" rules={[{ required: true }]}>
              <Input maxLength={10} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="phone_secondary" label="Alt Phone">
              <Input maxLength={10} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="email" label="Email">
              <Input type="email" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="date_of_birth" label="Date of Birth">
              <DatePicker style={{ width: '100%' }} format="DD-MM-YYYY" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="gender" label="Gender">
              <Select allowClear>
                <Select.Option value="M">Male</Select.Option>
                <Select.Option value="F">Female</Select.Option>
                <Select.Option value="O">Other</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="address_line1" label="Address">
          <Input />
        </Form.Item>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="city" label="City">
              <Input />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="state" label="State">
              <Input />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="pincode" label="Pincode">
              <Input maxLength={6} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="medical_history" label="Medical History">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PatientFormModal;
