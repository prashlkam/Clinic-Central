import React from 'react';
import { Layout, Menu, Button } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  UserOutlined,
  MedicineBoxOutlined,
  CalendarOutlined,
  DollarOutlined,
  FileTextOutlined,
  BarChartOutlined,
  WalletOutlined,
  SettingOutlined,
  MoonOutlined,
  SunOutlined,
} from '@ant-design/icons';
import { useThemeStore } from '../../stores/themeStore';

const { Sider } = Layout;

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onCollapse }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode, toggleTheme } = useThemeStore();

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/patients', icon: <UserOutlined />, label: 'Patients' },
    { key: '/treatments', icon: <MedicineBoxOutlined />, label: 'Treatments' },
    { key: '/appointments', icon: <CalendarOutlined />, label: 'Appointments' },
    {
      key: 'finance',
      icon: <DollarOutlined />,
      label: 'Finance',
      children: [
        { key: '/invoices', icon: <FileTextOutlined />, label: 'Invoices' },
        { key: '/transactions', icon: <WalletOutlined />, label: 'Payments' },
        { key: '/expenses', icon: <DollarOutlined />, label: 'Expenses' },
        { key: '/reports', icon: <BarChartOutlined />, label: 'Reports' },
      ],
    },
    { key: '/settings', icon: <SettingOutlined />, label: 'Settings' },
  ];

  const getSelectedKey = () => {
    const path = location.pathname;
    if (path === '/') return '/';
    const match = menuItems.find(item => {
      if (item.children) {
        return item.children.some(child => path.startsWith(child.key));
      }
      return path.startsWith(item.key);
    });
    if (match?.children) {
      const child = match.children.find(c => path.startsWith(c.key));
      return child?.key || path;
    }
    return match?.key || path;
  };

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      width={220}
      theme={isDarkMode ? 'dark' : 'light'}
      style={{
        background: isDarkMode ? '#001529' : '#ffffff',
        transition: 'background-color 0.3s ease',
      }}
    >
      <div className="sidebar-logo" style={{ borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e5e7eb' }}>
        <h2 style={{ color: isDarkMode ? '#fff' : '#1f2937' }}>{collapsed ? 'CC' : 'Clinic Central'}</h2>
      </div>
      <Menu
        theme={isDarkMode ? 'dark' : 'light'}
        style={{ background: 'transparent' }}
        mode="inline"
        selectedKeys={[getSelectedKey()]}
        defaultOpenKeys={['finance']}
        items={menuItems}
        onClick={({ key }) => {
          if (key !== 'finance') navigate(key);
        }}
      />
      <div className="sidebar-footer" style={{ borderTopColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e5e7eb' }}>
        <Button
          type="text"
          icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />}
          onClick={toggleTheme}
          style={{
            color: isDarkMode ? '#94a3b8' : '#4b5563',
            width: '100%',
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {!collapsed && (isDarkMode ? 'Light Mode' : 'Dark Mode')}
        </Button>
      </div>
    </Sider>
  );
};

export default Sidebar;
