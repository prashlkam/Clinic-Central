import React, { useEffect, useState, useCallback } from 'react';
import { Table, Input, Button, Space, Tag, Select, DatePicker, message, Modal, Form, InputNumber, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined, ExportOutlined, ImportOutlined, DeleteOutlined } from '@ant-design/icons';
import { transactionsApi, excelApi } from '../../api/finance.api';
import { patientsApi } from '../../api/patients.api';
import { invoicesApi } from '../../api/finance.api';
import { Transaction, TransactionFilters } from '../../types/finance.types';
import { formatINR } from '../../styles/theme';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const typeColors: Record<string, string> = {
  income: 'green', expense: 'red', advance: 'blue', refund: 'orange',
};

const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
];

const TransactionListPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<TransactionFilters>({ page: 1, pageSize: 20 });
  const [modalOpen, setModalOpen] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [form] = Form.useForm();

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const result = await transactionsApi.list(filters);
    setTransactions(result.data);
    setTotal(result.total);
    setLoading(false);
  }, [filters]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const openForm = () => {
    form.resetFields();
    form.setFieldsValue({ type: 'income', payment_method: 'cash', transaction_date: dayjs() });
    patientsApi.getAll().then(setPatients);
    invoicesApi.list({ pageSize: 200, status: 'partial' }).then(r => setInvoices(r.data));
    setModalOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    await transactionsApi.create({
      ...values,
      amount_paise: Math.round(values.amount * 100),
      transaction_date: values.transaction_date.format('YYYY-MM-DD'),
    });
    message.success('Transaction recorded');
    setModalOpen(false);
    fetchTransactions();
  };

  const columns = [
    {
      title: 'Date', dataIndex: 'transaction_date', width: 110,
      render: (d: string) => new Date(d).toLocaleDateString('en-IN'),
    },
    {
      title: 'Type', dataIndex: 'type', width: 90,
      render: (t: string) => <Tag color={typeColors[t]}>{t}</Tag>,
    },
    { title: 'Category', dataIndex: 'category', width: 130 },
    { title: 'Patient', dataIndex: 'patient_name', width: 160 },
    {
      title: 'Amount', dataIndex: 'amount_paise', width: 120, align: 'right' as const,
      render: (v: number, r: Transaction) => (
        <span style={{ color: r.type === 'income' || r.type === 'advance' ? '#16a34a' : '#dc2626' }}>
          {formatINR(v)}
        </span>
      ),
    },
    {
      title: 'Method', dataIndex: 'payment_method', width: 110,
      render: (m: string) => m?.replace('_', ' ').toUpperCase(),
    },
    { title: 'Reference', dataIndex: 'reference_number', width: 130 },
    { title: 'Invoice', dataIndex: 'invoice_number', width: 130 },
    { title: 'Notes', dataIndex: 'notes', ellipsis: true },
    {
      title: '', width: 50,
      render: (_: any, r: Transaction) => (
        <Popconfirm title="Delete?" onConfirm={() => { transactionsApi.delete(r.id).then(() => { message.success('Deleted'); fetchTransactions(); }); }}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>Transactions</h2>
        <Space>
          <Button icon={<ImportOutlined />} onClick={async () => {
            const r = await excelApi.importTransactions();
            if (r) { message.success(`Imported ${r.imported} transactions`); fetchTransactions(); }
          }}>Import</Button>
          <Button icon={<ExportOutlined />} onClick={async () => {
            const r = await excelApi.exportTransactions(filters);
            if (r) message.success(`Exported ${r.count} transactions`);
          }}>Export</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openForm}>Record Transaction</Button>
        </Space>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input prefix={<SearchOutlined />} placeholder="Search..." allowClear style={{ width: 200 }}
          onChange={(e) => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))} />
        <Select defaultValue="all" style={{ width: 120 }}
          options={[{ value: 'all', label: 'All Types' }, ...Object.keys(typeColors).map(t => ({ value: t, label: t }))]}
          onChange={(val) => setFilters(f => ({ ...f, type: val, page: 1 }))} />
        <RangePicker format="DD-MM-YYYY"
          onChange={(dates) => setFilters(f => ({
            ...f, startDate: dates?.[0]?.format('YYYY-MM-DD'), endDate: dates?.[1]?.format('YYYY-MM-DD'), page: 1,
          }))} />
      </Space>

      <Table
        columns={columns} dataSource={transactions} rowKey="id" loading={loading} size="middle"
        pagination={{
          current: filters.page, pageSize: filters.pageSize, total,
          onChange: (page, pageSize) => setFilters(f => ({ ...f, page, pageSize })),
          showSizeChanger: true, showTotal: (t) => `${t} transactions`,
        }}
      />

      <Modal title="Record Transaction" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={handleSave} width={520} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select options={[
              { value: 'income', label: 'Income (Payment Received)' },
              { value: 'expense', label: 'Expense' },
              { value: 'advance', label: 'Advance Payment' },
              { value: 'refund', label: 'Refund' },
            ]} />
          </Form.Item>
          <Form.Item name="amount" label="Amount (₹)" rules={[{ required: true }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="\u20B9" />
          </Form.Item>
          <Form.Item name="patient_id" label="Patient">
            <Select allowClear showSearch optionFilterProp="label"
              options={patients.map(p => ({ value: p.id, label: `${p.first_name} ${p.last_name} (${p.phone_primary})` }))} />
          </Form.Item>
          <Form.Item name="invoice_id" label="Against Invoice">
            <Select allowClear showSearch optionFilterProp="label"
              options={invoices.map((i: any) => ({ value: i.id, label: `${i.invoice_number} - ${i.patient_name}` }))} />
          </Form.Item>
          <Form.Item name="payment_method" label="Payment Method">
            <Select options={paymentMethods} />
          </Form.Item>
          <Form.Item name="transaction_date" label="Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD-MM-YYYY" />
          </Form.Item>
          <Form.Item name="category" label="Category">
            <Input placeholder="e.g. Treatment, Dental Supplies" />
          </Form.Item>
          <Form.Item name="reference_number" label="Reference Number">
            <Input placeholder="UPI ref, cheque number..." />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TransactionListPage;
