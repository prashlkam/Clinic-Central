import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Select, Input, Space, Tag, Switch, Table, Button, message, Empty } from 'antd';
import { teethApi, errorText } from '../../api/clinic.api';

export const TOOTH_CONDITIONS: Record<string, { label: string; color: string; text?: string; short: string }> = {
  caries: { label: 'Caries / decay', color: '#fca5a5', short: 'CAR' },
  filled: { label: 'Filling', color: '#93c5fd', short: 'FIL' },
  rct: { label: 'Root canal treated', color: '#c4b5fd', short: 'RCT' },
  crown: { label: 'Crown', color: '#fcd34d', short: 'CRN' },
  bridge: { label: 'Bridge', color: '#fdba74', short: 'BRG' },
  implant: { label: 'Implant', color: '#5eead4', short: 'IMP' },
  missing: { label: 'Missing / extracted', color: '#334155', text: '#fff', short: 'MIS' },
  impacted: { label: 'Impacted', color: '#f9a8d4', short: 'IMPC' },
  fractured: { label: 'Fractured', color: '#f87171', short: 'FRC' },
  mobile: { label: 'Mobile', color: '#bef264', short: 'MOB' },
  planned: { label: 'Treatment planned', color: '#e2e8f0', short: 'PLN' },
};

// FDI two-digit numbering, laid out as the dentist sees the patient (patient's right on the left).
const PERMANENT = {
  upper: [[18, 17, 16, 15, 14, 13, 12, 11], [21, 22, 23, 24, 25, 26, 27, 28]],
  lower: [[48, 47, 46, 45, 44, 43, 42, 41], [31, 32, 33, 34, 35, 36, 37, 38]],
};
const PRIMARY = {
  upper: [[55, 54, 53, 52, 51], [61, 62, 63, 64, 65]],
  lower: [[85, 84, 83, 82, 81], [71, 72, 73, 74, 75]],
};

interface Props { patientId: number }

