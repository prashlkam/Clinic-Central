import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, DatePicker, Row, Col, message } from 'antd';
import dayjs from 'dayjs';
import { errorText } from '../../api/clinic.api';

export interface FieldDef {
  name: string;
  label: string;
  /** money fields are stored in paise and edited in rupees; date fields are stored as YYYY-MM-DD */
  type?: 'text' | 'textarea' | 'number' | 'money' | 'select' | 'date' | 'custom';
  options?: { value: any; label: string }[];
  required?: boolean;
  span?: number;
  rows?: number;
  placeholder?: string;
  props?: Record<string, any>;
  /** for type 'custom': an element that accepts value/onChange */
  render?: () => React.ReactElement;
  /** only shown when creating a new record */
  createOnly?: boolean;
}

interface Props {
  open: boolean;
  title: string;
  fields: FieldDef[];
  initial?: Record<string, any> | null;
  width?: number;
  okText?: string;
  onCancel: () => void;
  onSubmit: (values: Record<string, any>) => Promise<any> | any;
}

function toForm(fields: FieldDef[], data: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const f of fields) {
    const v = data[f.name];
    if (v === undefined || v === null) continue;
    if (f.type === 'date') out[f.name] = v ? dayjs(v) : null;
    else if (f.type === 'money') out[f.name] = v / 100;
    else out[f.name] = v;
  }
  return out;
}

function fromForm(fields: FieldDef[], values: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const f of fields) {
    const v = values[f.name];
    // null (not undefined) so that clearing a field is saved
    if (f.type === 'date') out[f.name] = v ? v.format('YYYY-MM-DD') : null;
    else if (f.type === 'money') out[f.name] = Math.round((v || 0) * 100);
    else out[f.name] = v === undefined || v === '' ? null : v;
  }
  return out;
}

function control(f: FieldDef): React.ReactElement {
  switch (f.type) {
    case 'textarea': return <Input.TextArea rows={f.rows || 2} placeholder={f.placeholder} {...f.props} />;
    case 'number': return <InputNumber style={{ width: '100%' }} placeholder={f.placeholder} {...f.props} />;
    case 'money': return <InputNumber min={0} precision={2} prefix="₹" style={{ width: '100%' }} {...f.props} />;
    case 'select': return <Select allowClear showSearch optionFilterProp="label" options={f.options} placeholder={f.placeholder} {...f.props} />;
    case 'date': return <DatePicker format="DD-MM-YYYY" style={{ width: '100%' }} {...f.props} />;
    case 'custom': return f.render!();
    default: return <Input placeholder={f.placeholder} {...f.props} />;
  }
}

/** A modal form generated from field definitions. Stays open (and shows the reason) if saving fails. */
const FormModal: React.FC<Props> = ({ open, title, fields, initial, width = 640, okText = 'Save', onCancel, onSubmit }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial?.id;
  const visible = fields.filter(f => !(f.createOnly && isEdit));

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue(toForm(fields, initial || {}));
    }
  }, [open, initial]);

  const handleOk = async () => {
    let values: Record<string, any>;
    try {
      values = await form.validateFields();
    } catch {
      return; // antd highlights the invalid fields
    }
    setSaving(true);
    try {
      await onSubmit(fromForm(visible, values));
    } catch (err) {
      message.error(errorText(err, 'Could not save'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={title} open={open} onCancel={onCancel} onOk={handleOk} okText={okText}
      confirmLoading={saving} width={width} destroyOnHidden maskClosable={false}>
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          {visible.map(f => (
            <Col key={f.name} span={f.span || 24}>
              <Form.Item name={f.name} label={f.label} rules={f.required ? [{ required: true, message: `${f.label} is required` }] : undefined}>
                {control(f)}
              </Form.Item>
            </Col>
          ))}
        </Row>
      </Form>
    </Modal>
  );
};

export default FormModal;
