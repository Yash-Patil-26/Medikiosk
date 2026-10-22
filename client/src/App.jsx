import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { KioskProvider } from './context/KioskContext.jsx';

import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';

import KioskIdentify from './pages/kiosk/Identify.jsx';
import KioskConsent from './pages/kiosk/Consent.jsx';
import KioskComplaint from './pages/kiosk/Complaint.jsx';
import KioskInterview from './pages/kiosk/Interview.jsx';
import KioskDocuments from './pages/kiosk/Documents.jsx';
import KioskReview from './pages/kiosk/Review.jsx';
import KioskDone from './pages/kiosk/Done.jsx';

import DoctorQueue from './pages/doctor/Queue.jsx';
import DoctorEncounter from './pages/doctor/Encounter.jsx';

import Triage from './pages/Triage.jsx';
import HIS from './pages/HIS.jsx';
import AuditLogs from './pages/admin/AuditLogs.jsx';
import PurgeProof from './pages/admin/PurgeProof.jsx';
import PatientDashboard from './pages/PatientDashboard.jsx';

// Must be rendered inside AuthProvider
function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}
import DemoBanner from './components/DemoBanner.jsx';

function AppRoutes() {
  return (
    <>
      <DemoBanner />
      <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />

      <Route path="/kiosk/identify" element={<KioskIdentify />} />
      <Route path="/kiosk/consent" element={<KioskConsent />} />
      <Route path="/kiosk/complaint" element={<KioskComplaint />} />
      <Route path="/kiosk/interview" element={<KioskInterview />} />
      <Route path="/kiosk/documents" element={<KioskDocuments />} />
      <Route path="/kiosk/review" element={<KioskReview />} />
      <Route path="/kiosk/done" element={<KioskDone />} />

      <Route path="/doctor" element={<ProtectedRoute roles={['doctor']}><DoctorQueue /></ProtectedRoute>} />
      <Route path="/doctor/encounter/:id" element={<ProtectedRoute roles={['doctor']}><DoctorEncounter /></ProtectedRoute>} />

      <Route path="/triage" element={<ProtectedRoute roles={['triage', 'doctor']}><Triage /></ProtectedRoute>} />
      <Route path="/his" element={<ProtectedRoute roles={['doctor', 'admin']}><HIS /></ProtectedRoute>} />

      <Route path="/admin/audit" element={<ProtectedRoute roles={['admin']}><AuditLogs /></ProtectedRoute>} />
      <Route path="/admin/purge-proof" element={<ProtectedRoute roles={['admin', 'doctor']}><PurgeProof /></ProtectedRoute>} />

      <Route path="/me" element={<PatientDashboard />} />
    </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <KioskProvider>
          <AppRoutes />
        </KioskProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
