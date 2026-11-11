import React, { useEffect, useState } from 'react';
import { AutoComplete, Button, Input, Table } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { medicinesApi } from '../../api/clinic.api';

export interface RxItem {
  medicine_name: string;
  strength?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
}

interface Props {
  value?: RxItem[];
  onChange?: (items: RxItem[]) => void;
}

const medLabel = (m: any) => [m.form, m.name, m.strength].filter(Boolean).join(' ');

/** Editable medicine list. Picking from the drug library prefills dose details, all of which stay editable. */
const RxItemsEditor: React.FC<Props> = ({ value = [], onChange }) => {
  const [medicines, setMedicines] = useState<any[]>([]);
  useEffect(() => { medicinesApi.list().then(setMedicines).catch(() => setMedicines([])); }, []);

  const update = (index: number, patch: Partial<RxItem>) => {
    onChange?.(value.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const cell = (key: keyof RxItem, placeholder: string) => (_: any, __: any, index: number) => (
    <Input size="small" value={value[index][key] || ''} placeholder={placeholder}
      onChange={e => update(index, { [key]: e.target.value })} />
  );

  return (
    <div>
      <Table size="small" pagination={false} dataSource={value} rowKey={(_, i) => String(i)}
        locale={{ emptyText: 'No medicines added' }}
        columns={[
          {
            title: 'Medicine', width: 240,
            render: (_: any, __: any, index: number) => (
              <AutoComplete size="small" style={{ width: '100%' }} value={value[index].medicine_name} placeholder="Type or pick from library"
                options={medicines.map(m => ({ value: medLabel(m), key: m.id }))}
                filterOption={(input, option) => String(option?.value || '').toLowerCase().includes(input.toLowerCase())}
                onChange={(text) => update(index, { medicine_name: text })}
                onSelect={(_text, option: any) => {
                  const m = medicines.find(x => x.id === option.key);
                  if (m) update(index, {
                    medicine_name: [m.form, m.name].filter(Boolean).join(' '),
                    strength: m.strength || '', frequency: m.frequency || '',
                    duration: m.duration || '', instructions: m.instructions || '',
                  });
                }} />
            ),
          },
          { title: 'Strength', width: 100, render: cell('strength', '500 mg') },
          { title: 'Frequency', width: 100, render: cell('frequency', '1-0-1') },
          { title: 'Duration', width: 100, render: cell('duration', '5 days') },
          { title: 'Instructions', render: cell('instructions', 'After food') },
          {
            title: '', width: 40,
            render: (_: any, __: any, index: number) => (
              <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => onChange?.(value.filter((_x, i) => i !== index))} />
            ),
          },
        ]} />
      <Button size="small" icon={<PlusOutlined />} style={{ marginTop: 8 }}
        onClick={() => onChange?.([...value, { medicine_name: '' }])}>Add medicine</Button>
    </div>
  );
};

export default RxItemsEditor;
