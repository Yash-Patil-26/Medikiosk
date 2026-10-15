import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, LogOut, CheckCircle, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import DemoBanner from '../../components/DemoBanner.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import api from '../../services/api.js';

export default function PurgeProof() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/purge-proof').then(r => setRecords(r.data)).finally(() => setLoading(false));
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
          <span className="text-gray-600 font-medium">Admin — Purge Proof</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.display_name}</span>
          <button onClick={handleLogout} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-6">
          <Trash2 size={24} className="text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-800">Session Purge Proof</h1>
        </div>

        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-6 text-sm text-teal-800">
          Each record below confirms that a kiosk session's temporary data was deleted after submission.
        </div>

        {loading ? <LoadingSpinner /> : (
          <div className="flex flex-col gap-4">
            {records.length === 0 && (
              <div className="text-center py-12">
                <CheckCircle size={48} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400">No purge records yet</p>
                <p className="text-xs text-gray-300 mt-1">Purge proof records will appear here after patients complete sessions</p>
              </div>
            )}
            {records.map(r => (
              <div key={r.id} className="bg-white border rounded-2xl p-5 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle size={18} className="text-teal-500" />
                  <span className="font-bold text-gray-800">Session Purged</span>
                  <span className="ml-auto text-xs text-gray-400">{new Date(r.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-600">Session ID: <span className="font-mono">{r.resource_id}</span></p>
                <div className="flex flex-col gap-1 mt-1">
                  {['Temporary session deleted', 'Transcript removed', 'Temporary extraction removed', 'Kiosk state cleared'].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle size={13} className="text-teal-400" /> {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
