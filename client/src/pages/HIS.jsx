import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, LogOut, Building2, User, FileText, CheckCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import api from '../services/api.js';

export default function HIS() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/his/records').then(r => setRecords(r.data)).finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50/20 flex flex-col">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md">
            <Activity size={20} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-gray-800 text-lg leading-tight">MediKiosk</span>
            <span className="text-xs text-gray-500 font-medium block">Mock HIS Viewer</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
              <User size={16} className="text-primary-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">{user?.display_name}</span>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
            <Building2 size={24} className="text-primary-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Hospital Information System</h1>
            <p className="text-gray-500">View received FHIR bundles from MediKiosk</p>
          </div>
        </div>

        <div className="card p-5 bg-warning-50 border-warning-200 mb-8">
          <div className="flex items-start gap-3">
            <Building2 size={20} className="text-warning-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-warning-800">MOCK Integration</p>
              <p className="text-sm text-warning-700 mt-1">This is a simulated Hospital Information System. Not connected to any real HIS or ABDM.</p>
            </div>
          </div>
        </div>

        {loading ? <LoadingSpinner /> : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['HIS Record ID', 'Encounter ID', 'Received At', 'Status'].map(h => (
                    <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                        <FileText size={32} className="text-gray-300" />
                      </div>
                      <p className="text-gray-400 font-medium">No records received yet</p>
                      <p className="text-xs text-gray-300">FHIR bundles will appear here after encounters are signed</p>
                    </div>
                  </td></tr>
                )}
                {records.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-gray-700 bg-gray-100 px-3 py-1 rounded-lg">HIS-{r.id}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">ENC-{r.encounter_id}</td>
                    <td className="px-6 py-4 text-gray-500">{new Date(r.received_at).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-success-50 text-success-700 rounded-xl text-sm font-medium border border-success-200">
                        <CheckCircle size={14} />
                        FHIR Bundle received
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
