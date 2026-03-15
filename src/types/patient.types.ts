export interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  phone_primary: string;
  phone_secondary: string | null;
  email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  medical_history: string | null;
  notes: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface PatientSummary extends Patient {
  next_appointment?: string | null;
  next_treatment?: string | null;
  total_paid_paise?: number;
  outstanding_paise?: number;
}

export interface PatientFilters {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export type PatientFormData = Omit<Patient, 'id' | 'is_active' | 'created_at' | 'updated_at'>;
