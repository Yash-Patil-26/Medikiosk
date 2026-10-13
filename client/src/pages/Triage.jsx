import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, LogOut, AlertOctagon, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import DemoBanner from '../components/DemoBanner.jsx';
import api from '../services/api.js';

function AlertCard({ alert, onAck }) {
  const isCritical = alert.level === 'critical';
  return (
    <div className={`rounded-2xl border p-4 flex flex-col gap-3 ${isCritical ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isCritical ? <AlertOctagon size={20} className="text-red-600" /> : <AlertTriangle size={20} className="text-amber-600" />}
          <span className={`font-bold text-sm ${isCritical ? 'text-red-700' : 'text-amber-700'}`}>
            {isCritical ? 'CRITICAL' : 'WARNING'}
          </span>
        </div>
        <span className="text-xs text-gray-400">{new Date(alert.created_at).toLocaleTimeString()}</span>
      </div>
      <p className="text-sm text-gray-700">{alert.reason}</p>
      {alert.token_no && <p className="text-xs text-gray-500">Token: {alert.token_no}</p>}
      <div className="flex gap-2">
        {!alert.acknowledged_at ? (
          <button onClick={() => onAck(alert.id)}
            className="flex items-center gap-1 px-3 py-1.5 bg-white border rounded-lg text-sm font-medium hover:bg-gray-50">
            <CheckCircle size={14} /> Acknowledge
          </button>
        ) : (
          <span className="text-xs text-teal-600 flex items-center gap-1"><CheckCircle size={12} /> Acknowledged</span>
        )}
      </div>
    </div>
  );
}

export default function Triage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
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
    await api.post(`/triage/alerts/${id}/acknowledge`);
    fetchAlerts();
  };

  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DemoBanner />
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={24} className="text-blue-600" />
          <span className="font-bold text-blue-700 text-lg">MediKiosk</span>
          <span className="text-gray-400 mx-2">|</span>
          <span className="text-gray-600 font-medium">Triage Console</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.display_name}</span>
          <button onClick={handleLogout} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-3xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Red Flag Alerts</h1>
          <span className="text-xs text-gray-400 animate-pulse">● Live — polling every 2s</span>
        </div>

        {alerts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <CheckCircle size={48} className="mx-auto mb-3 text-teal-300" />
            <p>No active alerts</p>
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
