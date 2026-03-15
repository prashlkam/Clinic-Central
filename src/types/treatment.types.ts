export interface Treatment {
  id: number;
  tree_id: number;
  parent_id: number | null;
  name: string;
  description: string | null;
  estimated_cost_paise: number;
  duration_minutes: number;
  is_active: number;
  sort_order: number;
  tree_name?: string;
  children?: Treatment[];
}

export interface TreatmentTree {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  treatments?: Treatment[];
}
