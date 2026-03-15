import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Space, Tag, Select, DatePicker, message, Input, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined, ExportOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { invoicesApi, excelApi } from '../../api/finance.api';
import { Invoice } from '../../types/finance.types';
import { formatINR } from '../../styles/theme';

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

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    const result = await invoicesApi.list(filters);
    setInvoices(result.data);
    setTotal(result.total);
    setLoading(false);
  }, [filters]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

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
      title: 'Status', dataIndex: 'status', width: 100,
      render: (s: string) => <Tag color={statusColors[s]}>{s}</Tag>,
    },
    {
      title: 'Actions', width: 120, key: 'actions',
      render: (_: any, r: Invoice) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/invoices/${r.id}`)} />
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
    </div>
  );
};

export default InvoicePage;
