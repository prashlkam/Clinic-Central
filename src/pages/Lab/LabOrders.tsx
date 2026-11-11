import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Select, Tag, Tooltip, Button, Popconfirm, message } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import CrudTable, { CrudTableHandle } from '../../components/Crud/CrudTable';
import { FieldDef } from '../../components/Crud/FormModal';
import { labApi, errorText } from '../../api/clinic.api';
import { patientsApi } from '../../api/patients.api';
import { fmtDate } from '../../components/Print/PrintPreview';
import { formatINR } from '../../styles/theme';

export const LAB_STATUS: Record<string, { label: string; color: string }> = {
  ordered: { label: 'Ordered', color: 'blue' },
  sent: { label: 'Sent to lab', color: 'cyan' },
  trial: { label: 'Trial', color: 'orange' },
  received: { label: 'Received', color: 'purple' },
  fitted: { label: 'Fitted / delivered', color: 'green' },
  cancelled: { label: 'Cancelled', color: 'red' },
};
const statusOptions = Object.entries(LAB_STATUS).map(([value, s]) => ({ value, label: s.label }));
const WORK_TYPES = ['Crown', 'Bridge', 'Veneer', 'Inlay / Onlay', 'Complete denture', 'Partial denture', 'Flexible denture',
  'Implant prosthesis', 'Aligner', 'Retainer', 'Night guard', 'Space maintainer', 'Study model', 'Repair / reline', 'Other'];
const MATERIALS = ['PFM', 'Zirconia', 'E-max', 'Metal', 'Acrylic', 'Composite', 'Flexible (Valplast)', 'Other'];
const today = () => dayjs().format('YYYY-MM-DD');

/** Lab orders for one patient (patientId given) or for the whole clinic. */
const LabOrders: React.FC<{ patientId?: number }> = ({ patientId }) => {
  const [labs, setLabs] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [status, setStatus] = useState<string>(patientId ? 'all' : 'open');
  const table = useRef<CrudTableHandle>(null);

  useEffect(() => {
    labApi.listLabs().then(setLabs).catch(() => setLabs([]));
    if (!patientId) patientsApi.getAll().then(setPatients).catch(() => setPatients([]));
  }, [patientId]);

  const load = useCallback(() => labApi.listOrders({
    patientId, openOnly: status === 'open', status: status === 'open' ? undefined : status,
  }), [patientId, status]);

  const fields = useMemo<FieldDef[]>(() => [
    ...(patientId ? [] : [{
      name: 'patient_id', label: 'Patient', type: 'select' as const, required: true, span: 12,
      options: patients.map(p => ({ value: p.id, label: `${p.first_name} ${p.last_name} (${p.phone_primary})` })),
    }]),
    { name: 'lab_id', label: 'Dental lab', type: 'select', span: 12, options: labs.map(l => ({ value: l.id, label: l.name })), placeholder: labs.length ? undefined : 'Add labs under Libraries' },
    { name: 'work_type', label: 'Work type', type: 'select', required: true, span: 12, options: WORK_TYPES.map(w => ({ value: w, label: w })) },
    { name: 'material', label: 'Material', type: 'select', span: 12, options: MATERIALS.map(w => ({ value: w, label: w })) },
    { name: 'teeth', label: 'Teeth (FDI)', span: 8, placeholder: '36 or 11-13' },
    { name: 'shade', label: 'Shade', span: 8, placeholder: 'A2' },
    { name: 'cost_paise', label: 'Lab charge', type: 'money', span: 8 },
    { name: 'order_date', label: 'Order date', type: 'date', required: true, span: 8 },
    { name: 'trial_date', label: 'Trial date', type: 'date', span: 8 },
    { name: 'due_date', label: 'Due date', type: 'date', span: 8 },
    { name: 'status', label: 'Status', type: 'select', span: 8, options: statusOptions, props: { allowClear: false } },
    { name: 'received_date', label: 'Received on', type: 'date', span: 8 },
    { name: 'instructions', label: 'Instructions to lab (pontic design, margins, implant details…)', type: 'textarea', rows: 3 },
  ], [patientId, patients, labs]);

  const setOrderStatus = async (id: number, value: string) => {
    try {
      await labApi.setOrderStatus(id, value);
      table.current?.reload();
    } catch (err) {
      message.error(errorText(err));
    }
  };

  const overdue = (r: any) => ['ordered', 'sent', 'trial'].includes(r.status) && r.due_date && r.due_date < today();

  return (
    <CrudTable
      ref={table}
      itemName="lab order"
      load={load}
      save={(values) => labApi.saveOrder(patientId ? { ...values, patient_id: patientId } : values)}
      remove={(row) => labApi.deleteOrder(row.id)}
      fields={fields}
      formWidth={760}
      defaults={{ order_date: today(), status: 'ordered' }}
      emptyText="No lab orders"
      toolbar={
        <Select style={{ width: 190 }} value={status} onChange={setStatus}
          options={[{ value: 'open', label: 'Pending with lab' }, { value: 'all', label: 'All orders' }, ...statusOptions]} />
      }
      columns={[
        { title: 'Ordered', dataIndex: 'order_date', width: 110, render: fmtDate },
        ...(patientId ? [] : [{ title: 'Patient', dataIndex: 'patient_name' }]),
        { title: 'Work', render: (_: any, r: any) => [r.work_type, r.material].filter(Boolean).join(' · ') },
        { title: 'Teeth', dataIndex: 'teeth', width: 80 },
        { title: 'Shade', dataIndex: 'shade', width: 70 },
        { title: 'Lab', dataIndex: 'lab_name' },
        { title: 'Due', dataIndex: 'due_date', width: 120, render: (v: string, r: any) => v ? (overdue(r) ? <Tag color="red">{fmtDate(v)} overdue</Tag> : fmtDate(v)) : '' },
        {
          title: 'Status', dataIndex: 'status', width: 170,
          render: (s: string, r: any) => (
            <Select size="small" value={s} style={{ width: 160 }} onChange={(v) => setOrderStatus(r.id, v)}
              options={statusOptions.map(o => ({ ...o, label: <Tag color={LAB_STATUS[o.value].color}>{o.label}</Tag> }))} />
          ),
        },
        { title: 'Charge', dataIndex: 'cost_paise', width: 100, align: 'right' as const, render: (v: number) => (v ? formatINR(v) : '') },
      ]}
      rowActions={(r, reload) => r.expense_transaction_id
        ? <Tooltip title="Lab charge already booked as an expense"><Tag color="green" style={{ margin: 0 }}>Expensed</Tag></Tooltip>
        : r.cost_paise > 0 && r.status !== 'cancelled' && (
          <Popconfirm title={`Record ${formatINR(r.cost_paise)} as a Lab Charges expense (paid today, cash)?`} okText="Record expense"
            onConfirm={() => labApi.recordExpense(r.id).then(() => { message.success('Expense recorded'); reload(); }).catch((e: any) => message.error(errorText(e)))}>
            <Tooltip title="Record lab charge as expense"><Button size="small" icon={<DollarOutlined />} /></Tooltip>
          </Popconfirm>
        )}
    />
  );
};

export default LabOrders;
