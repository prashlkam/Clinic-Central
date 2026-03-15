import React, { useEffect, useState } from 'react';
import { Modal, Form, Select, DatePicker, InputNumber, Input } from 'antd';
import { patientsApi } from '../../api/patients.api';
import TreatmentTreeSelect from '../../components/TreatmentTree/TreatmentTreeSelect';
import { Appointment } from '../../types/appointment.types';
import dayjs from 'dayjs';

interface Props {
  open: boolean;
  appointment?: Appointment | null;
  onClose: () => void;
  onSave: (data: any) => void;
  loading?: boolean;
}

const AppointmentFormModal: React.FC<Props> = ({ open, appointment, onClose, onSave, loading }) => {
  const [form] = Form.useForm();
  const [patients, setPatients] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      patientsApi.getAll().then(setPatients);
      if (appointment) {
        form.setFieldsValue({
          ...appointment,
          appointment_date: dayjs(appointment.appointment_date),
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ duration_minutes: 30 });
      }
    }
  }, [open, appointment]);

  const handleOk = () => {
    form.validateFields().then(values => {
      onSave({
        ...values,
        appointment_date: values.appointment_date.toISOString(),
      });
    });
  };

  return (
    <Modal
      title={appointment ? 'Edit Appointment' : 'New Appointment'}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      confirmLoading={loading}
      width={520}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item name="patient_id" label="Patient" rules={[{ required: true }]}>
          <Select
            showSearch
            placeholder="Search patient..."
            optionFilterProp="label"
            options={patients.map(p => ({
              value: p.id,
              label: `${p.first_name} ${p.last_name} (${p.phone_primary})`,
            }))}
          />
        </Form.Item>

        <Form.Item name="treatment_id" label="Treatment">
          <TreatmentTreeSelect />
        </Form.Item>

        <Form.Item name="appointment_date" label="Date & Time" rules={[{ required: true }]}>
          <DatePicker showTime format="DD-MM-YYYY HH:mm" style={{ width: '100%' }} minuteStep={5} />
        </Form.Item>

        <Form.Item name="duration_minutes" label="Duration (minutes)">
          <InputNumber min={5} max={480} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={3} placeholder="Comments about this appointment..." />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AppointmentFormModal;
