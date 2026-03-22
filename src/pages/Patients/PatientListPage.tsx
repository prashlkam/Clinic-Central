import React, { useEffect, useState, useCallback } from 'react';
import { Table, Input, Button, Space, Avatar, message, Popconfirm, Tooltip } from 'antd';
import { PlusOutlined, SearchOutlined, ExportOutlined, ImportOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { patientsApi } from '../../api/patients.api';
import { excelApi } from '../../api/finance.api';
import { PatientSummary, PatientFilters } from '../../types/patient.types';
import { formatINR } from '../../styles/theme';
import PatientFormModal from './PatientFormModal';

const PatientListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<PatientFilters>({ page: 1, pageSize: 20 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editPatient, setEditPatient] = useState<PatientSummary | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    const result = await patientsApi.list(filters);
    setPatients(result.data);
    setTotal(result.total);
    setLoading(false);
  }, [filters]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);
  useEffect(() => {
    if (searchParams.get('new') === '1') setModalOpen(true);
  }, []);

  const handleSave = async (data: any) => {
    setSaving(true);
    if (editPatient) {
      await patientsApi.update(editPatient.id, data);
      message.success('Patient updated');
    } else {
      await patientsApi.create(data);
      message.success('Patient created');
    }
    setSaving(false);
    setModalOpen(false);
    setEditPatient(null);
    fetchPatients();
  };

  const handleDelete = async (id: number) => {
    await patientsApi.delete(id);
    message.success('Patient deleted');
    fetchPatients();
  };

  const columns = [
    {
      title: '', width: 48,
      render: (_: any, r: PatientSummary) => (
        <Avatar size="small" className="patient-avatar">
          {r.first_name[0]}{r.last_name?.[0] || ''}
        </Avatar>
      ),
    },
    {
      title: 'Name', key: 'name', sorter: true,
      render: (_: any, r: PatientSummary) => `${r.first_name} ${r.last_name}`,
    },
    { title: 'Phone', dataIndex: 'phone_primary', width: 130 },
    { title: 'Email', dataIndex: 'email', width: 200 },
    { title: 'City', dataIndex: 'city', width: 120 },
    {
      title: 'Registered', dataIndex: 'created_at', width: 110,
      render: (d: string) => d ? new Date(d).toLocaleDateString('en-IN') : '',
    },
    {
      title: 'Outstanding', dataIndex: 'outstanding_paise', width: 120, align: 'right' as const,
      render: (v: number) => v > 0
        ? <span style={{ color: '#dc2626', fontWeight: 500 }}>{formatINR(v)}</span>
        : <span style={{ color: '#9ca3af' }}>{formatINR(0)}</span>,
    },
    {
      title: 'Advance', dataIndex: 'advance_balance_paise', width: 120, align: 'right' as const,
      render: (v: number) => v > 0
        ? <span style={{ color: '#16a34a', fontWeight: 500 }}>{formatINR(v)}</span>
        : <span style={{ color: '#9ca3af' }}>{formatINR(0)}</span>,
    },
    {
      title: 'Actions', width: 100, key: 'actions',
      render: (_: any, r: PatientSummary) => (
        <Space>
          <Tooltip title="Edit">
            <Button size="small" icon={<EditOutlined />} onClick={(e) => {
              e.stopPropagation();
              setEditPatient(r);
              setModalOpen(true);
            }} />
          </Tooltip>
          <Popconfirm title="Delete this patient?" onConfirm={(e) => { e?.stopPropagation(); handleDelete(r.id); }}>
            <Tooltip title="Delete">
              <Button size="small" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>Patients</h2>
        <Space>
          <Button icon={<ImportOutlined />} onClick={async () => {
            const r = await excelApi.importPatients();
            if (r) { message.success(`Imported ${r.imported} patients`); fetchPatients(); }
          }}>Import</Button>
          <Button icon={<ExportOutlined />} onClick={async () => {
            const r = await excelApi.exportPatients();
            if (r) message.success(`Exported ${r.count} patients`);
          }}>Export</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditPatient(null); setModalOpen(true); }}>
            Add Patient
          </Button>
        </Space>
      </div>

      <Input
        prefix={<SearchOutlined />}
        placeholder="Search by name, phone, or email..."
        allowClear
        style={{ marginBottom: 16, maxWidth: 400 }}
        onChange={(e) => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
      />

      <Table
        columns={columns}
        dataSource={patients}
        rowKey="id"
        loading={loading}
        pagination={{
          current: filters.page, pageSize: filters.pageSize, total,
          onChange: (page, pageSize) => setFilters(f => ({ ...f, page, pageSize })),
          showSizeChanger: true, showTotal: (t) => `${t} patients`,
        }}
        onRow={(record) => ({
          onClick: () => navigate(`/patients/${record.id}`),
          style: { cursor: 'pointer' },
        })}
        size="middle"
      />

      <PatientFormModal
        open={modalOpen}
        patient={editPatient}
        onClose={() => { setModalOpen(false); setEditPatient(null); }}
        onSave={handleSave}
        loading={saving}
      />
    </div>
  );
};

export default PatientListPage;
