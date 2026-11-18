import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Database, Server, CheckCircle, XCircle, AlertTriangle, RefreshCw, Cpu, HardDrive, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import UniversalHeader from '../../components/UniversalHeader.jsx';
import api from '../../services/api.js';

export default function SystemMonitoring() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    loadHealthData();
    const interval = setInterval(loadHealthData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadHealthData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/system-health');
      setHealthData(response.data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle size={24} className="text-green-600" />;
      case 'warning':
        return <AlertTriangle size={24} className="text-yellow-600" />;
      case 'error':
        return <XCircle size={24} className="text-red-600" />;
      default:
        return <Activity size={24} className="text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'from-green-500 to-green-600';
      case 'warning':
        return 'from-yellow-500 to-yellow-600';
      case 'error':
        return 'from-red-500 to-red-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getStatusBgColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 dark:bg-green-900/30';
      case 'warning':
        return 'bg-yellow-100 dark:bg-yellow-900/30';
      case 'error':
        return 'bg-red-100 dark:bg-red-900/30';
      default:
        return 'bg-gray-100 dark:bg-gray-700';
    }
  };

  if (loading && !healthData) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50/20 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col">
      <UniversalHeader showLogout={true} />

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              System Monitoring
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Real-time system health and performance metrics
            </p>
          </div>
          <div className="flex items-center gap-4">
            {lastUpdate && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </p>
            )}
            <button
              onClick={loadHealthData}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            >
              <RefreshCw size={18} />
              Refresh
            </button>
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-medium hover:from-primary-600 hover:to-primary-700 shadow-md shadow-primary-200 transition-all"
            >
              <Activity size={18} />
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* System Status Overview */}
        {healthData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl ${getStatusBgColor(healthData.database?.status)} flex items-center justify-center`}>
                    <Database size={24} className="text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Database</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">MySQL Connection</p>
                  </div>
                </div>
                {getStatusIcon(healthData.database?.status)}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Status:</span>
                  <span className={`font-medium ${healthData.database?.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
                    {healthData.database?.status || 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Response Time:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {healthData.database?.response_time || 'N/A'}ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Connections:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {healthData.database?.active_connections || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl ${getStatusBgColor(healthData.api?.status)} flex items-center justify-center`}>
                    <Server size={24} className="text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">API Server</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Backend Service</p>
                  </div>
                </div>
                {getStatusIcon(healthData.api?.status)}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Status:</span>
                  <span className={`font-medium ${healthData.api?.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
                    {healthData.api?.status || 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Uptime:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {healthData.api?.uptime || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Version:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {healthData.api?.version || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl ${getStatusBgColor(healthData.memory?.status)} flex items-center justify-center`}>
                    <Cpu size={24} className="text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Memory</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">System Memory</p>
                  </div>
                </div>
                {getStatusIcon(healthData.memory?.status)}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Used:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {healthData.memory?.used || 'N/A'} MB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Total:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {healthData.memory?.total || 'N/A'} MB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Usage:</span>
                  <span className={`font-medium ${healthData.memory?.usage_percentage > 80 ? 'text-red-600' : 'text-green-600'}`}>
                    {healthData.memory?.usage_percentage || 'N/A'}%
                  </span>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl ${getStatusBgColor(healthData.disk?.status)} flex items-center justify-center`}>
                    <HardDrive size={24} className="text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Disk</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Storage</p>
                  </div>
                </div>
                {getStatusIcon(healthData.disk?.status)}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Used:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {healthData.disk?.used || 'N/A'} GB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Total:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {healthData.disk?.total || 'N/A'} GB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Usage:</span>
                  <span className={`font-medium ${healthData.disk?.usage_percentage > 80 ? 'text-red-600' : 'text-green-600'}`}>
                    {healthData.disk?.usage_percentage || 'N/A'}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Performance Metrics */}
        {healthData && (
          <div className="card p-6 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                <Zap size={20} className="text-primary-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Performance Metrics
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {healthData.performance?.avg_response_time || 'N/A'}ms
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Avg Response Time</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {healthData.performance?.requests_per_minute || 'N/A'}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Requests/Min</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {healthData.performance?.error_rate || 'N/A'}%
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Error Rate</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {healthData.performance?.active_sessions || 'N/A'}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Active Sessions</div>
              </div>
            </div>
          </div>
        )}

        {/* System Information */}
        {healthData && (
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <Server size={20} className="text-gray-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                System Information
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Server Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Node.js Version:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {healthData.system?.node_version || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Platform:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {healthData.system?.platform || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Architecture:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {healthData.system?.arch || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Application</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Version:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {healthData.application?.version || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Environment:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {healthData.application?.environment || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Mode:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {healthData.application?.mode || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Database</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Type:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      MySQL
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Host:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {healthData.database?.host || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Database:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {healthData.database?.database || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
