import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Space, Tag, Select, DatePicker, message, Input, Popconfirm, Modal, Form, InputNumber, Alert, Tooltip } from 'antd';
import { PlusOutlined, SearchOutlined, ExportOutlined, DeleteOutlined, EyeOutlined, WalletOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { invoicesApi, excelApi, transactionsApi } from '../../api/finance.api';
import { Invoice } from '../../types/finance.types';
import { formatINR } from '../../styles/theme';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const statusColors: Record<string, string> = {
  draft: 'default', sent: 'blue', partial: 'orange', paid: 'green', cancelled: 'red',
};

const InvoicePage: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<any>({ page: 1, pageSize: 20 });
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [advanceBalance, setAdvanceBalance] = useState(0);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [advanceForm] = Form.useForm();

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    const result = await invoicesApi.list(filters);
    setInvoices(result.data);
    setTotal(result.total);
    setLoading(false);
  }, [filters]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const openSettleModal = async (inv: Invoice) => {
    try {
      const bal = await transactionsApi.getPatientAdvanceBalance(inv.patient_id);
      setAdvanceBalance(bal);
      setSelectedInvoice(inv);
      advanceForm.resetFields();
      advanceForm.setFieldsValue({ amount: Math.min(bal, inv.balance_paise || 0) / 100 });
      setAdvanceModalOpen(true);
    } catch (err: any) {
      message.error(err?.message || 'Failed to fetch advance balance');
    }
  };

  const applyAdvance = async () => {
    if (!selectedInvoice) return;
    try {
      const values = await advanceForm.validateFields();
      await transactionsApi.applyAdvanceToInvoice({
        patient_id: selectedInvoice.patient_id,
        invoice_id: selectedInvoice.id,
        amount_paise: Math.round(values.amount * 100),
        transaction_date: dayjs().format('YYYY-MM-DD'),
      });
      message.success('Advance applied to invoice');
      setAdvanceModalOpen(false);
      setSelectedInvoice(null);
      fetchInvoices();
    } catch (err: any) {
      message.error(err?.message || 'Failed to apply advance');
    }
  };

  const columns = [
    { title: 'Invoice #', dataIndex: 'invoice_number', width: 150 },
    {
      title: 'Date', dataIndex: 'invoice_date', width: 110,
      render: (d: string) => new Date(d).toLocaleDateString('en-IN'),
    },
    { title: 'Patient', dataIndex: 'patient_name', width: 180 },
    {
      title: 'Total', dataIndex: 'total_paise', width: 120, align: 'right' as const,
      render: (v: number) => formatINR(v),
    },
    {
      title: 'Balance', dataIndex: 'balance_paise', width: 120, align: 'right' as const,
      render: (v: number, r: Invoice) => r.status === 'cancelled' ? '-' : v > 0
        ? <span style={{ color: '#dc2626', fontWeight: 500 }}>{formatINR(v)}</span>
        : <span style={{ color: '#16a34a', fontWeight: 500 }}>{formatINR(0)}</span>,
    },
    {
      title: 'Status', dataIndex: 'status', width: 100,
      render: (s: string) => <Tag color={statusColors[s]}>{s}</Tag>,
    },
    {
      title: 'Actions', width: 160, key: 'actions',
      render: (_: any, r: Invoice) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/invoices/${r.id}`)} />
          {r.status !== 'paid' && r.status !== 'cancelled' && (r.balance_paise || 0) > 0 && (
            <Tooltip title="Settle from Advance">
              <Button size="small" icon={<WalletOutlined />} onClick={() => openSettleModal(r)} />
            </Tooltip>
          )}
          <Popconfirm title="Delete?" onConfirm={() => {
            invoicesApi.delete(r.id).then(() => { message.success('Deleted'); fetchInvoices(); });
          }}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>Invoices</h2>
        <Space>
          <Button icon={<ExportOutlined />} onClick={async () => {
            const r = await excelApi.exportInvoices(filters);
            if (r) message.success(`Exported ${r.count} invoices`);
          }}>Export</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/invoices/new')}>
            New Invoice
          </Button>
        </Space>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input prefix={<SearchOutlined />} placeholder="Search..." allowClear style={{ width: 200 }}
          onChange={(e) => setFilters((f: any) => ({ ...f, search: e.target.value, page: 1 }))} />
        <Select defaultValue="all" style={{ width: 130 }}
          options={[{ value: 'all', label: 'All Statuses' }, ...Object.keys(statusColors).map(s => ({ value: s, label: s }))]}
          onChange={(val) => setFilters((f: any) => ({ ...f, status: val, page: 1 }))} />
        <RangePicker format="DD-MM-YYYY"
          onChange={(dates) => setFilters((f: any) => ({
            ...f, startDate: dates?.[0]?.format('YYYY-MM-DD'), endDate: dates?.[1]?.format('YYYY-MM-DD'), page: 1,
          }))} />
      </Space>

      <Table
        columns={columns} dataSource={invoices} rowKey="id" loading={loading} size="middle"
        pagination={{
          current: filters.page, pageSize: filters.pageSize, total,
          onChange: (page: number, pageSize: number) => setFilters((f: any) => ({ ...f, page, pageSize })),
          showSizeChanger: true, showTotal: (t: number) => `${t} invoices`,
        }}
      />

      <Modal title="Settle from Advance" open={advanceModalOpen} onCancel={() => { setAdvanceModalOpen(false); setSelectedInvoice(null); }}
        onOk={applyAdvance} destroyOnClose okButtonProps={{ disabled: advanceBalance <= 0 }}>
        {advanceBalance > 0 ? (
          <Form form={advanceForm} layout="vertical">
            <Alert
              type="info"
              message={`Patient has ${formatINR(advanceBalance)} available as advance balance. Invoice balance: ${formatINR(selectedInvoice?.balance_paise || 0)}`}
              style={{ marginBottom: 16 }}
            />
            <Form.Item name="amount" label="Amount to Apply (₹)" rules={[{ required: true }]}>
              <InputNumber min={0.01} max={Math.min(advanceBalance, selectedInvoice?.balance_paise || 0) / 100} precision={2} style={{ width: '100%' }} prefix="₹" />
            </Form.Item>
          </Form>
        ) : (
          <Alert type="warning" message="This patient has no advance balance available." />
        )}
      </Modal>
    </div>
  );
};

export default InvoicePage;
