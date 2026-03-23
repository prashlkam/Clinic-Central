import React, { useEffect, useState } from 'react';
import { Spin } from 'antd';
import { doctorApi } from '../../api/doctor.api';
import RegisterDialog from './RegisterDialog';
import LoginDialog from './LoginDialog';

interface AuthGateProps {
  children: React.ReactNode;
}

const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const [checking, setChecking] = useState(true);
  const [registered, setRegistered] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [doctorName, setDoctorName] = useState('');

  useEffect(() => {
    doctorApi.isRegistered().then(async (isReg: boolean) => {
      setRegistered(isReg);
      if (isReg) {
        const profile = await doctorApi.getProfile();
        setDoctorName(profile?.name || 'Doctor');
      }
      setChecking(false);
    });
  }, []);

  if (checking) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (authenticated) {
    return <>{children}</>;
  }

  if (!registered) {
    return (
      <RegisterDialog
        open={true}
        onSuccess={() => {
          setRegistered(true);
          setAuthenticated(true);
        }}
      />
    );
  }

  return (
    <LoginDialog
      open={true}
      doctorName={doctorName}
      onSuccess={() => setAuthenticated(true)}
    />
  );
};

export default AuthGate;
