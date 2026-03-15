import React, { useEffect, useState } from 'react';
import { Card, Tabs, Select, DatePicker, Button, Table, Space, Row, Col, Tag, message } from 'antd';
import { ExportOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import { reportsApi, excelApi } from '../../api/finance.api';
import { patientsApi } from '../../api/patients.api';
import { ReportFilters } from '../../types/finance.types';
import { formatINR } from '../../styles/theme';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

dayjs.extend(quarterOfYear);

const COLORS = ['#0891b2', '#16a34a', '#dc2626', '#ea580c', '#7c3aed', '#db2777', '#ca8a04', '#64748b'];

const ReportsPage: React.FC = () => {
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: dayjs().startOf('year').format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD'),
    granularity: 'monthly',
  });
  const [patients, setPatients] = useState<any[]>([]);
  const [incomeData, setIncomeData] = useState<any>(null);
  const [balanceSheet, setBalanceSheet] = useState<any>(null);
  const [receivables, setReceivables] = useState<any[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('pl');

  useEffect(() => { patientsApi.getAll().then(setPatients); }, []);

  useEffect(() => {
    loadData();
  }, [filters, activeTab]);

  const loadData = async () => {
    if (activeTab === 'pl') {
      const data = await reportsApi.incomeStatement(filters);
      setIncomeData(data);
    } else if (activeTab === 'balance') {
      const data = await reportsApi.balanceSheet(filters.endDate);
      setBalanceSheet(data);
    } else if (activeTab === 'receivables') {
      const data = await reportsApi.outstandingReceivables({ patientId: filters.patientId });
      setReceivables(data as any[]);
    } else if (activeTab === 'expenses') {
      const data = await reportsApi.expenseBreakdown(filters);
      setExpenseBreakdown(data as any[]);
    }
  };

  const presets = [
    { label: 'This Month', start: dayjs().startOf('month'), end: dayjs() },
    { label: 'Last Month', start: dayjs().subtract(1, 'month').startOf('month'), end: dayjs().subtract(1, 'month').endOf('month') },
    { label: 'This Quarter', start: dayjs().startOf('quarter'), end: dayjs() },
    { label: 'This Year', start: dayjs().startOf('year'), end: dayjs() },
    { label: 'Last Year', start: dayjs().subtract(1, 'year').startOf('year'), end: dayjs().subtract(1, 'year').endOf('year') },
  ];

  const chartData = incomeData?.periods?.map((p: any) => ({
    period: p.period,
    Income: p.income / 100,
    Expenses: p.expenses / 100,
    'Net Profit': p.net_profit / 100,
  })) || [];

  const pieData = expenseBreakdown.map((e: any) => ({ name: e.category, value: e.total / 100 }));

  const receivableColumns = [
    { title: 'Patient', dataIndex: 'patient_name' },
    { title: 'Invoice', dataIndex: 'invoice_number' },
    { title: 'Date', dataIndex: 'invoice_date', render: (d: string) => new Date(d).toLocaleDateString('en-IN') },
    { title: 'Total', dataIndex: 'total_paise', render: (v: number) => formatINR(v) },
    { title: 'Paid', dataIndex: 'paid_paise', render: (v: number) => formatINR(v) },
    { title: 'Outstanding', dataIndex: 'outstanding_paise', render: (v: number) => <span style={{ color: '#dc2626', fontWeight: 600 }}>{formatINR(v)}</span> },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>Financial Reports</h2>
        <Button icon={<ExportOutlined />} onClick={async () => {
          if (activeTab === 'pl' && incomeData) {
            await excelApi.exportReport(incomeData);
            message.success('Report exported');
          }
        }}>Export to Excel</Button>
      </div>

      {/* Filters */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          {presets.map(p => (
            <Button key={p.label} size="small" onClick={() => setFilters(f => ({
              ...f, startDate: p.start.format('YYYY-MM-DD'), endDate: p.end.format('YYYY-MM-DD'),
            }))}>{p.label}</Button>
          ))}
          <RangePicker size="small" format="DD-MM-YYYY"
            value={[dayjs(filters.startDate), dayjs(filters.endDate)]}
            onChange={(dates) => {
              if (dates) setFilters(f => ({ ...f, startDate: dates[0]!.format('YYYY-MM-DD'), endDate: dates[1]!.format('YYYY-MM-DD') }));
            }} />
          <Select size="small" value={filters.granularity} style={{ width: 120 }}
            onChange={(val) => setFilters(f => ({ ...f, granularity: val }))}
            options={[
              { value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' },
            ]} />
          <Select size="small" placeholder="Filter by patient" allowClear style={{ width: 200 }} showSearch optionFilterProp="label"
            onChange={(val) => setFilters(f => ({ ...f, patientId: val }))}
            options={patients.map((p: any) => ({ value: p.id, label: `${p.first_name} ${p.last_name}` }))} />
        </Space>
      </Card>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        {
          key: 'pl',
          label: 'Income Statement (P&L)',
          children: (
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                      <RechartsTooltip formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`} />
                      <Legend />
                      <Bar dataKey="Income" fill="#16a34a" />
                      <Bar dataKey="Expenses" fill="#dc2626" />
                      <Bar dataKey="Net Profit" fill="#0891b2" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
              <Col span={24}>
                <Card>
                  <Table
                    dataSource={incomeData?.periods || []}
                    rowKey="period"
                    pagination={false}
                    size="small"
                    columns={[
                      { title: 'Period', dataIndex: 'period' },
                      { title: 'Income', dataIndex: 'income', align: 'right', render: (v: number) => formatINR(v) },
                      { title: 'Expenses', dataIndex: 'expenses', align: 'right', render: (v: number) => formatINR(v) },
                      { title: 'Net Profit', dataIndex: 'net_profit', align: 'right', render: (v: number) => <span style={{ color: v >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{formatINR(v)}</span> },
                    ]}
                    summary={() => incomeData?.totals ? (
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0}><strong>Total</strong></Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right"><strong>{formatINR(incomeData.totals.income)}</strong></Table.Summary.Cell>
                        <Table.Summary.Cell index={2} align="right"><strong>{formatINR(incomeData.totals.expenses)}</strong></Table.Summary.Cell>
                        <Table.Summary.Cell index={3} align="right"><strong style={{ color: incomeData.totals.net_profit >= 0 ? '#16a34a' : '#dc2626' }}>{formatINR(incomeData.totals.net_profit)}</strong></Table.Summary.Cell>
                      </Table.Summary.Row>
                    ) : undefined}
                  />
                </Card>
              </Col>
            </Row>
          ),
        },
        {
          key: 'balance',
          label: 'Balance Sheet',
          children: balanceSheet ? (
            <Row gutter={16}>
              <Col span={8}>
                <Card title="Assets">
                  <div style={{ marginBottom: 8 }}>Cash Balance: <strong>{formatINR(balanceSheet.assets.cash)}</strong></div>
                  <div style={{ marginBottom: 8 }}>Receivables: <strong>{formatINR(balanceSheet.assets.receivables)}</strong></div>
                  <div style={{ borderTop: '2px solid #000', paddingTop: 8, fontSize: 16 }}>Total: <strong>{formatINR(balanceSheet.assets.total)}</strong></div>
                </Card>
              </Col>
              <Col span={8}>
                <Card title="Liabilities">
                  <div style={{ marginBottom: 8 }}>Advance Payments: <strong>{formatINR(balanceSheet.liabilities.advances)}</strong></div>
                  <div style={{ borderTop: '2px solid #000', paddingTop: 8, fontSize: 16 }}>Total: <strong>{formatINR(balanceSheet.liabilities.total)}</strong></div>
                </Card>
              </Col>
              <Col span={8}>
                <Card title="Equity">
                  <div style={{ fontSize: 24, fontWeight: 700, color: balanceSheet.equity >= 0 ? '#16a34a' : '#dc2626' }}>
                    {formatINR(balanceSheet.equity)}
                  </div>
                </Card>
              </Col>
            </Row>
          ) : null,
        },
        {
          key: 'receivables',
          label: 'Outstanding Receivables',
          children: (
            <Card>
              <Table columns={receivableColumns} dataSource={receivables} rowKey="id" size="small"
                summary={() => {
                  const totalOutstanding = receivables.reduce((s: number, r: any) => s + r.outstanding_paise, 0);
                  return (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={5} align="right"><strong>Total Outstanding</strong></Table.Summary.Cell>
                      <Table.Summary.Cell index={1}><strong style={{ color: '#dc2626' }}>{formatINR(totalOutstanding)}</strong></Table.Summary.Cell>
                    </Table.Summary.Row>
                  );
                }}
              />
            </Card>
          ),
        },
        {
          key: 'expenses',
          label: 'Expense Breakdown',
          children: (
            <Row gutter={16}>
              <Col span={12}>
                <Card>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label={({ name, percent }: any) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}>
                        {pieData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
              <Col span={12}>
                <Card>
                  <Table dataSource={expenseBreakdown} rowKey="category" pagination={false} size="small"
                    columns={[
                      { title: 'Category', dataIndex: 'category' },
                      { title: 'Count', dataIndex: 'count', width: 80 },
                      { title: 'Total', dataIndex: 'total', align: 'right', render: (v: number) => formatINR(v) },
                    ]}
                  />
                </Card>
              </Col>
            </Row>
          ),
        },
      ]} />
    </div>
  );
};

export default ReportsPage;
