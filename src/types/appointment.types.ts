export interface Appointment {
  id: number;
  patient_id: number;
  treatment_id: number | null;
  appointment_date: string;
  duration_minutes: number;
  status: string;
  notes: string | null;
  google_event_id: string | null;
  created_at: string;
  updated_at: string;
  patient_name?: string;
  treatment_name?: string;
  patient_phone?: string;
  patient_email?: string;
  estimated_cost_paise?: number;
}

export interface AppointmentFilters {
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  patientId?: number;
  page?: number;
  pageSize?: number;
}

export type AppointmentFormData = {
  patient_id: number;
  treatment_id?: number;
  appointment_date: string;
  duration_minutes?: number;
  notes?: string;
};
