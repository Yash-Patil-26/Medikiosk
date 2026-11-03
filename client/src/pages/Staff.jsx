import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertOctagon, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import UniversalHeader from '../components/UniversalHeader.jsx';
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
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
            <CheckCircle size={14} /> Acknowledge
          </button>
        ) : (
          <span className="text-xs text-success-600 flex items-center gap-1 font-medium"><CheckCircle size={12} /> Acknowledged</span>
        )}
      </div>
    </div>
  );
}

export default function Staff() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [actionError, setActionError] = useState('');
  const intervalRef = useRef(null);

  const fetchAlerts = () => {
    api.get('/staff/alerts').then(r => setAlerts(r.data)).catch(() => {});
  };

  useEffect(() => {
    fetchAlerts();
    intervalRef.current = setInterval(fetchAlerts, 2000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const ack = async (id) => {
    setActionError('');

    try {
      await api.post(`/staff/alerts/${id}/acknowledge`);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50/20 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col">
      <UniversalHeader showLogout={true} />

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Red Flag Alerts</h1>
            <p className="text-gray-500 dark:text-gray-400">Monitor and respond to critical patient indicators</p>
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
            <Clock size={18} className="text-primary-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Live polling</span>
          </div>
        </div>

        {actionError && (
          <p role="alert" className="mb-4 rounded-xl border border-error-200 dark:border-error-800 bg-error-50 dark:bg-error-900/20 p-4 text-sm text-error-700 dark:text-error-400 flex items-center gap-2">
            <AlertTriangle size={16} />
            {actionError}
          </p>
        )}

        {alerts.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-success-100 to-success-200 dark:from-success-900/30 dark:to-success-800/30 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-success-200">
              <CheckCircle size={40} className="text-success-600" />
            </div>
            <p className="text-gray-400 dark:text-gray-500 font-medium text-lg">No alerts</p>
            <p className="text-gray-300 dark:text-gray-600 text-sm mt-2">All systems normal</p>
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
