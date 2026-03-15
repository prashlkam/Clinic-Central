export interface Invoice {
  id: number;
  invoice_number: string;
  patient_id: number;
  appointment_id: number | null;
  invoice_date: string;
  subtotal_paise: number;
  discount_paise: number;
  tax_paise: number;
  total_paise: number;
  status: string;
  notes: string | null;
  patient_name?: string;
  items?: InvoiceItem[];
  payments?: Transaction[];
  paid_paise?: number;
  balance_paise?: number;
}

export interface InvoiceItem {
  id?: number;
  invoice_id?: number;
  treatment_id: number | null;
  description: string;
  quantity: number;
  unit_price_paise: number;
  total_paise: number;
  treatment_name?: string;
}

export interface Transaction {
  id: number;
  type: string;
  category: string | null;
  patient_id: number | null;
  invoice_id: number | null;
  appointment_id: number | null;
  amount_paise: number;
  payment_method: string;
  transaction_date: string;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  patient_name?: string;
  invoice_number?: string;
}

export interface TransactionFilters {
  search?: string;
  type?: string;
  patientId?: number;
  startDate?: string;
  endDate?: string;
  paymentMethod?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}

export interface ReportFilters {
  startDate: string;
  endDate: string;
  patientId?: number;
  granularity: 'daily' | 'weekly' | 'monthly' | 'yearly';
  category?: string;
}

export interface DashboardStats {
  todayAppointments: number;
  monthIncome: number;
  monthExpenses: number;
  totalOutstanding: number;
  totalPatients: number;
}
