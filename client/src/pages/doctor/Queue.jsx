import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, LogOut, AlertOctagon, AlertTriangle, Clock, User, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import api from '../../services/api.js';

function StatusBadge({ status }) {
  const map = { pending: 'bg-warning-100 text-warning-700', in_review: 'bg-primary-100 text-primary-700', signed: 'bg-success-100 text-success-700' };
  return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${map[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
}

function FlagBadge({ level }) {
  if (!level || level === 'none') return <span className="text-gray-300">—</span>;
  return level === 'critical'
    ? <span className="flex items-center gap-1 text-error-600 font-bold text-xs"><AlertOctagon size={14} /> Critical</span>
    : <span className="flex items-center gap-1 text-warning-600 font-bold text-xs"><AlertTriangle size={14} /> Warning</span>;
}

export default function DoctorQueue() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [encounters, setEncounters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Fetching encounters list');
    api.get('/encounters')
      .then(r => {
        console.log('Encounters fetched:', r.data);
        setEncounters(r.data);
      })
      .catch(err => {
        console.error('Error fetching encounters:', err);
        console.error('Error response:', err.response?.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const getChiefComplaint = (enc) => {
    if (!enc.summary_draft_json) return '—';
    try {
      const summary = typeof enc.summary_draft_json === 'object' 
        ? enc.summary_draft_json 
        : JSON.parse(enc.summary_draft_json);
      return summary?.chiefComplaint?.text || '—';
    } catch {
      return '—';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50/20 flex flex-col">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md">
            <Activity size={20} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-gray-800 text-lg leading-tight">MediKiosk</span>
            <span className="text-xs text-gray-500 font-medium block">Doctor Portal</span>
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

      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Patient Queue</h1>
            <p className="text-gray-500">Review and manage patient encounters</p>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border shadow-sm">
            <Clock size={18} className="text-primary-500" />
            <span className="text-sm font-medium text-gray-600">{encounters.length} patients waiting</span>
          </div>
        </div>

        {loading ? <LoadingSpinner /> : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Token', 'Complaint', 'Red Flag', 'Status', 'Time', 'Action'].map(h => (
                    <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {encounters.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                        <Activity size={32} className="text-gray-300" />
                      </div>
                      <p className="text-gray-400 font-medium">No encounters yet</p>
                      <p className="text-xs text-gray-300">Encounters will appear here after patients complete the kiosk flow</p>
                    </div>
                  </td></tr>
                )}
                {encounters.map(enc => (
                  <tr key={enc.id} className={`hover:bg-gray-50 transition-colors ${enc.red_flag_level === 'critical' ? 'bg-error-50' : enc.red_flag_level === 'warning' ? 'bg-warning-50' : ''}`}>
                    <td className="px-6 py-4 font-bold text-gray-800">{enc.token_no}</td>
                    <td className="px-6 py-4 text-gray-700">{getChiefComplaint(enc)}</td>
                    <td className="px-6 py-4"><FlagBadge level={enc.red_flag_level} /></td>
                    <td className="px-6 py-4"><StatusBadge status={enc.status} /></td>
                    <td className="px-6 py-4 text-gray-500 text-sm flex items-center gap-1">
                      <Clock size={12} /> {new Date(enc.created_at).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => navigate(`/doctor/encounter/${enc.id}`)}
                        className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg text-sm font-medium hover:from-primary-600 hover:to-primary-700 shadow-md shadow-primary-200 transition-all">
                        Review
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
