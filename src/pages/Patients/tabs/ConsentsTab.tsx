import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, Tag, Popconfirm, Tooltip, message } from 'antd';
import { PlusOutlined, PrinterOutlined, DeleteOutlined, EditOutlined, HighlightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { consentsApi, errorText } from '../../../api/clinic.api';
import PrintPreview, { fmtDate, useClinicInfo } from '../../../components/Print/PrintPreview';
import SignaturePad, { SignaturePadHandle } from '../../../components/Crud/SignaturePad';
import { PatientSummary } from '../../../types/patient.types';

const ConsentsTab: React.FC<{ patient: PatientSummary }> = ({ patient }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [signing, setSigning] = useState<any | null>(null);
  const [signedBy, setSignedBy] = useState('');
  const [printing, setPrinting] = useState<any | null>(null);
  const [form] = Form.useForm();
  const pad = useRef<SignaturePadHandle>(null);
  const clinic = useClinicInfo(open);
  const patientName = `${patient.first_name} ${patient.last_name}`.trim();

  const reload = useCallback(async () => {
    try {
      setRows(await consentsApi.listByPatient(patient.id));
    } catch (err) {
      message.error(errorText(err, 'Could not load consent forms'));
    }
  }, [patient.id]);

  useEffect(() => { reload(); }, [reload]);

  const fill = (body: string, procedure: string) => body
    .replace(/\{\{\s*patient_name\s*\}\}/g, patientName)
    .replace(/\{\{\s*date\s*\}\}/g, dayjs().format('DD-MM-YYYY'))
    .replace(/\{\{\s*doctor_name\s*\}\}/g, clinic?.doctor?.name || 'the doctor')
    .replace(/\{\{\s*clinic_name\s*\}\}/g, clinic?.settings?.clinic_name || 'the clinic')
    .replace(/\{\{\s*procedure\s*\}\}/g, procedure || '________________');

  const openNew = () => {
    consentsApi.listTemplates().then(setTemplates).catch(() => setTemplates([]));
    form.resetFields();
    setOpen(true);
  };

  const prepareText = () => {
    const t = templates.find(x => x.id === form.getFieldValue('template_id'));
    if (!t) return;
    form.setFieldsValue({ title: `Consent for ${t.name}`, body: fill(t.body, form.getFieldValue('procedure_name') || '') });
  };

  const create = async () => {
    let values: any;
    try { values = await form.validateFields(); } catch { return; }
    try {
      await consentsApi.create({ ...values, patient_id: patient.id });
      message.success('Consent form created. Print it for a pen signature, or sign on screen.');
      setOpen(false);
      reload();
    } catch (err) {
      message.error(errorText(err, 'Could not create consent form'));
    }
  };

  const sign = async () => {
    if (pad.current?.isEmpty()) { message.warning('Please sign in the box first'); return; }
    try {
      await consentsApi.sign(signing.id, signedBy, pad.current!.toDataURL());
      message.success('Consent signed');
      setSigning(null);
      reload();
    } catch (err) {
      message.error(errorText(err, 'Could not save signature'));
    }
  };

  return (
    <div>
      <div style={{ textAlign: 'right', marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>New consent form</Button>
      </div>
      <Table size="small" rowKey="id" dataSource={rows} pagination={false} locale={{ emptyText: 'No consent forms yet' }}
        columns={[
          { title: 'Consent', dataIndex: 'title' },
          { title: 'Procedure', dataIndex: 'procedure_name' },
          { title: 'Created', dataIndex: 'created_at', width: 120, render: (v: string) => fmtDate(v?.replace(' ', 'T') + 'Z') },
          {
            title: 'Status', width: 240,
            render: (_: any, r: any) => r.signed_at
              ? <Tag color="green">Signed by {r.signed_by} on {fmtDate(r.signed_at)}</Tag>
              : <Tag color="orange">Awaiting signature</Tag>,
          },
          {
            title: '', width: 1, align: 'right' as const,
            render: (_: any, r: any) => (
              <Space size={4} style={{ whiteSpace: 'nowrap' }}>
                {!r.signed_at && (
                  <Tooltip title="Sign on screen">
                    <Button size="small" icon={<HighlightOutlined />} onClick={() => { setSignedBy(patientName); setSigning(r); }} />
                  </Tooltip>
                )}
                <Tooltip title="Print"><Button size="small" icon={<PrinterOutlined />} onClick={() => setPrinting(r)} /></Tooltip>
                <Popconfirm title={r.signed_at ? 'Delete this SIGNED consent record?' : 'Delete this consent form?'}
                  description={r.signed_at ? 'A signed consent is a medico-legal record. This cannot be undone.' : undefined}
                  okText="Delete" okButtonProps={{ danger: true }}
                  onConfirm={() => consentsApi.delete(r.id).then(reload).catch((e: any) => message.error(errorText(e)))}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]} />

      <Modal title="New consent form" open={open} width={760} destroyOnHidden maskClosable={false} onCancel={() => setOpen(false)} onOk={create} okText="Create">
        <Form form={form} layout="vertical">
          <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
            <Form.Item name="template_id" noStyle>
              <Select style={{ width: '45%' }} placeholder="Choose a template" options={templates.map(t => ({ value: t.id, label: t.name }))} />
            </Form.Item>
            <Form.Item name="procedure_name" noStyle>
              <Input style={{ width: '40%' }} placeholder="Procedure / tooth, e.g. Extraction of 38" />
            </Form.Item>
            <Button icon={<EditOutlined />} onClick={prepareText}>Fill text</Button>
          </Space.Compact>
          <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Title is required' }]}><Input /></Form.Item>
          <Form.Item name="body" label="Consent text (edit as needed before saving)" rules={[{ required: true, message: 'Consent text is required' }]}>
            <Input.TextArea rows={12} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={`Sign: ${signing?.title || ''}`} open={!!signing} width={560} destroyOnHidden maskClosable={false}
        onCancel={() => setSigning(null)} onOk={sign} okText="Save signature"
        footer={(_, { OkBtn, CancelBtn }) => (<><Button onClick={() => pad.current?.clear()}>Clear</Button><CancelBtn /><OkBtn /></>)}>
        <div style={{ maxHeight: 180, overflowY: 'auto', whiteSpace: 'pre-wrap', padding: 8, marginBottom: 12, border: '1px solid var(--text-secondary)', borderRadius: 6, fontSize: 12 }}>
          {signing?.body}
        </div>
        <div style={{ marginBottom: 4 }}>Signed by (patient or guardian)</div>
        <Input value={signedBy} onChange={e => setSignedBy(e.target.value)} style={{ marginBottom: 12 }} />
        <div style={{ marginBottom: 4 }}>Signature</div>
        <SignaturePad ref={pad} />
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Once saved, a signed consent cannot be edited or re-signed.</div>
      </Modal>

      <PrintPreview open={!!printing} title={printing?.title || 'Consent'} onClose={() => setPrinting(null)}
        meta={printing ? [['Patient', patientName], ['Phone', patient.phone_primary], ['Procedure', printing.procedure_name]] : []}
        footer={printing && (
          <div style={{ minWidth: 220 }}>
            {printing.signature_data
              ? <img src={printing.signature_data} alt="Signature" style={{ height: 60, display: 'block' }} />
              : <div style={{ height: 60 }} />}
            <div style={{ borderTop: '1px solid #000', paddingTop: 4 }}>
              {printing.signed_by || 'Patient / guardian signature'}
              {printing.signed_at && <div style={{ fontSize: 11 }}>Signed on {new Date(printing.signed_at).toLocaleString('en-IN')}</div>}
            </div>
          </div>
        )}>
        {printing && <div style={{ whiteSpace: 'pre-wrap', textAlign: 'justify' }}>{printing.body}</div>}
      </PrintPreview>
    </div>
  );
};

export default ConsentsTab;
