import type { ThemeConfig } from 'antd';

export const lightTheme: ThemeConfig = {
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

export const darkTheme: ThemeConfig = {
  token: {
    colorPrimary: '#0891b2',
    borderRadius: 6,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    colorBgBase: '#0f172a',
    colorTextBase: '#f1f5f9',
    colorBgContainer: '#1e293b',
    colorBgElevated: '#334155',
    colorBorder: '#475569',
    colorTextSecondary: '#94a3b8',
  },
  components: {
    Layout: {
      siderBg: '#0f172a',
      triggerBg: '#1e293b',
      headerBg: '#1e293b',
      bodyBg: '#0f172a',
    },
    Menu: {
      darkItemBg: '#0f172a',
      darkItemSelectedBg: '#0891b2',
      darkSubMenuItemBg: '#1e293b',
    },
    Card: {
      colorBgContainer: '#1e293b',
    },
    Table: {
      colorBgContainer: '#1e293b',
      headerBg: '#334155',
    },
    Input: {
      colorBgContainer: '#334155',
      colorBorder: '#475569',
    },
    Select: {
      colorBgContainer: '#334155',
      colorBorder: '#475569',
    },
    DatePicker: {
      colorBgContainer: '#334155',
      colorBorder: '#475569',
    },
    Modal: {
      contentBg: '#1e293b',
      headerBg: '#1e293b',
    },
    Drawer: {
      colorBgContainer: '#1e293b',
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
