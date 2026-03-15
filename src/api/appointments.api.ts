import { AppointmentFilters, AppointmentFormData } from '../types/appointment.types';

const invoke = window.electronAPI.invoke;

export const appointmentsApi = {
  list: (filters?: AppointmentFilters) => invoke('appointments:list', filters),
  getById: (id: number) => invoke('appointments:getById', id),
  create: (data: AppointmentFormData) => invoke('appointments:create', data),
  update: (id: number, data: any) => invoke('appointments:update', id, data),
  delete: (id: number) => invoke('appointments:delete', id),
  getUpcoming: (limit?: number) => invoke('appointments:getUpcoming', limit),
  getTodays: () => invoke('appointments:getTodays'),
};
