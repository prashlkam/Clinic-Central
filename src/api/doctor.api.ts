const invoke = window.electronAPI.invoke;

export const doctorApi = {
  isRegistered: () => invoke('doctor:isRegistered'),
  register: (data: any) => invoke('doctor:register', data),
  login: (password: string) => invoke('doctor:login', password),
  getProfile: () => invoke('doctor:getProfile'),
  updateProfile: (data: any) => invoke('doctor:updateProfile', data),
  changePassword: (oldPassword: string, newPassword: string) => invoke('doctor:changePassword', oldPassword, newPassword),
};
