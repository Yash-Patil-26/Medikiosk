import { useNavigate } from 'react-router-dom';
import { Activity, FileText, Shield, Trash2, User, ArrowRight, LogOut } from 'lucide-react';

export default function PatientDashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50/20 flex flex-col">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md">
            <Activity size={20} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-gray-800 text-lg leading-tight">MediKiosk</span>
            <span className="text-xs text-gray-500 font-medium block">Patient Portal</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
              <User size={16} className="text-primary-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Patient</span>
          </div>
          <button onClick={() => navigate('/')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Records</h1>
          <p className="text-gray-500">View your encounter history and manage your consent preferences</p>
        </div>

        <div className="card p-5 bg-warning-50 border-warning-200 mb-8">
          <div className="flex items-start gap-3">
            <Shield size={20} className="text-warning-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-warning-800">Demo Environment</p>
              <p className="text-sm text-warning-700 mt-1">This dashboard shows demo/synthetic records only. No real patient data is stored.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-6 card-hover">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center mb-4">
              <FileText size={28} className="text-primary-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Recent Encounters</h2>
            <p className="text-gray-500 text-sm mb-4">
              Your encounter summaries will appear here after your doctor signs off.
              This is a demo — no real records are stored.
            </p>
            <button onClick={() => navigate('/kiosk/identify')}
              className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-3 rounded-xl font-medium shadow-md shadow-primary-200 transition-all flex items-center justify-center gap-2">
              Start New Session
              <ArrowRight size={18} />
            </button>
          </div>

          <div className="card p-6 card-hover">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-success-100 to-success-200 flex items-center justify-center mb-4">
              <Shield size={28} className="text-success-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Consent Management</h2>
            <p className="text-gray-500 text-sm mb-4">
              You can revoke any consent at any time. Revocation creates a new record — previous records are not modified.
            </p>
            <button className="w-full bg-white border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:border-primary-300 hover:text-primary-600 transition-all">
              View Consent History
            </button>
          </div>

          <div className="card p-6 card-hover md:col-span-2">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-error-100 to-error-200 flex items-center justify-center flex-shrink-0">
                <Trash2 size={28} className="text-error-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-800 mb-2">Delete My Demo Data</h2>
                <p className="text-gray-500 text-sm mb-4">
                  Remove all synthetic demo records associated with this session. This action cannot be undone.
                </p>
                <button className="px-6 py-3 bg-error-50 border border-error-200 text-error-600 rounded-xl font-medium hover:bg-error-100 transition-colors">
                  Delete Demo Data
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="text-center text-xs text-gray-400 py-4 px-6 border-t border-gray-200/50 bg-white/50 backdrop-blur-sm">
        MediKiosk is a student project prototype using synthetic data only. Not a medical device.
      </footer>
    </div>
  );
}
