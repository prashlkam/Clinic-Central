import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Space, message, Modal, Form, InputNumber, Input, Select, DatePicker, Tag, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { transactionsApi } from '../../api/finance.api';
import { Transaction } from '../../types/finance.types';
import { formatINR } from '../../styles/theme';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const ExpensePage: React.FC = () => {
  const [expenses, setExpenses] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<any>({ type: 'expense', page: 1, pageSize: 20 });
  const [modalOpen, setModalOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [form] = Form.useForm();

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    const result = await transactionsApi.list(filters);
    setExpenses(result.data);
    setTotal(result.total);
    setLoading(false);
  }, [filters]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const openForm = async () => {
    form.resetFields();
    form.setFieldsValue({ payment_method: 'cash', transaction_date: dayjs() });
    const cats = await transactionsApi.getExpenseCategories();
    setCategories(cats as any[]);
    setModalOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    await transactionsApi.create({
      type: 'expense',
      category: values.category,
      amount_paise: Math.round(values.amount * 100),
      payment_method: values.payment_method,
      transaction_date: values.transaction_date.format('YYYY-MM-DD'),
      reference_number: values.reference_number,
      notes: values.notes,
    });
    message.success('Expense recorded');
    setModalOpen(false);
    fetchExpenses();
  };

  const columns = [
    { title: 'Date', dataIndex: 'transaction_date', width: 110, render: (d: string) => new Date(d).toLocaleDateString('en-IN') },
    { title: 'Category', dataIndex: 'category', width: 150, render: (c: string) => <Tag>{c || 'Uncategorized'}</Tag> },
    { title: 'Amount', dataIndex: 'amount_paise', width: 120, align: 'right' as const, render: (v: number) => <span style={{ color: '#dc2626' }}>{formatINR(v)}</span> },
    { title: 'Method', dataIndex: 'payment_method', width: 110, render: (m: string) => m?.replace('_', ' ') },
    { title: 'Reference', dataIndex: 'reference_number', width: 130 },
    { title: 'Notes', dataIndex: 'notes', ellipsis: true },
    {
      title: '', width: 50,
      render: (_: any, r: Transaction) => (
        <Popconfirm title="Delete?" onConfirm={() => { transactionsApi.delete(r.id).then(() => { message.success('Deleted'); fetchExpenses(); }); }}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>Expenses</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openForm}>Record Expense</Button>
      </div>

      <Space style={{ marginBottom: 16 }}>
        <RangePicker format="DD-MM-YYYY" onChange={(dates) => setFilters((f: any) => ({
          ...f, startDate: dates?.[0]?.format('YYYY-MM-DD'), endDate: dates?.[1]?.format('YYYY-MM-DD'), page: 1,
        }))} />
      </Space>

      <Table columns={columns} dataSource={expenses} rowKey="id" loading={loading} size="middle"
        pagination={{
          current: filters.page, pageSize: filters.pageSize, total,
          onChange: (page: number, pageSize: number) => setFilters((f: any) => ({ ...f, page, pageSize })),
          showSizeChanger: true,
        }}
      />

      <Modal title="Record Expense" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={handleSave} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="category" label="Category" rules={[{ required: true }]}>
            <Select showSearch options={categories.map((c: any) => ({ value: c.name, label: c.name }))} />
          </Form.Item>
          <Form.Item name="amount" label="Amount (₹)" rules={[{ required: true }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="\u20B9" />
          </Form.Item>
          <Form.Item name="payment_method" label="Payment Method">
            <Select options={[
              { value: 'cash', label: 'Cash' }, { value: 'upi', label: 'UPI' },
              { value: 'card', label: 'Card' }, { value: 'bank_transfer', label: 'Bank Transfer' },
              { value: 'cheque', label: 'Cheque' },
            ]} />
          </Form.Item>
          <Form.Item name="transaction_date" label="Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD-MM-YYYY" />
          </Form.Item>
          <Form.Item name="reference_number" label="Reference Number">
            <Input />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ExpensePage;
