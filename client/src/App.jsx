import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { KioskProvider, useKiosk } from './context/KioskContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';

import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ConsentPreferences from './pages/ConsentPreferences.jsx';
import KioskComplaint from './pages/kiosk/Complaint.jsx';
import KioskInterview from './pages/kiosk/Interview.jsx';
import KioskDocuments from './pages/kiosk/Documents.jsx';
import KioskReview from './pages/kiosk/Review.jsx';
import KioskDone from './pages/kiosk/Done.jsx';

import DoctorQueue from './pages/doctor/Queue.jsx';
import DoctorEncounter from './pages/doctor/Encounter.jsx';
import Staff from './pages/Staff.jsx';
import HIS from './pages/HIS.jsx';
import AuditLogs from './pages/admin/AuditLogs.jsx';
import PurgeProof from './pages/admin/PurgeProof.jsx';
import PatientDashboard from './pages/PatientDashboard.jsx';

function ProtectedRoute({ children, roles, allowIncompleteConsent = false, requireSession = false }) {
  const { user } = useAuth();
  const { kiosk } = useKiosk();

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  if (user.role === 'patient' && !user.hasConsentSetup && !allowIncompleteConsent) {
    return <Navigate to="/register/consent" replace />;
  }
  if (requireSession && !kiosk.sessionId) return <Navigate to="/me" replace />;
  return children;
}

function PatientConsentRoute() {
  const { user } = useAuth();
  if (user?.hasConsentSetup) return <Navigate to="/me" replace />;
  return (
    <ProtectedRoute roles={['patient']} allowIncompleteConsent>
      <ConsentPreferences mode="initial" />
    </ProtectedRoute>
  );
}

function PatientSettingsRoute() {
  return (
    <ProtectedRoute roles={['patient']}>
      <ConsentPreferences mode="manage" />
    </ProtectedRoute>
  );
}

function PatientIntakeRoute({ children }) {
  return (
    <ProtectedRoute roles={['patient']} requireSession>
      {children}
    </ProtectedRoute>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/register/consent" element={<PatientConsentRoute />} />
      <Route path="/me" element={<ProtectedRoute roles={['patient']}><PatientDashboard /></ProtectedRoute>} />
      <Route path="/me/consent" element={<PatientSettingsRoute />} />

      <Route path="/kiosk/complaint" element={<PatientIntakeRoute><KioskComplaint /></PatientIntakeRoute>} />
      <Route path="/kiosk/interview" element={<PatientIntakeRoute><KioskInterview /></PatientIntakeRoute>} />
      <Route path="/kiosk/documents" element={<PatientIntakeRoute><KioskDocuments /></PatientIntakeRoute>} />
      <Route path="/kiosk/review" element={<PatientIntakeRoute><KioskReview /></PatientIntakeRoute>} />
      <Route path="/kiosk/done" element={<ProtectedRoute roles={['patient']}><KioskDone /></ProtectedRoute>} />

      <Route path="/doctor" element={<ProtectedRoute roles={['doctor']}><DoctorQueue /></ProtectedRoute>} />
      <Route path="/doctor/encounter/:id" element={<ProtectedRoute roles={['doctor']}><DoctorEncounter /></ProtectedRoute>} />
      <Route path="/staff" element={<ProtectedRoute roles={['staff', 'doctor']}><Staff /></ProtectedRoute>} />
      <Route path="/his" element={<ProtectedRoute roles={['doctor', 'admin']}><HIS /></ProtectedRoute>} />
      <Route path="/admin/audit" element={<ProtectedRoute roles={['admin']}><AuditLogs /></ProtectedRoute>} />
      <Route path="/admin/purge-proof" element={<ProtectedRoute roles={['admin', 'doctor']}><PurgeProof /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <KioskProvider>
            <AppRoutes />
          </KioskProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
