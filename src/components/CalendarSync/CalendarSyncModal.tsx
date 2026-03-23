import React, { useEffect, useState } from 'react';
import { Modal, Button, Space, Typography, Divider } from 'antd';
import { GoogleOutlined, WindowsOutlined, CalendarOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { doctorApi } from '../../api/doctor.api';

const { Text, Paragraph } = Typography;

interface CalendarSyncProps {
  open: boolean;
  onClose: () => void;
  appointment: {
    patient_name?: string;
    patient_email?: string;
    treatment_name?: string;
    appointment_date: string;
    duration_minutes: number;
    notes?: string | null;
  } | null;
}

function formatDateForGoogle(date: string): string {
  return dayjs(date).format('YYYYMMDDTHHmmss');
}

function buildGoogleCalendarUrl(appt: CalendarSyncProps['appointment'], doctorEmail?: string): string {
  if (!appt) return '';
  const start = formatDateForGoogle(appt.appointment_date);
  const end = formatDateForGoogle(
    dayjs(appt.appointment_date).add(appt.duration_minutes, 'minute').toISOString()
  );
  const title = `Appointment - ${appt.patient_name || 'Patient'}`;
  const details = [
    appt.treatment_name ? `Treatment: ${appt.treatment_name}` : '',
    appt.notes || '',
  ].filter(Boolean).join('\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${start}/${end}`,
    details,
  });

  // Add attendees: doctor and patient
  const attendees = [doctorEmail, appt.patient_email].filter(Boolean).join(',');
  if (attendees) params.set('add', attendees);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildOutlookWebUrl(appt: CalendarSyncProps['appointment']): string {
  if (!appt) return '';
  const start = dayjs(appt.appointment_date).toISOString();
  const end = dayjs(appt.appointment_date).add(appt.duration_minutes, 'minute').toISOString();
  const title = `Appointment - ${appt.patient_name || 'Patient'}`;
  const body = [
    appt.treatment_name ? `Treatment: ${appt.treatment_name}` : '',
    appt.notes || '',
  ].filter(Boolean).join('\n');

  const params = new URLSearchParams({
    rru: 'addevent',
    subject: title,
    startdt: start,
    enddt: end,
    body,
    path: '/calendar/action/compose',
  });
  return `https://outlook.live.com/calendar/0/action/compose?${params.toString()}`;
}

function buildIcsContent(appt: CalendarSyncProps['appointment'], doctorEmail?: string, doctorName?: string): string {
  if (!appt) return '';
  const start = dayjs(appt.appointment_date).format('YYYYMMDDTHHmmss');
  const end = dayjs(appt.appointment_date).add(appt.duration_minutes, 'minute').format('YYYYMMDDTHHmmss');
  const title = `Appointment - ${appt.patient_name || 'Patient'}`;
  const description = [
    appt.treatment_name ? `Treatment: ${appt.treatment_name}` : '',
    appt.notes || '',
  ].filter(Boolean).join('\\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ClinicCentral//Appointment//EN',
    'BEGIN:VEVENT',
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
  ];

  if (doctorEmail) {
    lines.push(`ORGANIZER;CN=${doctorName || 'Doctor'}:mailto:${doctorEmail}`);
    lines.push(`ATTENDEE;CN=${doctorName || 'Doctor'};ROLE=REQ-PARTICIPANT:mailto:${doctorEmail}`);
  }
  if (appt.patient_email) {
    lines.push(`ATTENDEE;CN=${appt.patient_name || 'Patient'};ROLE=REQ-PARTICIPANT:mailto:${appt.patient_email}`);
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

function downloadIcsFile(appt: CalendarSyncProps['appointment'], doctorEmail?: string, doctorName?: string) {
  const content = buildIcsContent(appt, doctorEmail, doctorName);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `appointment-${dayjs(appt?.appointment_date).format('YYYY-MM-DD')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const CalendarSyncModal: React.FC<CalendarSyncProps> = ({ open, onClose, appointment }) => {
  const [doctorEmail, setDoctorEmail] = useState<string | undefined>();
  const [doctorName, setDoctorName] = useState<string | undefined>();

  useEffect(() => {
    if (open) {
      doctorApi.getProfile().then((profile: any) => {
        if (profile?.email) setDoctorEmail(profile.email);
        if (profile?.name) setDoctorName(profile.name);
      });
    }
  }, [open]);

  if (!appointment) return null;

  const dateStr = dayjs(appointment.appointment_date).format('DD MMM YYYY, hh:mm A');

  return (
    <Modal
      title={<><CalendarOutlined /> Sync to Calendar</>}
      open={open}
      onCancel={onClose}
      footer={
        <Button onClick={onClose}>Skip</Button>
      }
      width={440}
    >
      <Paragraph type="secondary" style={{ marginBottom: 16 }}>
        Appointment for <Text strong>{appointment.patient_name}</Text> on <Text strong>{dateStr}</Text>
      </Paragraph>

      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Button
          block
          size="large"
          icon={<GoogleOutlined />}
          onClick={() => window.open(buildGoogleCalendarUrl(appointment, doctorEmail), '_blank')}
        >
          Add to Google Calendar
        </Button>

        <Button
          block
          size="large"
          icon={<WindowsOutlined />}
          onClick={() => window.open(buildOutlookWebUrl(appointment), '_blank')}
        >
          Add to Outlook (Web)
        </Button>

        <Divider plain style={{ margin: '4px 0' }}>or</Divider>

        <Button
          block
          icon={<DownloadOutlined />}
          onClick={() => downloadIcsFile(appointment, doctorEmail, doctorName)}
        >
          Download .ics file (Outlook / Apple Calendar)
        </Button>
      </Space>
    </Modal>
  );
};

export default CalendarSyncModal;
