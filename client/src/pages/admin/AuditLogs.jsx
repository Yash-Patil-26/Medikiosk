import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, LogOut, User, Clock, Shield, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import api from '../../services/api.js';

export default function AuditLogs() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/audit').then(r => setLogs(r.data)).finally(() => setLoading(false));
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
            <span className="text-xs text-gray-500 font-medium block">Admin — Audit Logs</span>
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

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Audit Logs</h1>
            <p className="text-gray-500">Complete system activity trail</p>
          </div>
          <button onClick={() => navigate('/admin/purge-proof')}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-medium hover:from-primary-600 hover:to-primary-700 shadow-md shadow-primary-200 transition-all">
            <Shield size={18} />
            View Purge Proof
          </button>
        </div>

        {loading ? <LoadingSpinner /> : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Time', 'Actor', 'Role', 'Action', 'Resource', 'Resource ID'].map(h => (
                    <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                        <FileText size={32} className="text-gray-300" />
                      </div>
                      <p className="text-gray-400 font-medium">No audit logs yet</p>
                      <p className="text-xs text-gray-300">Audit logs will appear here as users interact with the system</p>
                    </div>
                  </td></tr>
                )}
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap flex items-center gap-2">
                      <Clock size={14} className="text-gray-400" />
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-medium">{log.actor_id}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary-100 text-primary-700">{log.actor_role}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-700 bg-gray-50 rounded-lg px-3 py-1">{log.action}</td>
                    <td className="px-6 py-4 text-gray-600">{log.resource_type}</td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">{log.resource_id}</td>
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
