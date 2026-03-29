import React, { useEffect, useRef } from 'react';
import { Layout, Space, Avatar, Typography, Badge, notification, Dropdown, MenuProps } from 'antd';
import {
  UserOutlined,
  BellOutlined,
  MoonOutlined,
  SunOutlined,
  DownOutlined,
  FileTextOutlined,
  LogoutOutlined,
  ProfileOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../stores/themeStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { appointmentsApi } from '../../api/appointments.api';
import { Appointment } from '../../types/appointment.types';

const { Header: AntHeader } = Layout;
const { Text } = Typography;

// Track which appointments we've already notified for
const notifiedAppointments = new Set<number>();

const Header: React.FC = () => {
  const { isDarkMode, toggleTheme } = useThemeStore();
  const { isBellEnabled, toggleBell } = useNotificationStore();
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  // User dropdown menu items
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <ProfileOutlined />,
      label: 'Profile',
      onClick: () => {
        navigate('/doctor-profile');
      },
    },
    {
      key: 'reports',
      icon: <FileTextOutlined />,
      label: 'Reports',
      onClick: () => {
        // Navigate to reports page
        window.location.href = '/reports';
      },
    },
    {
      type: 'divider',
    },
    {
      key: 'signout',
      icon: <LogoutOutlined />,
      label: 'Sign Out',
      danger: true,
      onClick: () => {
        // Handle sign out logic
        notification.success({
          message: 'Signed Out',
          description: 'You have been signed out successfully.',
          placement: 'topRight',
        });
        // Redirect to login page or clear auth state
        // window.location.href = '/login';
      },
    },
  ];

  // Check for appointments due in the next 5 minutes
  const checkUpcomingAppointments = async () => {
    try {
      const appointments: Appointment[] = await appointmentsApi.getUpcoming(20);
      const now = new Date();
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

      appointments.forEach((appointment) => {
        const appointmentTime = new Date(appointment.appointment_date);
        const patientName = appointment.patient_name || 'Unknown Patient';
        const formattedTime = appointmentTime.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });

        // Check if appointment is within the next 5 minutes and we haven't notified yet
        if (
          appointmentTime > now &&
          appointmentTime <= fiveMinutesFromNow &&
          !notifiedAppointments.has(appointment.id)
        ) {
          notifiedAppointments.add(appointment.id);
          notification.open({
            message: 'Upcoming Appointment',
            description: `Appointment with ${patientName} due at ${formattedTime}.`,
            icon: <BellOutlined style={{ color: '#0891b2' }} />,
            placement: 'topRight',
            duration: 10,
          });
        }
      });
    } catch (error) {
      console.error('Error checking appointments:', error);
    }
  };

  useEffect(() => {
    if (isBellEnabled) {
      // Check immediately when enabled
      checkUpcomingAppointments();
      // Then check every minute
      checkIntervalRef.current = setInterval(checkUpcomingAppointments, 60000);
    } else {
      // Clear interval when disabled
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      // Clear notified appointments set when disabled
      notifiedAppointments.clear();
    }

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [isBellEnabled]);

  return (
    <AntHeader
      style={{
        padding: '0 24px',
        background: isDarkMode ? '#1e293b' : '#ffffff',
        borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : '#e5e7eb'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 1,
        transition: 'background-color 0.3s ease',
      }}
    >
      <div>
        <Text
          strong
          style={{
            fontSize: 18,
            color: isDarkMode ? '#f1f5f9' : '#1f2937',
          }}
        >
          Clinic Central
        </Text>
      </div>

      <Space size="large">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isDarkMode ? '#f59e0b' : '#4b5563',
            transition: 'color 0.3s ease',
          }}
          title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode ? <SunOutlined style={{ fontSize: 18 }} /> : <MoonOutlined style={{ fontSize: 18 }} />}
        </button>

        {/* Notifications Bell - Toggleable */}
        <Badge count={0} size="small">
          <button
            onClick={toggleBell}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isBellEnabled
                ? '#0891b2'
                : isDarkMode
                  ? '#94a3b8'
                  : '#4b5563',
              transition: 'color 0.3s ease',
            }}
            title={isBellEnabled ? 'Disable appointment notifications' : 'Enable appointment notifications'}
          >
            <BellOutlined
              style={{
                fontSize: 18,
              }}
            />
          </button>
        </Badge>

        {/* User Profile Dropdown */}
        <Dropdown
          menu={{ items: userMenuItems }}
          placement="bottomRight"
          arrow={{ pointAtCenter: true }}
          trigger={['click']}
        >
          <Space style={{ cursor: 'pointer' }}>
            <Avatar
              icon={<UserOutlined />}
              style={{
                backgroundColor: '#0891b2',
              }}
            />
            <Text
              style={{
                color: isDarkMode ? '#f1f5f9' : '#1f2937',
                display: window.innerWidth < 768 ? 'none' : 'block',
              }}
            >
              Doctor
            </Text>
            <DownOutlined
              style={{
                fontSize: 12,
                color: isDarkMode ? '#94a3b8' : '#6b7280',
                marginLeft: 4,
              }}
            />
          </Space>
        </Dropdown>
      </Space>
    </AntHeader>
  );
};

export default Header;
