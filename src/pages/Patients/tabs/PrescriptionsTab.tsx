import React, { useCallback, useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, DatePicker, Select, Popconfirm, Tooltip, Alert, message, Row, Col } from 'antd';
import { PlusOutlined, PrinterOutlined, EditOutlined, DeleteOutlined, CopyOutlined, SaveOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { prescriptionsApi, rxTemplatesApi, errorText } from '../../../api/clinic.api';
import RxItemsEditor, { RxItem } from '../../../components/Crud/RxItemsEditor';
import PrintPreview, { fmtDate } from '../../../components/Print/PrintPreview';
import { PatientSummary } from '../../../types/patient.types';

export const patientAge = (dob?: string | null) =>
  dob ? `${dayjs().diff(dayjs(dob), 'year')} yrs` : '';

const PrescriptionsTab: React.FC<{ patient: PatientSummary }> = ({ patient }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [items, setItems] = useState<RxItem[]>([]);
  const [printing, setPrinting] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const reload = useCallback(async () => {
    try {
      setRows(await prescriptionsApi.listByPatient(patient.id));
    } catch (err) {
      message.error(errorText(err, 'Could not load prescriptions'));
    }
  }, [patient.id]);

  useEffect(() => { reload(); }, [reload]);

  const openForm = (rx: any | null, copy = false) => {
    rxTemplatesApi.list().then(setTemplates).catch(() => setTemplates([]));
    setEditing(copy ? null : rx);
    form.resetFields();
    form.setFieldsValue({
      prescription_date: rx && !copy ? dayjs(rx.prescription_date) : dayjs(),
      diagnosis: rx?.diagnosis, advice: rx?.advice,
      follow_up_date: rx?.follow_up_date && !copy ? dayjs(rx.follow_up_date) : null,
    });
    setItems(rx ? rx.items.map(({ medicine_name, strength, frequency, duration, instructions }: any) =>
      ({ medicine_name, strength, frequency, duration, instructions })) : [{ medicine_name: '' }]);
    setOpen(true);
  };

  const applyTemplate = (id: number) => {
    const t = templates.find(x => x.id === id);
    if (!t) return;
    setItems([...items.filter(i => i.medicine_name.trim()), ...t.items]);
    if (t.diagnosis && !form.getFieldValue('diagnosis')) form.setFieldValue('diagnosis', t.diagnosis);
    if (t.advice && !form.getFieldValue('advice')) form.setFieldValue('advice', t.advice);
  };

  const saveAsTemplate = () => {
    let name = '';
    Modal.confirm({
      title: 'Save as prescription template',
      content: <Input placeholder="Template name, e.g. Post extraction" onChange={e => { name = e.target.value; }} />,
      okText: 'Save template',
      onOk: async () => {
        try {
          await rxTemplatesApi.save({ name, diagnosis: form.getFieldValue('diagnosis'), advice: form.getFieldValue('advice'), items });
          message.success('Template saved');
          setTemplates(await rxTemplatesApi.list());
        } catch (err) {
          message.error(errorText(err, 'Could not save template'));
          throw err;
        }
      },
    });
  };

  const save = async () => {
    let values: any;
    try { values = await form.validateFields(); } catch { return; }
    setSaving(true);
    try {
      await prescriptionsApi.save({
        id: editing?.id,
        patient_id: patient.id,
        prescription_date: values.prescription_date.format('YYYY-MM-DD'),
        diagnosis: values.diagnosis || null,
        advice: values.advice || null,
        follow_up_date: values.follow_up_date ? values.follow_up_date.format('YYYY-MM-DD') : null,
        items,
      });
      message.success('Prescription saved');
      setOpen(false);
      reload();
    } catch (err) {
      message.error(errorText(err, 'Could not save prescription'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ textAlign: 'right', marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm(null)}>New prescription</Button>
      </div>
      <Table size="small" rowKey="id" dataSource={rows} pagination={rows.length > 15 ? { pageSize: 15 } : false}
        locale={{ emptyText: 'No prescriptions yet' }}
        columns={[
          { title: 'Date', dataIndex: 'prescription_date', width: 120, render: fmtDate },
          { title: 'Diagnosis', dataIndex: 'diagnosis', ellipsis: true },
          { title: 'Medicines', render: (_: any, r: any) => r.items.map((i: any) => i.medicine_name).join(', '), ellipsis: true },
          { title: 'Follow-up', dataIndex: 'follow_up_date', width: 120, render: fmtDate },
          {
            title: '', width: 1, align: 'right' as const,
            render: (_: any, r: any) => (
              <Space size={4} style={{ whiteSpace: 'nowrap' }}>
                <Tooltip title="Print"><Button size="small" icon={<PrinterOutlined />} onClick={() => setPrinting(r)} /></Tooltip>
                <Tooltip title="Repeat (copy to a new prescription)"><Button size="small" icon={<CopyOutlined />} onClick={() => openForm(r, true)} /></Tooltip>
                <Tooltip title="Edit"><Button size="small" icon={<EditOutlined />} onClick={() => openForm(r)} /></Tooltip>
                <Popconfirm title="Delete this prescription?" okText="Delete" okButtonProps={{ danger: true }}
                  onConfirm={() => prescriptionsApi.delete(r.id).then(reload).catch((e: any) => message.error(errorText(e)))}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]} />

      <Modal title={editing ? 'Edit prescription' : 'New prescription'} open={open} width={920} destroyOnHidden maskClosable={false}
        onCancel={() => setOpen(false)} onOk={save} okText="Save" confirmLoading={saving}>
        {patient.allergies && <Alert type="error" showIcon style={{ marginBottom: 12 }} message={`Allergies: ${patient.allergies}`} />}
        {patient.current_medications && <Alert type="info" showIcon style={{ marginBottom: 12 }} message={`Current medication: ${patient.current_medications}`} />}
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={6}><Form.Item name="prescription_date" label="Date" rules={[{ required: true }]}><DatePicker format="DD-MM-YYYY" style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="diagnosis" label="Diagnosis"><Input /></Form.Item></Col>
            <Col span={6}><Form.Item name="follow_up_date" label="Follow-up on"><DatePicker format="DD-MM-YYYY" style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Space style={{ marginBottom: 8 }} wrap>
            <Select style={{ width: 260 }} placeholder="Add medicines from a template" value={null} onChange={applyTemplate}
              options={templates.map(t => ({ value: t.id, label: t.name }))} notFoundContent="No templates saved yet" />
            <Button icon={<SaveOutlined />} onClick={saveAsTemplate} disabled={!items.some(i => i.medicine_name.trim())}>Save as template</Button>
          </Space>
          <RxItemsEditor value={items} onChange={setItems} />
          <Form.Item name="advice" label="Advice" style={{ marginTop: 12 }}><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <PrintPreview open={!!printing} title="Prescription" onClose={() => setPrinting(null)}
        meta={printing ? [
          ['Patient', `${patient.first_name} ${patient.last_name}`],
          ['Date', fmtDate(printing.prescription_date)],
          ['Age / Gender', [patientAge(patient.date_of_birth), patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : patient.gender ? 'Other' : ''].filter(Boolean).join(' / ')],
          ['Phone', patient.phone_primary],
          ['Allergies', patient.allergies],
          ['Diagnosis', printing.diagnosis],
        ] : []}
        footer={printing?.follow_up_date ? <div><strong>Next visit:</strong> {fmtDate(printing.follow_up_date)}</div> : undefined}>
        {printing && (
          <>
            <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'serif' }}>℞</div>
            <table className="print-table">
              <thead><tr><th style={{ width: 28 }}>#</th><th>Medicine</th><th>Frequency</th><th>Duration</th><th>Instructions</th></tr></thead>
              <tbody>
                {printing.items.map((i: any, idx: number) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td><strong>{i.medicine_name}</strong>{i.strength ? ` ${i.strength}` : ''}</td>
                    <td>{i.frequency}</td><td>{i.duration}</td><td>{i.instructions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {printing.advice && (<><div className="print-section-title">Advice</div><div style={{ whiteSpace: 'pre-wrap' }}>{printing.advice}</div></>)}
          </>
        )}
      </PrintPreview>
    </div>
  );
};

export default PrescriptionsTab;
