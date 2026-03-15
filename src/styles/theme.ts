import type { ThemeConfig } from 'antd';

export const theme: ThemeConfig = {
  token: {
    colorPrimary: '#0891b2',
    borderRadius: 6,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  components: {
    Layout: {
      siderBg: '#1e293b',
      triggerBg: '#334155',
    },
    Menu: {
      darkItemBg: '#1e293b',
      darkItemSelectedBg: '#0891b2',
      darkSubMenuItemBg: '#152033',
    },
  },
};

export function formatINR(paise: number): string {
  const rupees = paise / 100;
  return '\u20B9' + rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatINRShort(paise: number): string {
  const rupees = paise / 100;
  if (rupees >= 100000) return '\u20B9' + (rupees / 100000).toFixed(1) + 'L';
  if (rupees >= 1000) return '\u20B9' + (rupees / 1000).toFixed(1) + 'K';
  return '\u20B9' + rupees.toLocaleString('en-IN');
}
