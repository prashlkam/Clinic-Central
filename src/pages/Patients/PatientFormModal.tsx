import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, DatePicker, Row, Col } from 'antd';
import { Patient } from '../../types/patient.types';
import dayjs from 'dayjs';
import { membershipsApi } from '../../api/clinic.api';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const CONDITIONS = ['Diabetes', 'Hypertension', 'Heart disease', 'Asthma', 'Thyroid disorder', 'Bleeding disorder', 'Epilepsy',
  'Kidney disease', 'Liver disease / Hepatitis', 'Pregnancy', 'On blood thinners', 'Tobacco use'];

interface Props {
  open: boolean;
  patient?: Patient | null;
  onClose: () => void;
  onSave: (data: any) => void;
  loading?: boolean;
}

const PatientFormModal: React.FC<Props> = ({ open, patient, onClose, onSave, loading }) => {
  const [form] = Form.useForm();
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      membershipsApi.list().then(setPlans).catch(() => setPlans([]));
      if (patient) {
        form.setFieldsValue({
          ...patient,
          date_of_birth: patient.date_of_birth ? dayjs(patient.date_of_birth) : null,
          membership_expiry: patient.membership_expiry ? dayjs(patient.membership_expiry) : null,
          medical_conditions: patient.medical_conditions ? patient.medical_conditions.split(', ').filter(Boolean) : [],
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
        medical_conditions: (values.medical_conditions || []).join(', ') || null,
        membership_plan_id: values.membership_plan_id ?? null,
        membership_expiry: values.membership_plan_id && values.membership_expiry ? values.membership_expiry.format('YYYY-MM-DD') : null,
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
      width={720}
      destroyOnHidden
      maskClosable={false}
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
        <Row gutter={16}>
          <Col span={6}>
            <Form.Item name="blood_group" label="Blood Group">
              <Select allowClear options={BLOOD_GROUPS.map(b => ({ value: b, label: b }))} />
            </Form.Item>
          </Col>
          <Col span={18}>
            <Form.Item name="allergies" label="Allergies (drugs, latex, anaesthetics…)">
              <Input placeholder="Shown as a warning on the patient record and on prescriptions" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="medical_conditions" label="Medical Conditions">
          <Select mode="tags" placeholder="Select or type" options={CONDITIONS.map(c => ({ value: c, label: c }))} />
        </Form.Item>
        <Form.Item name="current_medications" label="Current Medication">
          <Input />
        </Form.Item>
        <Form.Item name="medical_history" label="Medical / Dental History">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="referred_by" label="Referred By">
              <Input />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="membership_plan_id" label="Membership Plan">
              <Select allowClear placeholder={plans.length ? 'None' : 'Create plans under Libraries'}
                options={plans.map(p => ({ value: p.id, label: `${p.name} (${p.discount_percent}%)` }))}
                onChange={(id) => {
                  const plan = plans.find(p => p.id === id);
                  form.setFieldValue('membership_expiry', plan ? dayjs().add(plan.validity_months, 'month') : null);
                }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="membership_expiry" label="Membership Valid Till">
              <DatePicker style={{ width: '100%' }} format="DD-MM-YYYY" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PatientFormModal;
