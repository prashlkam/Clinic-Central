import React, { useCallback, useEffect, useImperativeHandle, useState, forwardRef } from 'react';
import { Table, Button, Space, Popconfirm, Tooltip, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import FormModal, { FieldDef } from './FormModal';
import { errorText } from '../../api/clinic.api';

export interface CrudTableHandle { reload: () => void }

interface Props {
  columns: any[];
  fields: FieldDef[];
  load: () => Promise<any[]>;
  save: (values: Record<string, any>, editing: any | null) => Promise<any>;
  remove?: (row: any) => Promise<any>;
  itemName: string;
  defaults?: Record<string, any>;
  formWidth?: number;
  toolbar?: React.ReactNode;
  rowActions?: (row: any, reload: () => void) => React.ReactNode;
  expandable?: any;
  canEdit?: (row: any) => boolean;
  emptyText?: string;
  pageSize?: number;
  onChanged?: () => void;
}

/** List + add/edit/delete for one kind of record, driven by column and field definitions. */
const CrudTable = forwardRef<CrudTableHandle, Props>(({
  columns, fields, load, save, remove, itemName, defaults, formWidth, toolbar, rowActions,
  expandable, canEdit, emptyText, pageSize = 15, onChanged,
}, ref) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await load());
    } catch (err) {
      message.error(errorText(err, `Could not load ${itemName}s`));
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => { reload(); }, [reload]);
  useImperativeHandle(ref, () => ({ reload }), [reload]);

  const changed = () => { reload(); onChanged?.(); };

  const actionColumn = {
    title: '', key: '_actions', align: 'right' as const, width: 1,
    render: (_: any, row: any) => (
      <Space size={4} style={{ whiteSpace: 'nowrap' }}>
        {rowActions?.(row, changed)}
        {(!canEdit || canEdit(row)) && (
          <Tooltip title="Edit">
            <Button size="small" icon={<EditOutlined />} onClick={() => { setEditing(row); setOpen(true); }} />
          </Tooltip>
        )}
        {remove && (
          <Popconfirm title={`Delete this ${itemName}?`} okText="Delete" okButtonProps={{ danger: true }}
            onConfirm={async () => {
              try {
                await remove(row);
                message.success(`${itemName[0].toUpperCase()}${itemName.slice(1)} deleted`);
                changed();
              } catch (err) {
                message.error(errorText(err, 'Could not delete'));
              }
            }}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        )}
      </Space>
    ),
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
        <Space wrap>{toolbar}</Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setOpen(true); }}>
          New {itemName}
        </Button>
      </div>
      <Table columns={[...columns, actionColumn]} dataSource={rows} rowKey="id" size="small" loading={loading}
        expandable={expandable} locale={emptyText ? { emptyText } : undefined}
        pagination={rows.length > pageSize ? { pageSize, showSizeChanger: false } : false} />
      <FormModal
        open={open}
        title={`${editing ? 'Edit' : 'New'} ${itemName}`}
        fields={fields}
        initial={editing || defaults}
        width={formWidth}
        onCancel={() => setOpen(false)}
        onSubmit={async (values) => {
          await save(editing ? { ...values, id: editing.id } : values, editing);
          message.success(`${itemName[0].toUpperCase()}${itemName.slice(1)} saved`);
          setOpen(false);
          changed();
        }}
      />
    </div>
  );
});

export default CrudTable;
