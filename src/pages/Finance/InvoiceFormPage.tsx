import React, { useEffect, useState } from 'react';
import { Card, Form, Select, DatePicker, InputNumber, Input, Button, Table, Space, message, Row, Col } from 'antd';
import { PlusOutlined, DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { patientsApi } from '../../api/patients.api';
import { treatmentsApi } from '../../api/treatments.api';
import { invoicesApi } from '../../api/finance.api';
import { InvoiceItem } from '../../types/finance.types';
import { Treatment } from '../../types/treatment.types';
import { formatINR } from '../../styles/theme';
import dayjs from 'dayjs';

const InvoiceFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [patients, setPatients] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    patientsApi.getAll().then(setPatients);
    treatmentsApi.getAllFlat().then(setTreatments);
    form.setFieldsValue({ invoice_date: dayjs(), discount: 0, tax: 0 });
  }, []);

  const addItem = () => {
    setItems([...items, { treatment_id: null, description: '', quantity: 1, unit_price_paise: 0, total_paise: 0 }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;

    if (field === 'treatment_id') {
      const treatment = treatments.find(t => t.id === value);
      if (treatment) {
        newItems[index].description = treatment.name;
        newItems[index].unit_price_paise = treatment.estimated_cost_paise;
        newItems[index].total_paise = treatment.estimated_cost_paise * newItems[index].quantity;
      }
    }

    if (field === 'quantity' || field === 'unit_price_paise') {
      newItems[index].total_paise = newItems[index].unit_price_paise * newItems[index].quantity;
    }

    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, item) => sum + item.total_paise, 0);
  const discount = (form.getFieldValue('discount') || 0) * 100;
  const tax = (form.getFieldValue('tax') || 0) * 100;
  const total = subtotal - discount + tax;

  const handleSave = async () => {
    const values = await form.validateFields();
    if (items.length === 0) { message.error('Add at least one item'); return; }

    setSaving(true);
    const result = await invoicesApi.create({
      patient_id: values.patient_id,
      invoice_date: values.invoice_date.format('YYYY-MM-DD'),
      discount_paise: Math.round((values.discount || 0) * 100),
      tax_paise: Math.round((values.tax || 0) * 100),
      notes: values.notes,
      items,
    });
    message.success(`Invoice ${result.invoice_number} created`);
    setSaving(false);
    navigate('/invoices');
  };

  const itemColumns = [
    {
      title: 'Treatment', width: 250,
      render: (_: any, __: any, index: number) => (
        <Select
          style={{ width: '100%' }}
          showSearch
          optionFilterProp="label"
          value={items[index].treatment_id}
          onChange={(val) => updateItem(index, 'treatment_id', val)}
          options={treatments.map(t => ({
            value: t.id,
            label: `${t.tree_name} > ${t.name}`,
          }))}
          allowClear
        />
      ),
    },
    {
      title: 'Description', width: 200,
      render: (_: any, __: any, index: number) => (
        <Input value={items[index].description} onChange={e => updateItem(index, 'description', e.target.value)} />
      ),
    },
    {
      title: 'Qty', width: 80,
      render: (_: any, __: any, index: number) => (
        <InputNumber min={1} value={items[index].quantity} onChange={v => updateItem(index, 'quantity', v || 1)} style={{ width: '100%' }} />
      ),
    },
    {
      title: 'Unit Price (₹)', width: 140,
      render: (_: any, __: any, index: number) => (
        <InputNumber min={0} precision={2} value={items[index].unit_price_paise / 100}
          onChange={v => updateItem(index, 'unit_price_paise', Math.round((v || 0) * 100))} style={{ width: '100%' }} />
      ),
    },
    {
      title: 'Total', width: 120, align: 'right' as const,
      render: (_: any, __: any, index: number) => formatINR(items[index].total_paise),
    },
    {
      title: '', width: 50,
      render: (_: any, __: any, index: number) => (
        <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeItem(index)} />
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/invoices')}>Back</Button>
        <h2 style={{ margin: 0 }}>New Invoice</h2>
      </Space>

      <Card style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="patient_id" label="Patient" rules={[{ required: true }]}>
                <Select showSearch optionFilterProp="label"
                  options={patients.map(p => ({ value: p.id, label: `${p.first_name} ${p.last_name}` }))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="invoice_date" label="Invoice Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="DD-MM-YYYY" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="notes" label="Notes">
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card title="Line Items" extra={<Button icon={<PlusOutlined />} onClick={addItem}>Add Item</Button>}>
        <Table columns={itemColumns} dataSource={items} rowKey={(_, i) => String(i)} pagination={false} size="small" />

        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Row justify="end">
            <Col span={8}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Subtotal:</span>
                <strong>{formatINR(subtotal)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                <span>Discount (₹):</span>
                <Form.Item name="discount" noStyle>
                  <InputNumber min={0} precision={2} style={{ width: 120 }} onChange={() => form.validateFields()} />
                </Form.Item>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                <span>Tax (₹):</span>
                <Form.Item name="tax" noStyle>
                  <InputNumber min={0} precision={2} style={{ width: 120 }} onChange={() => form.validateFields()} />
                </Form.Item>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700, borderTop: '2px solid #000', paddingTop: 8 }}>
                <span>Total:</span>
                <span>{formatINR(total)}</span>
              </div>
            </Col>
          </Row>
        </div>
      </Card>

      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <Space>
          <Button onClick={() => navigate('/invoices')}>Cancel</Button>
          <Button type="primary" onClick={handleSave} loading={saving}>Create Invoice</Button>
        </Space>
      </div>
    </div>
  );
};

export default InvoiceFormPage;
