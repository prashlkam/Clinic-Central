import React, { useCallback, useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, InputNumber, Select, Tag, Popconfirm, Tooltip, Progress, Checkbox, message, Row, Col } from 'antd';
import { PlusOutlined, PrinterOutlined, EditOutlined, DeleteOutlined, FileTextOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { plansApi, errorText } from '../../../api/clinic.api';
import { treatmentsApi } from '../../../api/treatments.api';
import PrintPreview, { fmtDate } from '../../../components/Print/PrintPreview';
import { formatINR } from '../../../styles/theme';
import { PatientSummary } from '../../../types/patient.types';

const PLAN_STATUS: Record<string, string> = { proposed: 'blue', accepted: 'cyan', in_progress: 'orange', completed: 'green', cancelled: 'red' };
const ITEM_STATUS: Record<string, string> = { planned: 'default', in_progress: 'orange', completed: 'green', cancelled: 'red' };
const label = (s: string) => s.replace('_', ' ');
const itemStatusOptions = Object.keys(ITEM_STATUS).map(s => ({ value: s, label: label(s) }));

interface Item {
  id?: number; stage: number; treatment_id?: number | null; description: string; teeth?: string | null;
  quantity: number; unit_price_paise: number; status: string; invoice_id?: number | null; invoice_number?: string;
  completed_date?: string | null; total_paise?: number;
}

const blankItem = (stage = 1): Item => ({ stage, description: '', teeth: '', quantity: 1, unit_price_paise: 0, status: 'planned' });

const TreatmentPlansTab: React.FC<{ patient: PatientSummary; onChanged?: () => void }> = ({ patient, onChanged }) => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<any[]>([]);
  const [details, setDetails] = useState<Record<number, any>>({});
  const [treatments, setTreatments] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState<any | null>(null);
  const [invoicing, setInvoicing] = useState<any | null>(null);
  const [invoiceIds, setInvoiceIds] = useState<number[]>([]);
  const [applyDiscount, setApplyDiscount] = useState(false);
  const [form] = Form.useForm();

  const reload = useCallback(async () => {
    try {
      setPlans(await plansApi.list({ patientId: patient.id }));
      setDetails({});
    } catch (err) {
      message.error(errorText(err, 'Could not load treatment plans'));
    }
  }, [patient.id]);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { treatmentsApi.getAllFlat().then(setTreatments).catch(() => setTreatments([])); }, []);

  const loadDetail = async (id: number) => {
    const plan = await plansApi.getById(id);
    setDetails(d => ({ ...d, [id]: plan }));
    return plan;
  };

  const openForm = async (plan: any | null) => {
    form.resetFields();
    if (plan) {
      const full = await loadDetail(plan.id);
      setEditing(full);
      form.setFieldsValue({ title: full.title, notes: full.notes, status: full.status, discount: (full.discount_paise || 0) / 100 });
      setItems(full.items);
    } else {
      setEditing(null);
      form.setFieldsValue({ status: 'proposed', discount: 0 });
      setItems([blankItem()]);
    }
    setOpen(true);
  };

  const updateItem = (index: number, patch: Partial<Item>) => setItems(list => list.map((it, i) => (i === index ? { ...it, ...patch } : it)));

  const subtotal = items.filter(i => i.status !== 'cancelled').reduce((s, i) => s + i.quantity * i.unit_price_paise, 0);

  const save = async () => {
    let values: any;
    try { values = await form.validateFields(); } catch { return; }
    setSaving(true);
    try {
      await plansApi.save({
        id: editing?.id, patient_id: patient.id, title: values.title, notes: values.notes || null, status: values.status,
        discount_paise: Math.round((values.discount || 0) * 100),
        items: items.filter(i => i.description.trim()),
      });
      message.success('Treatment plan saved');
      setOpen(false);
      reload();
    } catch (err) {
      message.error(errorText(err, 'Could not save treatment plan'));
    } finally {
      setSaving(false);
    }
  };

  const setItemStatus = async (planId: number, itemId: number, status: string) => {
    try {
      await plansApi.setItemStatus(itemId, status);
      setPlans(await plansApi.list({ patientId: patient.id }));
      loadDetail(planId);
    } catch (err) {
      message.error(errorText(err));
    }
  };

  const openInvoice = async (plan: any) => {
    const full = await loadDetail(plan.id);
    const billable = full.items.filter((i: Item) => !i.invoice_id && i.status !== 'cancelled');
    if (billable.length === 0) { message.info('Every procedure in this plan has already been invoiced'); return; }
    const done = billable.filter((i: Item) => i.status === 'completed');
    setInvoiceIds((done.length ? done : billable).map((i: Item) => i.id!));
    setApplyDiscount(false);
    setInvoicing(full);
  };

  const createInvoice = async () => {
    try {
      const inv = await plansApi.createInvoice(invoicing.id, invoiceIds, applyDiscount);
      message.success(`Invoice ${inv.invoice_number} created`);
      setInvoicing(null);
      reload();
      onChanged?.();
      navigate(`/invoices/${inv.id}`);
    } catch (err) {
      message.error(errorText(err, 'Could not create invoice'));
    }
  };

  const stages = (list: Item[]) => [...new Set(list.map(i => i.stage))].sort((a, b) => a - b);

  return (
    <div>
      <div style={{ textAlign: 'right', marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm(null)}>New treatment plan</Button>
      </div>

      <Table size="small" rowKey="id" dataSource={plans} pagination={false} locale={{ emptyText: 'No treatment plans yet' }}
        expandable={{
          onExpand: (expanded, plan) => { if (expanded && !details[plan.id]) loadDetail(plan.id); },
          expandedRowRender: (plan) => (
            <Table size="small" rowKey="id" pagination={false} loading={!details[plan.id]} dataSource={details[plan.id]?.items || []}
              columns={[
                { title: 'Stage', dataIndex: 'stage', width: 60 },
                { title: 'Procedure', dataIndex: 'description' },
                { title: 'Teeth', dataIndex: 'teeth', width: 90 },
                { title: 'Qty', dataIndex: 'quantity', width: 50 },
                { title: 'Amount', dataIndex: 'total_paise', width: 110, align: 'right' as const, render: (v: number) => formatINR(v) },
                {
                  title: 'Status', dataIndex: 'status', width: 140,
                  render: (s: string, item: Item) => (
                    <Select size="small" value={s} style={{ width: 125 }} options={itemStatusOptions}
                      onChange={(val) => setItemStatus(plan.id, item.id!, val)} />
                  ),
                },
                { title: 'Done on', dataIndex: 'completed_date', width: 110, render: fmtDate },
                { title: 'Invoice', dataIndex: 'invoice_number', width: 130, render: (v: string, item: Item) => v ? <a onClick={() => navigate(`/invoices/${item.invoice_id}`)}>{v}</a> : <Tag>not billed</Tag> },
              ]} />
          ),
        }}
        columns={[
          { title: 'Plan', dataIndex: 'title' },
          { title: 'Created', dataIndex: 'created_at', width: 110, render: (v: string) => fmtDate(v?.replace(' ', 'T') + 'Z') },
          { title: 'Status', dataIndex: 'status', width: 110, render: (s: string) => <Tag color={PLAN_STATUS[s]}>{label(s)}</Tag> },
          {
            title: 'Progress', width: 150,
            render: (_: any, p: any) => <Progress size="small" percent={p.item_count ? Math.round((p.completed_count / p.item_count) * 100) : 0} format={() => `${p.completed_count}/${p.item_count}`} />,
          },
          { title: 'Estimate', width: 120, align: 'right' as const, render: (_: any, p: any) => formatINR(p.subtotal_paise - (p.discount_paise || 0)) },
          {
            title: '', width: 1, align: 'right' as const,
            render: (_: any, p: any) => (
              <Space size={4} style={{ whiteSpace: 'nowrap' }}>
                <Tooltip title="Print estimate"><Button size="small" icon={<PrinterOutlined />} onClick={async () => setPrinting(await loadDetail(p.id))} /></Tooltip>
                <Tooltip title="Create invoice"><Button size="small" icon={<FileTextOutlined />} onClick={() => openInvoice(p)} /></Tooltip>
                <Tooltip title="Edit"><Button size="small" icon={<EditOutlined />} onClick={() => openForm(p)} /></Tooltip>
                <Popconfirm title="Delete this treatment plan?" description="Invoices already raised from it are kept." okText="Delete" okButtonProps={{ danger: true }}
                  onConfirm={() => plansApi.delete(p.id).then(reload).catch((e: any) => message.error(errorText(e)))}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]} />

      {/* Plan editor */}
      <Modal title={editing ? 'Edit treatment plan' : 'New treatment plan'} open={open} width={1040} destroyOnHidden maskClosable={false}
        onCancel={() => setOpen(false)} onOk={save} okText="Save plan" confirmLoading={saving}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}><Form.Item name="title" label="Plan title" rules={[{ required: true, message: 'Give the plan a title' }]}><Input placeholder="e.g. Full mouth rehabilitation" /></Form.Item></Col>
            <Col span={6}><Form.Item name="status" label="Status"><Select options={Object.keys(PLAN_STATUS).map(s => ({ value: s, label: label(s) }))} /></Form.Item></Col>
            <Col span={6}><Form.Item name="discount" label="Plan discount (₹)"><InputNumber min={0} precision={2} style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Table size="small" pagination={false} dataSource={items} rowKey={(_, i) => String(i)}
            columns={[
              { title: 'Stage', width: 70, render: (_: any, __: any, i: number) => <InputNumber size="small" min={1} max={20} value={items[i].stage} onChange={v => updateItem(i, { stage: v || 1 })} style={{ width: '100%' }} /> },
              {
                title: 'Treatment', width: 230,
                render: (_: any, __: any, i: number) => (
                  <Select size="small" style={{ width: '100%' }} showSearch optionFilterProp="label" allowClear placeholder="Pick from list" value={items[i].treatment_id}
                    disabled={!!items[i].invoice_id}
                    options={treatments.map(t => ({ value: t.id, label: `${t.tree_name} > ${t.name}` }))}
                    onChange={(val) => {
                      const t = treatments.find(x => x.id === val);
                      updateItem(i, t ? { treatment_id: val, description: t.name, unit_price_paise: t.estimated_cost_paise } : { treatment_id: null });
                    }} />
                ),
              },
              { title: 'Procedure', render: (_: any, __: any, i: number) => <Input size="small" value={items[i].description} disabled={!!items[i].invoice_id} onChange={e => updateItem(i, { description: e.target.value })} /> },
              { title: 'Teeth', width: 90, render: (_: any, __: any, i: number) => <Input size="small" placeholder="36, 37" value={items[i].teeth || ''} disabled={!!items[i].invoice_id} onChange={e => updateItem(i, { teeth: e.target.value })} /> },
              { title: 'Qty', width: 65, render: (_: any, __: any, i: number) => <InputNumber size="small" min={1} value={items[i].quantity} disabled={!!items[i].invoice_id} onChange={v => updateItem(i, { quantity: v || 1 })} style={{ width: '100%' }} /> },
              { title: 'Rate (₹)', width: 110, render: (_: any, __: any, i: number) => <InputNumber size="small" min={0} precision={2} value={items[i].unit_price_paise / 100} disabled={!!items[i].invoice_id} onChange={v => updateItem(i, { unit_price_paise: Math.round((v || 0) * 100) })} style={{ width: '100%' }} /> },
              { title: 'Amount', width: 105, align: 'right' as const, render: (_: any, __: any, i: number) => formatINR(items[i].quantity * items[i].unit_price_paise) },
              { title: 'Status', width: 125, render: (_: any, __: any, i: number) => <Select size="small" style={{ width: '100%' }} value={items[i].status} options={itemStatusOptions} onChange={v => updateItem(i, { status: v })} /> },
              {
                title: '', width: 40,
                render: (_: any, __: any, i: number) => items[i].invoice_id
                  ? <Tooltip title={`Billed on ${items[i].invoice_number || 'an invoice'}`}><Tag color="green">₹</Tag></Tooltip>
                  : <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => setItems(list => list.filter((_x, idx) => idx !== i))} />,
              },
            ]} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <Button size="small" icon={<PlusOutlined />} onClick={() => setItems(list => [...list, blankItem(list.length ? list[list.length - 1].stage : 1)])}>Add procedure</Button>
            <strong>Total estimate: {formatINR(subtotal)}</strong>
          </div>
          <Form.Item name="notes" label="Notes" style={{ marginTop: 12 }}><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {/* Invoice from plan */}
      <Modal title={`Create invoice — ${invoicing?.title || ''}`} open={!!invoicing} onCancel={() => setInvoicing(null)} onOk={createInvoice}
        okText="Create invoice" okButtonProps={{ disabled: invoiceIds.length === 0 }} destroyOnHidden>
        <p>Select the procedures to bill now:</p>
        <Checkbox.Group style={{ display: 'flex', flexDirection: 'column', gap: 6 }} value={invoiceIds} onChange={(v) => setInvoiceIds(v as number[])}
          options={(invoicing?.items || []).filter((i: Item) => !i.invoice_id && i.status !== 'cancelled').map((i: Item) => ({
            value: i.id!, label: `Stage ${i.stage}: ${i.description}${i.teeth ? ` (${i.teeth})` : ''} — ${formatINR(i.total_paise || 0)} [${label(i.status)}]`,
          }))} />
        {(invoicing?.discount_paise || 0) > 0 && (
          <Checkbox style={{ marginTop: 12 }} checked={applyDiscount} onChange={e => setApplyDiscount(e.target.checked)}>
            Apply the plan discount of {formatINR(invoicing.discount_paise)} to this invoice
          </Checkbox>
        )}
      </Modal>

      {/* Printable estimate */}
      <PrintPreview open={!!printing} title="Treatment Plan & Estimate" onClose={() => setPrinting(null)}
        meta={printing ? [
          ['Patient', `${patient.first_name} ${patient.last_name}`], ['Date', fmtDate(new Date().toISOString())],
          ['Phone', patient.phone_primary], ['Plan', printing.title],
        ] : []}
        footer={<div style={{ fontSize: 11, maxWidth: 380 }}>This is an estimate. Final charges may vary with clinical findings during treatment.<br /><br />Patient signature: ____________________</div>}>
        {printing && (() => {
          const live: Item[] = printing.items.filter((i: Item) => i.status !== 'cancelled');
          const total = live.reduce((s, i) => s + (i.total_paise || 0), 0);
          return (
            <>
              {stages(live).map(stage => (
                <div key={stage}>
                  <div className="print-section-title">Stage {stage}</div>
                  <table className="print-table">
                    <thead><tr><th>Procedure</th><th style={{ width: 90 }}>Teeth</th><th style={{ width: 50 }}>Qty</th><th className="num" style={{ width: 100 }}>Rate</th><th className="num" style={{ width: 110 }}>Amount</th></tr></thead>
                    <tbody>
                      {live.filter(i => i.stage === stage).map(i => (
                        <tr key={i.id}><td>{i.description}</td><td>{i.teeth}</td><td>{i.quantity}</td><td className="num">{formatINR(i.unit_price_paise)}</td><td className="num">{formatINR(i.total_paise || 0)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
              <table className="print-table" style={{ width: '50%', marginLeft: 'auto', marginTop: 12 }}>
                <tbody>
                  <tr><td>Subtotal</td><td className="num">{formatINR(total)}</td></tr>
                  {printing.discount_paise > 0 && <tr><td>Discount</td><td className="num">-{formatINR(printing.discount_paise)}</td></tr>}
                  <tr><th>Estimated total</th><th className="num">{formatINR(total - (printing.discount_paise || 0))}</th></tr>
                </tbody>
              </table>
              {printing.notes && (<><div className="print-section-title">Notes</div><div style={{ whiteSpace: 'pre-wrap' }}>{printing.notes}</div></>)}
            </>
          );
        })()}
      </PrintPreview>
    </div>
  );
};

export default TreatmentPlansTab;
