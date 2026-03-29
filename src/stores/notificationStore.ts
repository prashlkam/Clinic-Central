import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NotificationState {
  isBellEnabled: boolean;
  toggleBell: () => void;
  setBellEnabled: (enabled: boolean) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      isBellEnabled: false,
      toggleBell: () => set((state) => ({ isBellEnabled: !state.isBellEnabled })),
      setBellEnabled: (enabled) => set({ isBellEnabled: enabled }),
    }),
    {
      name: 'notification-storage',
    }
  )
);
