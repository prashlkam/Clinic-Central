import React, { useEffect, useState } from 'react';
import { Card, Col, Row, Table, Button, Space, Tag, List, Empty } from 'antd';
import {
  UserOutlined, CalendarOutlined, DollarOutlined,
  WarningOutlined, PlusOutlined, WalletOutlined, TeamOutlined, GiftOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { reportsApi } from '../../api/finance.api';
import { appointmentsApi } from '../../api/appointments.api';
import { analyticsApi } from '../../api/clinic.api';
import { fmtDate } from '../../components/Print/PrintPreview';
import { DashboardStats } from '../../types/finance.types';
import { Appointment } from '../../types/appointment.types';
import { formatINR, formatINRShort } from '../../styles/theme';

const statusColors: Record<string, string> = {
  scheduled: 'blue', confirmed: 'green', in_progress: 'orange',
  completed: 'default', cancelled: 'red', no_show: 'volcano',
};

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcoming, setUpcoming] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [extras, setExtras] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      reportsApi.dashboardStats(),
      appointmentsApi.getUpcoming(10),
    ]).then(([s, u]) => {
      setStats(s);
      setUpcoming(u);
    }).catch(() => undefined).finally(() => setLoading(false));
    analyticsApi.dashboardExtras().then(setExtras).catch(() => setExtras(null));
  }, []);

  const columns = [
    {
      title: 'Date & Time',
      dataIndex: 'appointment_date',
      width: 160,
      render: (d: string) => new Date(d).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
      }),
    },
    { title: 'Patient', dataIndex: 'patient_name', width: 180 },
    { title: 'Treatment', dataIndex: 'treatment_name', width: 180 },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 110,
      render: (s: string) => <Tag color={statusColors[s]}>{s.replace('_', ' ')}</Tag>,
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/appointments?new=1')}>
            New Appointment
          </Button>
          <Button icon={<UserOutlined />} onClick={() => navigate('/patients?new=1')}>
            New Patient
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8}>
          <Card className="stat-card" loading={loading}>
            <div style={{ color: '#0891b2' }}><CalendarOutlined style={{ fontSize: 24 }} /></div>
            <div className="stat-value">{stats?.todayAppointments ?? 0}</div>
            <div className="stat-label">Today's Appointments</div>
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card className="stat-card" loading={loading}>
            <div style={{ color: '#16a34a' }}><DollarOutlined style={{ fontSize: 24 }} /></div>
            <div className="stat-value">{formatINRShort(stats?.monthIncome ?? 0)}</div>
            <div className="stat-label">This Month Income</div>
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card className="stat-card" loading={loading}>
            <div style={{ color: '#dc2626' }}><DollarOutlined style={{ fontSize: 24 }} /></div>
            <div className="stat-value">{formatINRShort(stats?.monthExpenses ?? 0)}</div>
            <div className="stat-label">This Month Expenses</div>
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card className="stat-card" loading={loading}>
            <div style={{ color: '#ea580c' }}><WarningOutlined style={{ fontSize: 24 }} /></div>
            <div className="stat-value">{formatINRShort(stats?.totalOutstanding ?? 0)}</div>
            <div className="stat-label">Outstanding</div>
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card className="stat-card" loading={loading} hoverable onClick={() => navigate('/queue')}>
            <div style={{ color: '#0d9488' }}><TeamOutlined style={{ fontSize: 24 }} /></div>
            <div className="stat-value">{extras?.queue?.waiting ?? 0}</div>
            <div className="stat-label">Waiting now · {extras?.queue?.in_progress ?? 0} in chair · {extras?.queue?.completed ?? 0} done</div>
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card className="stat-card" loading={loading}>
            <div style={{ color: '#7c3aed' }}><WalletOutlined style={{ fontSize: 24 }} /></div>
            <div className="stat-value">{formatINRShort(stats?.totalAdvances ?? 0)}</div>
            <div className="stat-label">Advance Balance</div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card title="Upcoming Appointments" extra={<Button type="link" onClick={() => navigate('/appointments')}>View All</Button>}>
            <Table
              columns={columns}
              dataSource={upcoming}
              rowKey="id"
              pagination={false}
              size="small"
              onRow={(record) => ({
                onClick: () => navigate(`/appointments`),
                style: { cursor: 'pointer' },
              })}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Quick Stats">
            <div style={{ marginBottom: 12 }}>
              <div className="stat-label">Total Patients</div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{stats?.totalPatients ?? 0}</div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div className="stat-label">Net Profit (This Month)</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: (stats?.monthIncome ?? 0) - (stats?.monthExpenses ?? 0) >= 0 ? '#16a34a' : '#dc2626' }}>
                {formatINR((stats?.monthIncome ?? 0) - (stats?.monthExpenses ?? 0))}
              </div>
            </div>
          </Card>
          {(extras?.birthdays?.length || 0) > 0 && (
            <Card title={<span><GiftOutlined style={{ color: '#db2777' }} /> Birthdays today</span>} size="small" style={{ marginTop: 16 }}>
              {extras.birthdays.map((b: any) => (
                <div key={b.id}><a onClick={() => navigate(`/patients/${b.id}`)}>{b.patient_name}</a> · {b.patient_phone}</div>
              ))}
            </Card>
          )}
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={8}>
          <Card title="Follow-ups due (no appointment booked)" size="small" styles={{ body: { maxHeight: 260, overflowY: 'auto' } }}>
            {extras?.followUps?.length ? (
              <List size="small" dataSource={extras.followUps} renderItem={(f: any) => (
                <List.Item>
                  <div>
                    <a onClick={() => navigate(`/patients/${f.patient_id}`)}>{f.patient_name}</a> · {f.patient_phone}
                    <div className="stat-label" style={{ fontSize: 12 }}>{f.reason}</div>
                  </div>
                  <Tag color={f.follow_up_date < new Date().toLocaleDateString('en-CA') ? 'red' : 'blue'}>{fmtDate(f.follow_up_date)}</Tag>
                </List.Item>
              )} />
            ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No recalls pending" />}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Lab work due" size="small" extra={<Button type="link" size="small" onClick={() => navigate('/lab-orders')}>All orders</Button>}
            styles={{ body: { maxHeight: 260, overflowY: 'auto' } }}>
            {extras?.labDue?.length ? (
              <List size="small" dataSource={extras.labDue} renderItem={(o: any) => (
                <List.Item>
                  <div>
                    <a onClick={() => navigate(`/patients/${o.patient_id}`)}>{o.patient_name}</a>
                    <div className="stat-label" style={{ fontSize: 12 }}>{[o.work_type, o.teeth, o.lab_name].filter(Boolean).join(' · ')}</div>
                  </div>
                  <Tag color={o.due_date < new Date().toLocaleDateString('en-CA') ? 'red' : 'orange'}>{fmtDate(o.due_date)}</Tag>
                </List.Item>
              )} />
            ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing due from labs" />}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Low stock" size="small" extra={<Button type="link" size="small" onClick={() => navigate('/inventory')}>Inventory</Button>}
            styles={{ body: { maxHeight: 260, overflowY: 'auto' } }}>
            {extras?.lowStock?.length ? (
              <List size="small" dataSource={extras.lowStock} renderItem={(i: any) => (
                <List.Item>
                  <span>{i.name}</span>
                  <Tag color={i.quantity === 0 ? 'red' : 'orange'}>{i.quantity} {i.unit} left</Tag>
                </List.Item>
              )} />
            ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Stock levels are fine" />}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
