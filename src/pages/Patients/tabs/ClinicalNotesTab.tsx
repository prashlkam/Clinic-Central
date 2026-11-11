import React, { useCallback } from 'react';
import { Descriptions, Tag } from 'antd';
import dayjs from 'dayjs';
import CrudTable from '../../../components/Crud/CrudTable';
import { FieldDef } from '../../../components/Crud/FormModal';
import { notesApi } from '../../../api/clinic.api';
import { fmtDate } from '../../../components/Print/PrintPreview';

const fields: FieldDef[] = [
  { name: 'visit_date', label: 'Visit date', type: 'date', required: true, span: 8 },
  { name: 'follow_up_date', label: 'Follow-up / recall on', type: 'date', span: 8 },
  { name: 'bp', label: 'BP (mmHg)', span: 8, placeholder: '120/80' },
  { name: 'pulse', label: 'Pulse (bpm)', span: 8 },
  { name: 'temperature', label: 'Temperature (°F)', span: 8 },
  { name: 'weight', label: 'Weight (kg)', span: 8 },
  { name: 'chief_complaint', label: 'Chief complaint', type: 'textarea' },
  { name: 'findings', label: 'Intraoral findings / examination', type: 'textarea', rows: 3 },
  { name: 'radiograph_notes', label: 'Radiograph observations', type: 'textarea' },
  { name: 'diagnosis', label: 'Diagnosis', type: 'textarea' },
  { name: 'treatment_done', label: 'Treatment done today', type: 'textarea' },
  { name: 'advice', label: 'Advice / instructions', type: 'textarea' },
];

const ClinicalNotesTab: React.FC<{ patientId: number }> = ({ patientId }) => {
  const load = useCallback(() => notesApi.listByPatient(patientId), [patientId]);
  return (
    <CrudTable
      itemName="clinical note"
      load={load}
      save={(values) => notesApi.save({ ...values, patient_id: patientId })}
      remove={(row) => notesApi.delete(row.id)}
      fields={fields}
      formWidth={760}
      defaults={{ visit_date: dayjs().format('YYYY-MM-DD') }}
      emptyText="No clinical notes yet. Add one for each visit."
      columns={[
        { title: 'Visit', dataIndex: 'visit_date', width: 120, render: fmtDate },
        { title: 'Chief complaint', dataIndex: 'chief_complaint', ellipsis: true },
        { title: 'Diagnosis', dataIndex: 'diagnosis', ellipsis: true },
        { title: 'Treatment done', dataIndex: 'treatment_done', ellipsis: true },
        { title: 'Follow-up', dataIndex: 'follow_up_date', width: 120, render: (v: string) => v ? <Tag color="blue">{fmtDate(v)}</Tag> : '' },
      ]}
      expandable={{
        expandedRowRender: (n: any) => (
          <Descriptions size="small" column={2} bordered styles={{ content: { whiteSpace: 'pre-wrap' } }}>
            <Descriptions.Item label="Vitals" span={2}>
              {[n.bp && `BP ${n.bp}`, n.pulse && `Pulse ${n.pulse}`, n.temperature && `Temp ${n.temperature}°F`, n.weight && `Weight ${n.weight} kg`].filter(Boolean).join('  ·  ') || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Chief complaint" span={2}>{n.chief_complaint || '-'}</Descriptions.Item>
            <Descriptions.Item label="Findings" span={2}>{n.findings || '-'}</Descriptions.Item>
            <Descriptions.Item label="Radiographs" span={2}>{n.radiograph_notes || '-'}</Descriptions.Item>
            <Descriptions.Item label="Diagnosis" span={2}>{n.diagnosis || '-'}</Descriptions.Item>
            <Descriptions.Item label="Treatment done" span={2}>{n.treatment_done || '-'}</Descriptions.Item>
            <Descriptions.Item label="Advice" span={2}>{n.advice || '-'}</Descriptions.Item>
          </Descriptions>
        ),
      }}
    />
  );
};

export default ClinicalNotesTab;
