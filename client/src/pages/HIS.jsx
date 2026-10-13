import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, LogOut, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import DemoBanner from '../components/DemoBanner.jsx';
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DemoBanner />
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={24} className="text-blue-600" />
          <span className="font-bold text-blue-700 text-lg">MediKiosk</span>
          <span className="text-gray-400 mx-2">|</span>
          <Building2 size={18} className="text-gray-500" />
          <span className="text-gray-600 font-medium">Mock HIS Viewer</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.display_name}</span>
          <button onClick={handleLogout} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 text-sm text-amber-800">
          <strong>MOCK Integration</strong> — This is a simulated Hospital Information System. Not connected to any real HIS or ABDM.
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-6">Received FHIR Bundles</h1>

        {loading ? <LoadingSpinner /> : (
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['HIS Record ID', 'Encounter ID', 'Received At', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {records.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No records received yet</td></tr>
                )}
                {records.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-gray-700">HIS-{r.id}</td>
                    <td className="px-4 py-3 text-gray-600">ENC-{r.encounter_id}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(r.received_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-xs font-medium">
                        FHIR Bundle received successfully
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
