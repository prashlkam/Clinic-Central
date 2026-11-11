import React, { useCallback, useEffect, useState } from 'react';
import { Card, Table, Button, Space, Tag, Modal, Form, Select, Input, Row, Col, Statistic, DatePicker, message, Popconfirm } from 'antd';
import { UserAddOutlined, LoginOutlined, PlayCircleOutlined, CheckCircleOutlined, ReloadOutlined, StopOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import { queueApi, errorText } from '../../api/clinic.api';
import { appointmentsApi } from '../../api/appointments.api';
import { patientsApi } from '../../api/patients.api';
import TreatmentTreeSelect from '../../components/TreatmentTree/TreatmentTreeSelect';

const statusColors: Record<string, string> = {
  scheduled: 'blue', confirmed: 'green', in_progress: 'orange', completed: 'default', cancelled: 'red', no_show: 'volcano',
};

/** Reception view of the day: who has arrived (token order), who is in the chair, who is done. */
const QueuePage: React.FC = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [form] = Form.useForm();
  const isToday = date.isSame(dayjs(), 'day');

  const reload = useCallback(async () => {
    try {
      setRows(await queueApi.getQueue(date.format('YYYY-MM-DD')));
    } catch (err) {
      message.error(errorText(err, 'Could not load the queue'));
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    reload();
    const timer = setInterval(reload, 30000);
    return () => clearInterval(timer);
  }, [reload]);

  const act = async (fn: () => Promise<any>, done?: string) => {
    try {
      await fn();
      if (done) message.success(done);
      reload();
    } catch (err) {
      message.error(errorText(err));
    }
  };

  const waiting = rows.filter(r => r.token_number && ['scheduled', 'confirmed'].includes(r.status));
  const inChair = rows.filter(r => r.status === 'in_progress');
  const done = rows.filter(r => r.status === 'completed');
  const expected = rows.filter(r => !r.token_number && ['scheduled', 'confirmed'].includes(r.status));

  const openWalkIn = () => {
    patientsApi.getAll().then(setPatients).catch(() => setPatients([]));
    form.resetFields();
    setWalkInOpen(true);
  };

  const saveWalkIn = async () => {
    let values: any;
    try { values = await form.validateFields(); } catch { return; }
    try {
      const result = await queueApi.walkIn(values);
      message.success(`Walk-in registered. Token ${result.token_number}`);
      setWalkInOpen(false);
      reload();
    } catch (err) {
      message.error(errorText(err, 'Could not register walk-in'));
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Patient Queue</h2>
        <Space>
          <DatePicker value={date} onChange={(d) => d && setDate(d)} format="DD-MM-YYYY" allowClear={false} />
          <Button icon={<ReloadOutlined />} onClick={reload} />
          {isToday && <Button type="primary" icon={<UserAddOutlined />} onClick={openWalkIn}>Walk-in</Button>}
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="Now in chair" value={inChair.length ? inChair.map(r => `#${r.token_number ?? '-'} ${r.patient_name}`).join(', ') : '—'}
              styles={{ content: { fontSize: 18, color: '#ea580c' } }} />
          </Card>
        </Col>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Waiting" value={waiting.length} styles={{ content: { color: '#0891b2' } }} /></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Yet to arrive" value={expected.length} /></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic title="Completed" value={done.length} styles={{ content: { color: '#16a34a' } }} /></Card></Col>
      </Row>

      <Card>
        <Table size="middle" rowKey="id" loading={loading} dataSource={rows} pagination={false}
          locale={{ emptyText: 'No appointments or walk-ins for this day' }}
          columns={[
            { title: 'Token', dataIndex: 'token_number', width: 80, render: (t: number) => t ? <Tag color="cyan" style={{ fontSize: 15, padding: '2px 10px' }}>{t}</Tag> : <span style={{ color: 'var(--text-secondary)' }}>—</span> },
            { title: 'Time', dataIndex: 'appointment_date', width: 90, render: (d: string) => dayjs(d).format('hh:mm A') },
            { title: 'Patient', dataIndex: 'patient_name', render: (n: string, r: any) => <a onClick={() => navigate(`/patients/${r.patient_id}`)}>{n}</a> },
            { title: 'Phone', dataIndex: 'patient_phone', width: 120 },
            { title: 'Treatment', dataIndex: 'treatment_name', render: (t: string, r: any) => <>{t}{r.is_walk_in ? <Tag style={{ marginLeft: 6 }}>walk-in</Tag> : null}</> },
            { title: 'Arrived', dataIndex: 'checked_in_at', width: 90, render: (d: string) => (d ? dayjs(d).format('hh:mm A') : '') },
            { title: 'Status', dataIndex: 'status', width: 120, render: (s: string) => <Tag color={statusColors[s]}>{s.replace('_', ' ')}</Tag> },
            {
              title: '', width: 1, align: 'right' as const,
              render: (_: any, r: any) => (
                <Space size={4} style={{ whiteSpace: 'nowrap' }}>
                  {!r.token_number && ['scheduled', 'confirmed', 'no_show'].includes(r.status) && (
                    <Button size="small" icon={<LoginOutlined />} onClick={() => act(() => queueApi.checkIn(r.id).then((x: any) => message.success(`Checked in. Token ${x.token_number}`)))}>Check in</Button>
                  )}
                  {r.token_number && ['scheduled', 'confirmed'].includes(r.status) && (
                    <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={() => act(() => appointmentsApi.update(r.id, { status: 'in_progress' }))}>Call in</Button>
                  )}
                  {r.status === 'in_progress' && (
                    <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => act(() => appointmentsApi.update(r.id, { status: 'completed' }), 'Visit completed')}>Complete</Button>
                  )}
                  {!r.token_number && ['scheduled', 'confirmed'].includes(r.status) && (
                    <Popconfirm title="Mark as no-show?" onConfirm={() => act(() => appointmentsApi.update(r.id, { status: 'no_show' }))}>
                      <Button size="small" icon={<StopOutlined />}>No show</Button>
                    </Popconfirm>
                  )}
                </Space>
              ),
            },
          ]} />
      </Card>

      <Modal title="Register walk-in patient" open={walkInOpen} onCancel={() => setWalkInOpen(false)} onOk={saveWalkIn} okText="Issue token" destroyOnHidden>
        <Form form={form} layout="vertical">
          <Form.Item name="patient_id" label="Patient" rules={[{ required: true, message: 'Select a patient' }]}
            extra={<a onClick={() => navigate('/patients?new=1')}>Not registered yet? Add the patient first</a>}>
            <Select showSearch optionFilterProp="label" placeholder="Search by name or phone"
              options={patients.map(p => ({ value: p.id, label: `${p.first_name} ${p.last_name} (${p.phone_primary})` }))} />
          </Form.Item>
          <Form.Item name="treatment_id" label="Reason / treatment"><TreatmentTreeSelect /></Form.Item>
          <Form.Item name="notes" label="Notes"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default QueuePage;
