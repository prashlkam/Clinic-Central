import React from 'react';
import { Layout, Menu } from 'antd';
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
} from '@ant-design/icons';

const { Sider } = Layout;

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onCollapse }) => {
  const navigate = useNavigate();
  const location = useLocation();

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
      theme="dark"
    >
      <div className="sidebar-logo">
        <h2>{collapsed ? 'CC' : 'Clinic Central'}</h2>
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[getSelectedKey()]}
        defaultOpenKeys={['finance']}
        items={menuItems}
        onClick={({ key }) => {
          if (key !== 'finance') navigate(key);
        }}
      />
    </Sider>
  );
};

export default Sidebar;
