import React, { useEffect, useState, useCallback } from 'react';
import { Table, Input, Button, Space, Tag, Select, DatePicker, message, Popconfirm, Tooltip } from 'antd';
import { PlusOutlined, SearchOutlined, ExportOutlined, DeleteOutlined, EditOutlined, CheckOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { appointmentsApi } from '../../api/appointments.api';
import { excelApi } from '../../api/finance.api';
import { Appointment, AppointmentFilters } from '../../types/appointment.types';
import AppointmentFormModal from './AppointmentFormModal';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const statusColors: Record<string, string> = {
  scheduled: 'blue', confirmed: 'green', in_progress: 'orange',
  completed: 'default', cancelled: 'red', no_show: 'volcano',
};

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' },
];

const AppointmentListPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<AppointmentFilters>({ page: 1, pageSize: 20 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editAppointment, setEditAppointment] = useState<Appointment | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    const result = await appointmentsApi.list(filters);
    setAppointments(result.data);
    setTotal(result.total);
    setLoading(false);
  }, [filters]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);
  useEffect(() => {
    if (searchParams.get('new') === '1') setModalOpen(true);
  }, []);

  const handleSave = async (data: any) => {
    setSaving(true);
    if (editAppointment) {
      await appointmentsApi.update(editAppointment.id, data);
      message.success('Appointment updated');
    } else {
      await appointmentsApi.create(data);
      message.success('Appointment created');
    }
    setSaving(false);
    setModalOpen(false);
    setEditAppointment(null);
    fetchAppointments();
  };

  const updateStatus = async (id: number, status: string) => {
    await appointmentsApi.update(id, { status });
    message.success(`Status updated to ${status}`);
    fetchAppointments();
  };

  const columns = [
    {
      title: 'Date & Time', dataIndex: 'appointment_date', width: 170,
      render: (d: string) => new Date(d).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      }),
    },
    { title: 'Patient', dataIndex: 'patient_name', width: 180 },
    { title: 'Phone', dataIndex: 'patient_phone', width: 120 },
    { title: 'Treatment', dataIndex: 'treatment_name', width: 180 },
    { title: 'Duration', dataIndex: 'duration_minutes', width: 80, render: (v: number) => `${v} min` },
    {
      title: 'Status', dataIndex: 'status', width: 120,
      render: (s: string, r: Appointment) => (
        <Select
          value={s}
          size="small"
          style={{ width: 110 }}
          onChange={(val) => updateStatus(r.id, val)}
          onClick={(e) => e.stopPropagation()}
        >
          {statusOptions.filter(o => o.value !== 'all').map(o => (
            <Select.Option key={o.value} value={o.value}>
              <Tag color={statusColors[o.value]}>{o.label}</Tag>
            </Select.Option>
          ))}
        </Select>
      ),
    },
    { title: 'Notes', dataIndex: 'notes', ellipsis: true },
    {
      title: 'Actions', width: 100, key: 'actions',
      render: (_: any, r: Appointment) => (
        <Space>
          <Tooltip title="Edit">
            <Button size="small" icon={<EditOutlined />} onClick={() => { setEditAppointment(r); setModalOpen(true); }} />
          </Tooltip>
          <Popconfirm title="Delete?" onConfirm={() => { appointmentsApi.delete(r.id).then(() => { message.success('Deleted'); fetchAppointments(); }); }}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>Appointments</h2>
        <Space>
          <Button icon={<ExportOutlined />} onClick={async () => {
            const r = await excelApi.exportAppointments(filters);
            if (r) message.success(`Exported ${r.count} appointments`);
          }}>Export</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditAppointment(null); setModalOpen(true); }}>
            New Appointment
          </Button>
        </Space>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Search..."
          allowClear
          style={{ width: 250 }}
          onChange={(e) => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
        />
        <Select
          defaultValue="all"
          style={{ width: 150 }}
          options={statusOptions}
          onChange={(val) => setFilters(f => ({ ...f, status: val, page: 1 }))}
        />
        <RangePicker
          format="DD-MM-YYYY"
          onChange={(dates) => {
            setFilters(f => ({
              ...f,
              startDate: dates?.[0]?.toISOString(),
              endDate: dates?.[1]?.toISOString(),
              page: 1,
            }));
          }}
        />
      </Space>

      <Table
        columns={columns}
        dataSource={appointments}
        rowKey="id"
        loading={loading}
        pagination={{
          current: filters.page, pageSize: filters.pageSize, total,
          onChange: (page, pageSize) => setFilters(f => ({ ...f, page, pageSize })),
          showSizeChanger: true, showTotal: (t) => `${t} appointments`,
        }}
        size="middle"
      />

      <AppointmentFormModal
        open={modalOpen}
        appointment={editAppointment}
        onClose={() => { setModalOpen(false); setEditAppointment(null); }}
        onSave={handleSave}
        loading={saving}
      />
    </div>
  );
};

export default AppointmentListPage;