const DentalChart: React.FC<Props> = ({ patientId }) => {
  const [chart, setChart] = useState<Record<string, any>>({});
  const [showPrimary, setShowPrimary] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [condition, setCondition] = useState<string | undefined>();
  const [surfaces, setSurfaces] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const loadChart = useCallback(async () => {
    try {
      const rows: any[] = await teethApi.getChart(patientId);
      const map: Record<string, any> = {};
      rows.forEach(r => { map[r.tooth_number] = r; });
      setChart(map);
      if (rows.some(r => Number(r.tooth_number) >= 51)) setShowPrimary(true);
    } catch (err) {
      message.error(errorText(err, 'Could not load dental chart'));
    }
  }, [patientId]);

  useEffect(() => { loadChart(); }, [loadChart]);

  const openTooth = (tooth: number) => {
    const existing = chart[String(tooth)];
    setEditing(String(tooth));
    setCondition(existing?.condition);
    setSurfaces(existing?.surfaces ? existing.surfaces.split(',') : []);
    setNotes(existing?.notes || '');
  };

  const saveTooth = async () => {
    if (!editing) return;
    try {
      if (condition) await teethApi.setTooth(patientId, editing, { condition, surfaces: surfaces.join(','), notes });
      else await teethApi.clearTooth(patientId, editing);
      setEditing(null);
      loadChart();
    } catch (err) {
      message.error(errorText(err, 'Could not save tooth'));
    }
  };

  const renderTooth = (tooth: number, lower: boolean, primary: boolean) => {
    const entry = chart[String(tooth)];
    const c = entry ? TOOTH_CONDITIONS[entry.condition] : undefined;
    return (
      <button key={tooth} type="button" className={`tooth${lower ? ' lower' : ''}${primary ? ' primary' : ''}`}
        style={c ? { background: c.color, color: c.text || '#0f172a', borderColor: '#475569' } : undefined}
        title={entry ? `${tooth}: ${c?.label || entry.condition}${entry.notes ? ` — ${entry.notes}` : ''}` : `Tooth ${tooth}`}
        onClick={() => openTooth(tooth)}>
        {tooth}
        {c && <small>{c.short}</small>}
      </button>
    );
  };

  const renderRow = (quadrants: number[][], lower: boolean, primary = false) => (
    <div className="tooth-row" style={{ margin: '6px 0' }}>
      {quadrants.map((q, i) => <div className="tooth-quadrant" key={i}>{q.map(t => renderTooth(t, lower, primary))}</div>)}
    </div>
  );

  const findings = Object.values(chart).sort((a: any, b: any) => Number(a.tooth_number) - Number(b.tooth_number));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ color: 'var(--text-secondary)' }}>Click a tooth to record its condition (FDI numbering). Left of the chart is the patient's right side.</span>
        <Space><span>Milk teeth</span><Switch checked={showPrimary} onChange={setShowPrimary} size="small" /></Space>
      </div>

      <div style={{ overflowX: 'auto', padding: '8px 0' }}>
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>UPPER</div>
        {renderRow(PERMANENT.upper, false)}
        {showPrimary && renderRow(PRIMARY.upper, false, true)}
        <div style={{ borderTop: '2px dashed #94a3b8', margin: '8px auto', maxWidth: 760 }} />
        {showPrimary && renderRow(PRIMARY.lower, true, true)}
        {renderRow(PERMANENT.lower, true)}
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>LOWER</div>
      </div>

      <Space wrap size={[4, 4]} style={{ margin: '12px 0' }}>
        {Object.entries(TOOTH_CONDITIONS).map(([key, c]) => (
          <Tag key={key} color={c.color} style={{ color: c.text || '#0f172a' }}>{c.label}</Tag>
        ))}
      </Space>

      {findings.length === 0 ? <Empty description="No findings charted yet" image={Empty.PRESENTED_IMAGE_SIMPLE} /> : (
        <Table size="small" pagination={false} rowKey="tooth_number" dataSource={findings}
          columns={[
            { title: 'Tooth', dataIndex: 'tooth_number', width: 70 },
            { title: 'Condition', dataIndex: 'condition', width: 200, render: (v: string) => TOOTH_CONDITIONS[v]?.label || v },
            { title: 'Surfaces', dataIndex: 'surfaces', width: 110 },
            { title: 'Notes', dataIndex: 'notes' },
            { title: 'Updated', dataIndex: 'updated_at', width: 110, render: (v: string) => v ? new Date(v.replace(' ', 'T') + 'Z').toLocaleDateString('en-IN') : '' },
            { title: '', width: 60, render: (_: any, r: any) => <Button size="small" onClick={() => openTooth(Number(r.tooth_number))}>Edit</Button> },
          ]} />
      )}

      <Modal title={`Tooth ${editing}`} open={!!editing} onCancel={() => setEditing(null)} onOk={saveTooth} okText="Save" destroyOnHidden>
        <Space orientation="vertical" style={{ width: '100%' }} size={12}>
          <div>
            <div style={{ marginBottom: 4 }}>Condition</div>
            <Select style={{ width: '100%' }} allowClear placeholder="Healthy / nothing recorded" value={condition} onChange={setCondition}
              options={Object.entries(TOOTH_CONDITIONS).map(([value, c]) => ({ value, label: c.label }))} />
          </div>
          <div>
            <div style={{ marginBottom: 4 }}>Surfaces involved</div>
            <Select mode="multiple" style={{ width: '100%' }} value={surfaces} onChange={setSurfaces} placeholder="Optional"
              options={[['M', 'Mesial'], ['D', 'Distal'], ['O', 'Occlusal / incisal'], ['B', 'Buccal / labial'], ['L', 'Lingual / palatal']].map(([value, label]) => ({ value, label: `${value} - ${label}` }))} />
          </div>
          <div>
            <div style={{ marginBottom: 4 }}>Notes</div>
            <Input.TextArea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </Space>
      </Modal>
    </div>
  );
};

export default DentalChart;
