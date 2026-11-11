import React, { useCallback, useRef, useState } from 'react';
import { Card, Input, Switch, Space, Tag, Button, Tooltip, Modal, Table, message } from 'antd';
import { PlusCircleOutlined, MinusCircleOutlined, HistoryOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import CrudTable, { CrudTableHandle } from '../../components/Crud/CrudTable';
import FormModal, { FieldDef } from '../../components/Crud/FormModal';
import { inventoryApi } from '../../api/clinic.api';
import { fmtDate } from '../../components/Print/PrintPreview';
import { formatINR } from '../../styles/theme';

const CATEGORIES = ['Consumables', 'Restorative materials', 'Endodontic', 'Impression materials', 'Anaesthetics',
  'Instruments', 'Sterilisation', 'Orthodontic', 'Implant components', 'Medicines', 'Stationery', 'Other'];

const itemFields: FieldDef[] = [
  { name: 'name', label: 'Item name', required: true, span: 14 },
  { name: 'category', label: 'Category', type: 'select', span: 10, options: CATEGORIES.map(c => ({ value: c, label: c })) },
  { name: 'unit', label: 'Unit', span: 8, placeholder: 'pcs, box, ml…' },
  { name: 'opening_quantity', label: 'Opening stock', type: 'number', span: 8, props: { min: 0 }, createOnly: true },
  { name: 'reorder_level', label: 'Reorder at or below', type: 'number', span: 8, props: { min: 0 } },
  { name: 'unit_cost_paise', label: 'Cost per unit', type: 'money', span: 8 },
  { name: 'expiry_date', label: 'Expiry date', type: 'date', span: 8 },
  { name: 'supplier', label: 'Supplier', span: 24 },
];

const MOVE = { in: 'Stock in (purchase)', out: 'Stock out (used)', adjust: 'Set counted quantity' } as const;

const InventoryPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [moving, setMoving] = useState<{ item: any; type: keyof typeof MOVE } | null>(null);
  const [history, setHistory] = useState<{ item: any; rows: any[] } | null>(null);
  const table = useRef<CrudTableHandle>(null);

  const load = useCallback(() => inventoryApi.list({ search, lowOnly }), [search, lowOnly]);
  const expiring = (d?: string) => d && dayjs(d).diff(dayjs(), 'day') <= 60;

  return (
    <div>
      <div className="page-header"><h2>Inventory</h2></div>
      <Card>
        <CrudTable
          ref={table}
          itemName="item"
          load={load}
          save={(values) => inventoryApi.save(values)}
          remove={(row) => inventoryApi.delete(row.id)}
          fields={itemFields}
          defaults={{ unit: 'pcs', reorder_level: 0, opening_quantity: 0 }}
          emptyText="No stock items yet"
          toolbar={<>
            <Input prefix={<SearchOutlined />} placeholder="Search items" allowClear style={{ width: 240 }} onChange={e => setSearch(e.target.value)} />
            <Space><Switch size="small" checked={lowOnly} onChange={setLowOnly} /> Low stock only</Space>
          </>}
          columns={[
            { title: 'Item', dataIndex: 'name' },
            { title: 'Category', dataIndex: 'category', width: 180 },
            {
              title: 'In stock', dataIndex: 'quantity', width: 150,
              render: (q: number, r: any) => (
                <Space>
                  <strong>{q} {r.unit}</strong>
                  {q <= r.reorder_level && <Tag color={q === 0 ? 'red' : 'orange'}>{q === 0 ? 'out of stock' : 'low'}</Tag>}
                </Space>
              ),
            },
            { title: 'Reorder at', dataIndex: 'reorder_level', width: 100 },
            { title: 'Unit cost', dataIndex: 'unit_cost_paise', width: 110, align: 'right' as const, render: (v: number) => (v ? formatINR(v) : '') },
            { title: 'Expiry', dataIndex: 'expiry_date', width: 130, render: (v: string) => v ? <Tag color={dayjs(v).isBefore(dayjs(), 'day') ? 'red' : expiring(v) ? 'orange' : 'default'}>{fmtDate(v)}</Tag> : '' },
            { title: 'Supplier', dataIndex: 'supplier', ellipsis: true },
          ]}
          rowActions={(r) => (
            <>
              <Tooltip title="Stock in"><Button size="small" icon={<PlusCircleOutlined />} onClick={() => setMoving({ item: r, type: 'in' })} /></Tooltip>
              <Tooltip title="Stock out"><Button size="small" icon={<MinusCircleOutlined />} onClick={() => setMoving({ item: r, type: 'out' })} /></Tooltip>
              <Tooltip title="Stock history"><Button size="small" icon={<HistoryOutlined />} onClick={async () => setHistory({ item: r, rows: await inventoryApi.movements(r.id) })} /></Tooltip>
            </>
          )}
        />
      </Card>

      <FormModal
        open={!!moving}
        title={moving ? `${MOVE[moving.type]} — ${moving.item.name} (now ${moving.item.quantity} ${moving.item.unit})` : ''}
        width={480}
        initial={moving ? { type: moving.type, movement_date: dayjs().format('YYYY-MM-DD') } : null}
        fields={[
          { name: 'type', label: 'Movement', type: 'select', required: true, options: Object.entries(MOVE).map(([value, label]) => ({ value, label })), props: { allowClear: false } },
          { name: 'quantity', label: 'Quantity', type: 'number', required: true, span: 12, props: { min: 0 } },
          { name: 'movement_date', label: 'Date', type: 'date', required: true, span: 12 },
          { name: 'notes', label: 'Notes (supplier bill no., reason…)' },
        ]}
        onCancel={() => setMoving(null)}
        onSubmit={async (values) => {
          const result = await inventoryApi.addMovement({ ...values, item_id: moving!.item.id });
          message.success(`Stock updated: ${result.quantity} ${moving!.item.unit} in hand`);
          setMoving(null);
          table.current?.reload();
        }}
      />

      <Modal title={`Stock history — ${history?.item.name || ''}`} open={!!history} onCancel={() => setHistory(null)} footer={null} width={620}>
        <Table size="small" rowKey="id" dataSource={history?.rows || []} pagination={false} scroll={{ y: 360 }}
          columns={[
            { title: 'Date', dataIndex: 'movement_date', width: 120, render: fmtDate },
            { title: 'Type', dataIndex: 'type', width: 110, render: (t: string) => <Tag color={t === 'in' ? 'green' : t === 'out' ? 'red' : 'blue'}>{t === 'adjust' ? 'count set to' : t}</Tag> },
            { title: 'Qty', dataIndex: 'quantity', width: 80 },
            { title: 'Notes', dataIndex: 'notes' },
          ]} />
      </Modal>
    </div>
  );
};

export default InventoryPage;
