import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, LogOut, AlertOctagon, AlertTriangle, CheckCircle, User, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import DemoBanner from '../components/DemoBanner.jsx';
import api from '../services/api.js';

function AlertCard({ alert, onAck }) {
  const isCritical = alert.level === 'critical';
  return (
    <div className={`card p-5 flex flex-col gap-3 ${
      isCritical ? 'border-error-300 bg-error-50' : 'border-warning-300 bg-warning-50'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isCritical ? (
            <div className="w-10 h-10 rounded-xl bg-error-100 flex items-center justify-center">
              <AlertOctagon size={20} className="text-error-600" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-warning-100 flex items-center justify-center">
              <AlertTriangle size={20} className="text-warning-600" />
            </div>
          )}
          <span className={`font-bold text-sm ${
            isCritical ? 'text-error-700' : 'text-warning-700'
          }`}>
            {isCritical ? 'CRITICAL' : 'WARNING'}
          </span>
        </div>
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <Clock size={12} />
          {new Date(alert.created_at).toLocaleTimeString()}
        </span>
      </div>
      <p className="text-sm text-gray-700 font-medium">{alert.reason}</p>
      {alert.token_no && <p className="text-xs text-gray-500">Token: {alert.token_no}</p>}
      <div className="flex gap-2">
        {!alert.acknowledged_at ? (
          <button onClick={() => onAck(alert.id)}
            className="flex items-center gap-2 px-4 py-2 bg-white border rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
            <CheckCircle size={14} /> Acknowledge
          </button>
        ) : (
          <span className="text-xs text-success-600 flex items-center gap-1 font-medium"><CheckCircle size={12} /> Acknowledged</span>
        )}
      </div>
    </div>
  );
}

export default function Triage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [actionError, setActionError] = useState('');
  const intervalRef = useRef(null);

  const fetchAlerts = () => {
    api.get('/triage/alerts').then(r => setAlerts(r.data)).catch(() => {});
  };

  useEffect(() => {
    fetchAlerts();
    intervalRef.current = setInterval(fetchAlerts, 2000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const ack = async (id) => {
    setActionError('');

    try {
      await api.post(`/triage/alerts/${id}/acknowledge`);
    } catch (error) {
      setActionError(
        error.response?.data?.error || 'Could not acknowledge the alert. Please retry.'
      );
    } finally {
      fetchAlerts();
    }
  };

  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50/20 flex flex-col">
      <DemoBanner />
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md">
            <Activity size={20} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-gray-800 text-lg leading-tight">MediKiosk</span>
            <span className="text-xs text-gray-500 font-medium block">Triage Console</span>
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

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Red Flag Alerts</h1>
            <p className="text-gray-500">Monitor and respond to critical patient indicators</p>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border shadow-sm">
            <Clock size={18} className="text-primary-500" />
            <span className="text-sm font-medium text-gray-600">Live polling</span>
          </div>
        </div>

        {actionError && (
          <p role="alert" className="mb-4 rounded-xl border border-error-200 bg-error-50 p-4 text-sm text-error-700 flex items-center gap-2">
            <AlertTriangle size={16} />
            {actionError}
          </p>
        )}

        {alerts.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-success-100 to-success-200 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-success-200">
              <CheckCircle size={40} className="text-success-600" />
            </div>
            <p className="text-gray-400 font-medium text-lg">No alerts</p>
            <p className="text-gray-300 text-sm mt-2">All systems normal</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {alerts.map(a => <AlertCard key={a.id} alert={a} onAck={ack} />)}
          </div>
        )}
      </main>
    </div>
  );
}
