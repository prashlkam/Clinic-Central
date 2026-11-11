import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Space } from 'antd';
import { PrinterOutlined, CloseOutlined } from '@ant-design/icons';
import { settingsApi } from '../../api/finance.api';
import { doctorApi } from '../../api/doctor.api';

export interface ClinicInfo { settings: Record<string, string>; doctor: any }

/** Clinic letterhead details (fetched fresh each time so edits in Settings show up immediately). */
export function useClinicInfo(enabled = true): ClinicInfo | null {
  const [info, setInfo] = useState<ClinicInfo | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    Promise.all([settingsApi.getAll(), doctorApi.getProfile()])
      .then(([settings, doctor]) => { if (alive) setInfo({ settings, doctor }); })
      .catch(() => { if (alive) setInfo({ settings: {}, doctor: null }); });
    return () => { alive = false; };
  }, [enabled]);
  return info;
}

export const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  /** e.g. patient name / age / date shown under the letterhead */
  meta?: [string, React.ReactNode][];
  footer?: React.ReactNode;
  showDoctorSignature?: boolean;
  children: React.ReactNode;
}

/**
 * Full-window print preview with the clinic letterhead. Printing goes through the operating
 * system's print dialog (which can also "Print to PDF"), so everything stays on this computer.
 */
const PrintPreview: React.FC<Props> = ({ open, title, onClose, meta, footer, showDoctorSignature = true, children }) => {
  const info = useClinicInfo(open);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add('print-preview-open');
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('print-preview-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!open) return null;
  const s = info?.settings || {};
  const d = info?.doctor;

  return createPortal(
    <div className="print-root">
      <div className="print-toolbar no-print">
        <strong>{title} — print preview</strong>
        <Space>
          <Button type="primary" icon={<PrinterOutlined />} onClick={() => window.print()} disabled={!info}>Print / Save as PDF</Button>
          <Button icon={<CloseOutlined />} onClick={onClose}>Close</Button>
        </Space>
      </div>
      <div className="print-sheet">
        <div className="print-letterhead">
          <div>
            <div className="print-clinic-name">{s.clinic_name || 'Clinic'}</div>
            {s.clinic_address && <div style={{ whiteSpace: 'pre-line' }}>{s.clinic_address}</div>}
            <div>{[s.clinic_phone && `Ph: ${s.clinic_phone}`, s.clinic_email].filter(Boolean).join('  |  ')}</div>
            {s.gstin && <div>GSTIN: {s.gstin}</div>}
          </div>
          {d && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{d.name}</div>
              {d.qualification && <div>{d.qualification}</div>}
              {d.specialization && <div>{d.specialization}</div>}
              {d.registration_number && <div>Reg. No: {d.registration_number}</div>}
            </div>
          )}
        </div>
        <div className="print-title">{title}</div>
        {meta && meta.length > 0 && (
          <div className="print-meta">
            {meta.filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => (
              <div key={k}><span className="print-meta-label">{k}:</span> {v}</div>
            ))}
          </div>
        )}
        <div className="print-body">{children}</div>
        {(footer || showDoctorSignature) && (
          <div className="print-footer">
            <div>{footer}</div>
            {showDoctorSignature && (
              <div style={{ textAlign: 'center', minWidth: 200 }}>
                <div style={{ height: 48 }} />
                <div style={{ borderTop: '1px solid #000', paddingTop: 4 }}>{d?.name || 'Doctor'}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default PrintPreview;
