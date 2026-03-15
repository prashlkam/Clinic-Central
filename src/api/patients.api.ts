import { PatientFilters, PatientFormData, PatientSummary } from '../types/patient.types';
import { PaginatedResult } from '../types/common.types';

const invoke = window.electronAPI.invoke;

export const patientsApi = {
  list: (filters?: PatientFilters): Promise<PaginatedResult<any>> =>
    invoke('patients:list', filters),
  getById: (id: number): Promise<PatientSummary> =>
    invoke('patients:getById', id),
  getAll: (): Promise<any[]> =>
    invoke('patients:getAll'),
  create: (data: PatientFormData) =>
    invoke('patients:create', data),
  update: (id: number, data: Partial<PatientFormData>) =>
    invoke('patients:update', id, data),
  delete: (id: number) =>
    invoke('patients:delete', id),
};
