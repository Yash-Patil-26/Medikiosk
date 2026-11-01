import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Trash2, Shield, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import UniversalHeader from '../../components/UniversalHeader.jsx';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50/20 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col">
      <UniversalHeader showLogout={true} />

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
            <Trash2 size={24} className="text-primary-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Session Purge Proof</h1>
            <p className="text-gray-500 dark:text-gray-400">Verified records of temporary data deletion</p>
          </div>
        </div>

        <div className="card p-5 bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800 mb-8">
          <div className="flex items-start gap-3">
            <Shield size={20} className="text-success-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-success-800 dark:text-success-200">Privacy Guarantee</p>
              <p className="text-sm text-success-700 dark:text-success-300 mt-1">Each record below confirms that a kiosk session's temporary data was deleted after submission. This ensures patient privacy compliance.</p>
            </div>
          </div>
        </div>

        {loading ? <LoadingSpinner /> : (
          <div className="space-y-4">
            {records.length === 0 && (
              <div className="card p-12 text-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={40} className="text-gray-300" />
                </div>
                <p className="text-gray-400 font-medium text-lg">No purge records yet</p>
                <p className="text-gray-300 text-sm mt-2">Purge proof records will appear here after patients complete sessions</p>
              </div>
            )}
            {records.map(r => (
              <div key={r.id} className="card p-6 animate-scale-in">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-success-100 to-success-200 flex items-center justify-center">
                    <CheckCircle size={24} className="text-success-600" />
                  </div>
                  <div className="flex-1">
                    <span className="font-bold text-gray-800">Session Purged Successfully</span>
                    <span className="ml-auto text-xs text-gray-400 flex items-center gap-1">
                      <FileText size={12} />
                      {new Date(r.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <p className="text-sm text-gray-600">Session ID: <span className="font-mono text-gray-800">{r.resource_id}</span></p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    'Temporary session deleted',
                    'Transcript removed',
                    'Temporary extraction removed',
                    'Kiosk state cleared'
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-600 p-3 bg-success-50 rounded-xl">
                      <CheckCircle size={16} className="text-success-500 flex-shrink-0" />
                      <span className="font-medium">{item}</span>
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
