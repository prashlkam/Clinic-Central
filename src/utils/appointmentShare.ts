import dayjs from 'dayjs';

/** Settings keys used for WhatsApp messages (stored in the generic settings table). */
export const WHATSAPP_SETTING_DEFAULTS = {
  whatsapp_country_code: '91',
  whatsapp_confirmation_template:
    'Hello {patient}, your appointment at {clinic} is booked for {date} at {time}. Please reply to this message if you need to reschedule. Thank you!',
  whatsapp_reminder_template:
    'Hello {patient}, this is a reminder of your appointment at {clinic} on {date} at {time}. Please reply to this message if you need to reschedule. See you soon!',
};

export type WhatsAppMessageType = 'confirmation' | 'reminder';

export interface ShareableAppointment {
  patient_name?: string;
  patient_email?: string | null;
  patient_phone?: string | null;
  treatment_name?: string | null;
  appointment_date: string;
  duration_minutes: number;
  notes?: string | null;
}

/**
 * Turns a phone number as typed in the patient record into the digits-only international
 * form WhatsApp needs. Numbers without a country code get the clinic's default one.
 * Returns null when the number cannot be used.
 */
export function toWhatsAppNumber(phone?: string | null, defaultCountryCode = '91'): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  let digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+')) {
    // already international
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else {
    digits = digits.replace(/^0+/, '');
    if (digits.length <= 10) digits = defaultCountryCode.replace(/\D/g, '') + digits;
  }
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

/** Fills {patient}, {clinic}, {date}, {time}, {treatment}, {doctor} and {phone} in a template. */
export function fillTemplate(
  template: string,
  appt: ShareableAppointment,
  ctx: { clinicName?: string; clinicPhone?: string; doctorName?: string },
): string {
  const when = dayjs(appt.appointment_date);
  const values: Record<string, string> = {
    patient: appt.patient_name || '',
    clinic: ctx.clinicName || 'the clinic',
    date: when.format('dddd, D MMMM YYYY'),
    time: when.format('h:mm A'),
    treatment: appt.treatment_name || '',
    doctor: ctx.doctorName || '',
    phone: ctx.clinicPhone || '',
  };
  return template
    .replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? values[key] : match))
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/** Click-to-chat link: opens WhatsApp (app or web) with the message typed in, ready to send. */
export function buildWhatsAppUrl(number: string, text: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
