import React, { useEffect, useState } from 'react';
import { Card, Descriptions, Tabs, Table, Tag, Button, Row, Col, Space, Spin } from 'antd';
import { ArrowLeftOutlined, CalendarOutlined, DollarOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { patientsApi } from '../../api/patients.api';
import { appointmentsApi } from '../../api/appointments.api';
import { invoicesApi } from '../../api/finance.api';
import { reportsApi } from '../../api/finance.api';
import { PatientSummary } from '../../types/patient.types';
import { formatINR } from '../../styles/theme';

const statusColors: Record<string, string> = {
  scheduled: 'blue', confirmed: 'green', in_progress: 'orange',
  completed: 'default', cancelled: 'red', no_show: 'volcano',
};

const PatientDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientSummary | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const pid = parseInt(id);
    Promise.all([
      patientsApi.getById(pid),
      appointmentsApi.list({ patientId: pid, pageSize: 100 }),
      invoicesApi.list({ patientId: pid, pageSize: 100 }),
      reportsApi.patientLedger(pid),
    ]).then(([p, a, inv, l]) => {
      setPatient(p);
      setAppointments(a.data);
      setInvoices(inv.data);
      setLedger(l);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!patient) return <div>Patient not found</div>;

  const age = patient.date_of_birth
    ? Math.floor((Date.now() - new Date(patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const apptColumns = [
    { title: 'Date', dataIndex: 'appointment_date', render: (d: string) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
    { title: 'Treatment', dataIndex: 'treatment_name' },
    { title: 'Status', dataIndex: 'status', render: (s: string) => <Tag color={statusColors[s]}>{s.replace('_', ' ')}</Tag> },
    { title: 'Notes', dataIndex: 'notes', ellipsis: true },
  ];

  const invColumns = [
    { title: 'Invoice #', dataIndex: 'invoice_number' },
    { title: 'Date', dataIndex: 'invoice_date', render: (d: string) => new Date(d).toLocaleDateString('en-IN') },
    { title: 'Total', dataIndex: 'total_paise', render: (v: number) => formatINR(v) },
    { title: 'Status', dataIndex: 'status', render: (s: string) => <Tag color={s === 'paid' ? 'green' : s === 'partial' ? 'orange' : 'blue'}>{s}</Tag> },
  ];

  const ledgerColumns = [
    { title: 'Date', dataIndex: 'date', render: (d: string) => new Date(d).toLocaleDateString('en-IN') },
    { title: 'Type', dataIndex: 'type', render: (t: string) => <Tag color={t === 'income' ? 'green' : t === 'advance' ? 'blue' : 'red'}>{t}</Tag> },
    { title: 'Reference', dataIndex: 'reference' },
    { title: 'Amount', dataIndex: 'amount_paise', render: (v: number) => formatINR(v) },
    { title: 'Method', dataIndex: 'payment_method' },
    { title: 'Notes', dataIndex: 'notes', ellipsis: true },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/patients')}>Back</Button>
      </Space>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={16}>
          <Card>
            <Descriptions title={`${patient.first_name} ${patient.last_name}`} column={2} bordered size="small">
              <Descriptions.Item label="Phone">{patient.phone_primary}</Descriptions.Item>
              <Descriptions.Item label="Email">{patient.email || '-'}</Descriptions.Item>
              <Descriptions.Item label="Age">{age ? `${age} years` : '-'}</Descriptions.Item>
              <Descriptions.Item label="Gender">{patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : patient.gender || '-'}</Descriptions.Item>
              <Descriptions.Item label="Address" span={2}>{[patient.address_line1, patient.city, patient.state, patient.pincode].filter(Boolean).join(', ') || '-'}</Descriptions.Item>
              <Descriptions.Item label="Medical History" span={2}>{patient.medical_history || '-'}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <Card size="small">
              <CalendarOutlined style={{ color: '#0891b2', marginRight: 8 }} />
              <strong>Next Appointment</strong>
              <div style={{ marginTop: 4 }}>
                {patient.next_appointment
                  ? `${new Date(patient.next_appointment).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} - ${patient.next_treatment || 'General'}`
                  : 'None scheduled'}
              </div>
            </Card>
            <Card size="small">
              <DollarOutlined style={{ color: '#16a34a', marginRight: 8 }} />
              <strong>Total Paid</strong>
              <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>{formatINR(patient.total_paid_paise || 0)}</div>
            </Card>
            <Card size="small">
              <DollarOutlined style={{ color: '#dc2626', marginRight: 8 }} />
              <strong>Outstanding</strong>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#dc2626', marginTop: 4 }}>{formatINR(patient.outstanding_paise || 0)}</div>
            </Card>
          </Space>
        </Col>
      </Row>

      <Card style={{ marginTop: 16 }}>
        <Tabs items={[
          {
            key: 'appointments',
            label: `Appointments (${appointments.length})`,
            children: <Table columns={apptColumns} dataSource={appointments} rowKey="id" size="small" pagination={false} />,
          },
          {
            key: 'invoices',
            label: `Invoices (${invoices.length})`,
            children: <Table columns={invColumns} dataSource={invoices} rowKey="id" size="small" pagination={false} />,
          },
          {
            key: 'ledger',
            label: `Ledger (${ledger.length})`,
            children: <Table columns={ledgerColumns} dataSource={ledger} rowKey={(_, i) => String(i)} size="small" pagination={false} />,
          },
        ]} />
      </Card>
    </div>
  );
};

export default PatientDetailPage;
