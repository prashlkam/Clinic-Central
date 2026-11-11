import React, { useCallback } from 'react';
import { Card, Tabs, Tag } from 'antd';
import CrudTable from '../../components/Crud/CrudTable';
import RxItemsEditor from '../../components/Crud/RxItemsEditor';
import { medicinesApi, rxTemplatesApi, consentsApi, labApi, membershipsApi } from '../../api/clinic.api';
import { formatINR } from '../../styles/theme';

const FORMS = ['Tablet', 'Capsule', 'Dispersible Tablet', 'Syrup', 'Suspension', 'Mouthwash', 'Gargle', 'Gel', 'Paste', 'Ointment', 'Toothpaste', 'Injection', 'Drops', 'Sachet'];

/** Master lists the doctor sets up once and reuses everywhere. */
const LibrariesPage: React.FC = () => {
  const loadMedicines = useCallback(() => medicinesApi.list(), []);
  const loadRxTemplates = useCallback(() => rxTemplatesApi.list(), []);
  const loadConsentTemplates = useCallback(() => consentsApi.listTemplates(), []);
  const loadLabs = useCallback(() => labApi.listLabs(), []);
  const loadPlans = useCallback(() => membershipsApi.list(), []);

  return (
    <div>
      <div className="page-header"><h2>Libraries</h2></div>
      <Card>
        <Tabs destroyOnHidden items={[
          {
            key: 'medicines', label: 'Drug library',
            children: (
              <CrudTable itemName="medicine" load={loadMedicines} save={(v) => medicinesApi.save(v)} remove={(r) => medicinesApi.delete(r.id)}
                fields={[
                  { name: 'name', label: 'Medicine name', required: true, span: 12 },
                  { name: 'form', label: 'Form', type: 'select', span: 6, options: FORMS.map(f => ({ value: f, label: f })) },
                  { name: 'strength', label: 'Strength', span: 6, placeholder: '500 mg' },
                  { name: 'frequency', label: 'Usual frequency', span: 8, placeholder: '1-0-1' },
                  { name: 'duration', label: 'Usual duration', span: 8, placeholder: '5 days' },
                  { name: 'instructions', label: 'Usual instructions', span: 8, placeholder: 'After food' },
                ]}
                columns={[
                  { title: 'Medicine', dataIndex: 'name' }, { title: 'Form', dataIndex: 'form', width: 150 },
                  { title: 'Strength', dataIndex: 'strength', width: 150 }, { title: 'Frequency', dataIndex: 'frequency', width: 100 },
                  { title: 'Duration', dataIndex: 'duration', width: 100 }, { title: 'Instructions', dataIndex: 'instructions', ellipsis: true },
                ]} />
            ),
          },
          {
            key: 'rx', label: 'Prescription templates',
            children: (
              <CrudTable itemName="template" load={loadRxTemplates} save={(v) => rxTemplatesApi.save(v as any)} remove={(r) => rxTemplatesApi.delete(r.id)}
                formWidth={900} defaults={{ items: [{ medicine_name: '' }] }}
                emptyText="No templates yet. Create one here, or use “Save as template” while writing a prescription."
                fields={[
                  { name: 'name', label: 'Template name', required: true, span: 12, placeholder: 'e.g. Post extraction' },
                  { name: 'diagnosis', label: 'Diagnosis', span: 12 },
                  { name: 'items', label: 'Medicines', type: 'custom', render: () => <RxItemsEditor /> },
                  { name: 'advice', label: 'Advice', type: 'textarea' },
                ]}
                columns={[
                  { title: 'Template', dataIndex: 'name', width: 220 },
                  { title: 'Medicines', render: (_: any, r: any) => r.items.map((i: any) => i.medicine_name).join(', '), ellipsis: true },
                ]} />
            ),
          },
          {
            key: 'consent', label: 'Consent templates',
            children: (
              <CrudTable itemName="consent template" load={loadConsentTemplates} save={(v) => consentsApi.saveTemplate(v)} remove={(r) => consentsApi.deleteTemplate(r.id)}
                formWidth={760}
                fields={[
                  { name: 'name', label: 'Template name', required: true },
                  { name: 'body', label: 'Consent text. Placeholders: {{patient_name}} {{procedure}} {{doctor_name}} {{clinic_name}} {{date}}', type: 'textarea', rows: 14, required: true },
                ]}
                columns={[
                  { title: 'Template', dataIndex: 'name', width: 260 },
                  { title: 'Text', dataIndex: 'body', ellipsis: true },
                ]} />
            ),
          },
          {
            key: 'labs', label: 'Dental labs',
            children: (
              <CrudTable itemName="lab" load={loadLabs} save={(v) => labApi.saveLab(v)} remove={(r) => labApi.deleteLab(r.id)}
                fields={[
                  { name: 'name', label: 'Lab name', required: true, span: 12 },
                  { name: 'contact', label: 'Contact person', span: 12 },
                  { name: 'phone', label: 'Phone', span: 12 },
                  { name: 'address', label: 'Address', type: 'textarea' },
                ]}
                columns={[
                  { title: 'Lab', dataIndex: 'name' }, { title: 'Contact', dataIndex: 'contact' },
                  { title: 'Phone', dataIndex: 'phone', width: 150 }, { title: 'Address', dataIndex: 'address', ellipsis: true },
                ]} />
            ),
          },
          {
            key: 'memberships', label: 'Membership plans',
            children: (
              <CrudTable itemName="membership plan" load={loadPlans} save={(v) => membershipsApi.save(v)} remove={(r) => membershipsApi.delete(r.id)}
                defaults={{ validity_months: 12, discount_percent: 10 }}
                emptyText="No membership plans. Create one, then assign it to patients from the patient form."
                fields={[
                  { name: 'name', label: 'Plan name', required: true, span: 12, placeholder: 'e.g. Family Gold' },
                  { name: 'discount_percent', label: 'Discount on bills (%)', type: 'number', required: true, span: 12, props: { min: 0, max: 100 } },
                  { name: 'price_paise', label: 'Plan price', type: 'money', span: 12 },
                  { name: 'validity_months', label: 'Validity (months)', type: 'number', span: 12, props: { min: 1, max: 120 } },
                  { name: 'description', label: 'Benefits / description', type: 'textarea' },
                ]}
                columns={[
                  { title: 'Plan', dataIndex: 'name' },
                  { title: 'Discount', dataIndex: 'discount_percent', width: 110, render: (v: number) => <Tag color="green">{v}%</Tag> },
                  { title: 'Price', dataIndex: 'price_paise', width: 120, align: 'right' as const, render: (v: number) => formatINR(v || 0) },
                  { title: 'Validity', dataIndex: 'validity_months', width: 110, render: (v: number) => `${v} months` },
                  { title: 'Active members', dataIndex: 'member_count', width: 130 },
                  { title: 'Description', dataIndex: 'description', ellipsis: true },
                ]} />
            ),
          },
        ]} />
      </Card>
    </div>
  );
};

export default LibrariesPage;
