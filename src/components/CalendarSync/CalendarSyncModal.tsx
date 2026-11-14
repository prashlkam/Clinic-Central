import React, { useEffect, useState } from 'react';
import { Modal, Button, Space, Typography, Divider, Input, Segmented, Alert } from 'antd';
import { GoogleOutlined, WindowsOutlined, CalendarOutlined, DownloadOutlined, WhatsAppOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { doctorApi } from '../../api/doctor.api';
import { settingsApi } from '../../api/finance.api';
import {
  ShareableAppointment, WhatsAppMessageType, WHATSAPP_SETTING_DEFAULTS,
  buildWhatsAppUrl, fillTemplate, toWhatsAppNumber,
} from '../../utils/appointmentShare';

const { Text, Paragraph } = Typography;

interface CalendarSyncProps {
  open: boolean;
  onClose: () => void;
  appointment: ShareableAppointment | null;
  /** which WhatsApp message is preselected when the dialog opens */
  initialMessageType?: WhatsAppMessageType;
}

function formatDateForGoogle(date: string): string {
  return dayjs(date).format('YYYYMMDDTHHmmss');
}

function buildGoogleCalendarUrl(appt: CalendarSyncProps['appointment'], doctorEmail?: string, location?: string): string {
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

  if (location) params.set('location', location);

  // Guests: Google e-mails them the invitation when the event is saved
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

const CalendarSyncModal: React.FC<CalendarSyncProps> = ({ open, onClose, appointment, initialMessageType = 'confirmation' }) => {
  const [doctorEmail, setDoctorEmail] = useState<string | undefined>();
  const [doctorName, setDoctorName] = useState<string | undefined>();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [messageType, setMessageType] = useState<WhatsAppMessageType>(initialMessageType);
  const [messageText, setMessageText] = useState('');

  useEffect(() => {
    if (open) {
      setMessageType(initialMessageType);
      doctorApi.getProfile().then((profile: any) => {
        if (profile?.email) setDoctorEmail(profile.email);
        if (profile?.name) setDoctorName(profile.name);
      }).catch(() => undefined);
      settingsApi.getAll().then((s: Record<string, string>) => setSettings(s || {})).catch(() => undefined);
    }
  }, [open, initialMessageType]);

  // (Re)write the message whenever the appointment, the kind of message or the templates change
  useEffect(() => {
    if (!open || !appointment) return;
    const key = messageType === 'reminder' ? 'whatsapp_reminder_template' : 'whatsapp_confirmation_template';
    const template = settings[key] || WHATSAPP_SETTING_DEFAULTS[key];
    setMessageText(fillTemplate(template, appointment, {
      clinicName: settings.clinic_name,
      clinicPhone: settings.clinic_phone,
      doctorName,
    }));
  }, [open, appointment, messageType, settings, doctorName]);

  if (!appointment) return null;

  const dateStr = dayjs(appointment.appointment_date).format('DD MMM YYYY, hh:mm A');
  const location = [settings.clinic_name, settings.clinic_address].filter(Boolean).join(', ');
  const whatsAppNumber = toWhatsAppNumber(
    appointment.patient_phone,
    settings.whatsapp_country_code || WHATSAPP_SETTING_DEFAULTS.whatsapp_country_code,
  );

  return (
    <Modal
      title={<><CalendarOutlined /> Calendar invite & WhatsApp reminder</>}
      open={open}
      onCancel={onClose}
      footer={
        <Button onClick={onClose}>Close</Button>
      }
      width={480}
    >
      <Paragraph type="secondary" style={{ marginBottom: 16 }}>
        Appointment for <Text strong>{appointment.patient_name}</Text> on <Text strong>{dateStr}</Text>
      </Paragraph>

      <Divider plain titlePlacement="start" style={{ margin: '0 0 12px' }}>Calendar</Divider>

      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <Button
            block
            size="large"
            icon={<GoogleOutlined />}
            onClick={() => window.open(buildGoogleCalendarUrl(appointment, doctorEmail, location), '_blank')}
          >
            Send Google Calendar invite
          </Button>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {appointment.patient_email
              ? `Opens Google Calendar with ${appointment.patient_email} as a guest. Press Save there and choose "Send" to e-mail the invitation.`
              : 'This patient has no e-mail address, so the event is only added to your own calendar. Add an e-mail to the patient record to send an invitation.'}
          </Text>
        </div>

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

      <Divider plain titlePlacement="start" style={{ margin: '20px 0 12px' }}>WhatsApp</Divider>

      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <Segmented
          block
          value={messageType}
          onChange={(v) => setMessageType(v as WhatsAppMessageType)}
          options={[
            { value: 'confirmation', label: 'Booking confirmation' },
            { value: 'reminder', label: 'Reminder' },
          ]}
        />
        <Input.TextArea
          rows={4}
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
        />
        {!whatsAppNumber && (
          <Alert
            type="warning"
            showIcon
            message={appointment.patient_phone
              ? `"${appointment.patient_phone}" is not a usable phone number.`
              : 'This patient has no phone number.'}
          />
        )}
        <Button
          block
          size="large"
          type="primary"
          icon={<WhatsAppOutlined />}
          disabled={!whatsAppNumber || !messageText.trim()}
          style={whatsAppNumber && messageText.trim() ? { background: '#25d366', borderColor: '#25d366' } : undefined}
          onClick={() => whatsAppNumber && window.open(buildWhatsAppUrl(whatsAppNumber, messageText.trim()), '_blank')}
        >
          Send on WhatsApp{whatsAppNumber ? ` to +${whatsAppNumber}` : ''}
        </Button>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Opens WhatsApp with the message typed in for this patient. Press Send there. The wording can be changed in Settings.
        </Text>
      </Space>
    </Modal>
  );
};

export default CalendarSyncModal;
