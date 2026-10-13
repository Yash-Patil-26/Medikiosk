import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, LogOut, AlertOctagon, AlertTriangle, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import DemoBanner from '../../components/DemoBanner.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import api from '../../services/api.js';

function StatusBadge({ status }) {
  const map = { pending: 'bg-yellow-100 text-yellow-700', in_review: 'bg-blue-100 text-blue-700', signed: 'bg-teal-100 text-teal-700' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
}

function FlagBadge({ level }) {
  if (!level || level === 'none') return <span className="text-gray-300">—</span>;
  return level === 'critical'
    ? <span className="flex items-center gap-1 text-red-600 font-bold text-xs"><AlertOctagon size={14} /> Critical</span>
    : <span className="flex items-center gap-1 text-amber-600 font-bold text-xs"><AlertTriangle size={14} /> Warning</span>;
}

export default function DoctorQueue() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [encounters, setEncounters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/encounters').then(r => setEncounters(r.data)).finally(() => setLoading(false));
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
          <span className="text-gray-600 font-medium">Doctor Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.display_name}</span>
          <button onClick={handleLogout} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Patient Queue</h1>

        {loading ? <LoadingSpinner /> : (
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Token', 'Complaint', 'Red Flag', 'Status', 'Time', 'Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {encounters.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No encounters yet</td></tr>
                )}
                {encounters.map(enc => (
                  <tr key={enc.id} className={`hover:bg-gray-50 ${enc.red_flag_level === 'critical' ? 'bg-red-50' : enc.red_flag_level === 'warning' ? 'bg-amber-50' : ''}`}>
                    <td className="px-4 py-3 font-bold text-gray-800">{enc.token_no}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {enc.summary_draft_json
                        ? (typeof enc.summary_draft_json === 'object'
                            ? enc.summary_draft_json?.chiefComplaint?.text
                            : JSON.parse(enc.summary_draft_json)?.chiefComplaint?.text) || '—'
                        : '—'}
                    </td>
                    <td className="px-4 py-3"><FlagBadge level={enc.red_flag_level} /></td>
                    <td className="px-4 py-3"><StatusBadge status={enc.status} /></td>
                    <td className="px-4 py-3 text-gray-400 flex items-center gap-1">
                      <Clock size={12} /> {new Date(enc.created_at).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => navigate(`/doctor/encounter/${enc.id}`)}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
                        Open
                      </button>
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
