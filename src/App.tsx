import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { theme } from './styles/theme';
import AppShell from './components/Layout/AppShell';
import DashboardPage from './pages/Dashboard/DashboardPage';
import PatientListPage from './pages/Patients/PatientListPage';
import PatientDetailPage from './pages/Patients/PatientDetailPage';
import TreatmentListPage from './pages/Treatments/TreatmentListPage';
import AppointmentListPage from './pages/Appointments/AppointmentListPage';
import TransactionListPage from './pages/Finance/TransactionListPage';
import InvoicePage from './pages/Finance/InvoicePage';
import InvoiceFormPage from './pages/Finance/InvoiceFormPage';
import InvoiceDetailPage from './pages/Finance/InvoiceDetailPage';
import ExpensePage from './pages/Finance/ExpensePage';
import ReportsPage from './pages/Finance/ReportsPage';
import SettingsPage from './pages/Settings/SettingsPage';
import DoctorProfilePage from './pages/Doctor/DoctorProfilePage';
import AuthGate from './components/Auth/AuthGate';

const App: React.FC = () => {
  return (
    <ConfigProvider theme={theme}>
      <AuthGate>
        <HashRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/patients" element={<PatientListPage />} />
              <Route path="/patients/:id" element={<PatientDetailPage />} />
              <Route path="/treatments" element={<TreatmentListPage />} />
              <Route path="/appointments" element={<AppointmentListPage />} />
              <Route path="/transactions" element={<TransactionListPage />} />
              <Route path="/invoices" element={<InvoicePage />} />
              <Route path="/invoices/new" element={<InvoiceFormPage />} />
              <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
              <Route path="/expenses" element={<ExpensePage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/doctor-profile" element={<DoctorProfilePage />} />
            </Route>
          </Routes>
        </HashRouter>
      </AuthGate>
    </ConfigProvider>
  );
};

export default App;
