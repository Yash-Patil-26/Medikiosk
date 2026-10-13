import { useNavigate } from 'react-router-dom';
import { Activity, FileText, Shield, Trash2 } from 'lucide-react';
import DemoBanner from '../components/DemoBanner.jsx';

export default function PatientDashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DemoBanner />
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={24} className="text-blue-600" />
          <span className="font-bold text-blue-700 text-lg">MediKiosk</span>
          <span className="text-gray-400 mx-2">|</span>
          <span className="text-gray-600 font-medium">My Records</span>
        </div>
        <button onClick={() => navigate('/')} className="text-sm text-gray-500 hover:text-gray-700">← Home</button>
      </header>

      <main className="flex-1 p-6 max-w-3xl mx-auto w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">My Records</h1>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 text-sm text-amber-800">
          This dashboard shows demo/synthetic records only. No real patient data is stored.
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="bg-white border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={20} className="text-blue-600" />
              <h2 className="font-bold text-gray-800">Recent Encounters</h2>
            </div>
            <p className="text-gray-400 text-sm">
              Your encounter summaries will appear here after your doctor signs off.
              This is a demo — no real records are stored.
            </p>
            <button onClick={() => navigate('/kiosk/identify')}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              Start New Kiosk Session
            </button>
          </div>

          <div className="bg-white border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={20} className="text-blue-600" />
              <h2 className="font-bold text-gray-800">Consent Management</h2>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              You can revoke any consent at any time. Revocation creates a new record — previous records are not modified.
            </p>
            <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              View Consent History
            </button>
          </div>

          <div className="bg-white border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Trash2 size={20} className="text-red-500" />
              <h2 className="font-bold text-gray-800">Delete My Demo Data</h2>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              Remove all synthetic demo records associated with this session.
            </p>
            <button className="px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100">
              Delete Demo Data
            </button>
          </div>
        </div>
      </main>

      <footer className="text-center text-xs text-gray-400 py-3 px-4">
        MediKiosk is a student project prototype using synthetic data only. Not a medical device.
      </footer>
    </div>
  );
}
