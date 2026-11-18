import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, PieChart, TrendingUp, Users, Activity, Clock, CheckCircle, Download, Calendar, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import UniversalHeader from '../../components/UniversalHeader.jsx';
import api from '../../services/api.js';

export default function ReportsAnalytics() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('month');

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/analytics?date_range=${dateRange}`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading && !analytics) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50/20 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col">
      <UniversalHeader showLogout={true} />

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Reports & Analytics
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              System usage statistics and performance metrics
            </p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-gray-100"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
            <button
              onClick={loadAnalytics}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            >
              <RefreshCw size={18} />
              Refresh
            </button>
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-medium hover:from-primary-600 hover:to-primary-700 shadow-md shadow-primary-200 transition-all"
            >
              <BarChart3 size={18} />
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users size={24} className="text-blue-600 dark:text-blue-400" />
              </div>
              <TrendingUp size={20} className="text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              {analytics?.total_patients || 0}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Patients</p>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Activity size={24} className="text-green-600 dark:text-green-400" />
              </div>
              <TrendingUp size={20} className="text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              {analytics?.total_sessions || 0}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Sessions</p>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <CheckCircle size={24} className="text-purple-600 dark:text-purple-400" />
              </div>
              <TrendingUp size={20} className="text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              {analytics?.total_encounters || 0}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Encounters Completed</p>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Clock size={24} className="text-orange-600 dark:text-orange-400" />
              </div>
              <TrendingUp size={20} className="text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              {analytics?.avg_session_duration || '0'}m
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Avg Session Duration</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Language Distribution */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                <PieChart size={20} className="text-primary-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Language Distribution
              </h2>
            </div>
            <div className="space-y-4">
              {analytics?.language_distribution?.map((lang, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {lang.language.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {lang.count} ({lang.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-primary-500 h-2 rounded-full transition-all"
                        style={{ width: `${lang.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              )) || (
                <p className="text-gray-400 text-center py-4">No language data available</p>
              )}
            </div>
          </div>

          {/* Encounter Status */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                <BarChart3 size={20} className="text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Encounter Status
              </h2>
            </div>
            <div className="space-y-4">
              {analytics?.encounter_status?.map((status, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                        {status.status}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {status.count} ({status.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          status.status === 'signed' ? 'bg-green-500' :
                          status.status === 'final' ? 'bg-blue-500' :
                          status.status === 'draft' ? 'bg-yellow-500' :
                          'bg-gray-500'
                        }`}
                        style={{ width: `${status.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              )) || (
                <p className="text-gray-400 text-center py-4">No encounter data available</p>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Session Completion Rate */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                <CheckCircle size={20} className="text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Session Completion Rate
              </h2>
            </div>
            <div className="text-center py-6">
              <p className="text-5xl font-bold text-primary-600 mb-2">
                {analytics?.completion_rate || '0'}%
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {analytics?.completed_sessions || 0} of {analytics?.total_sessions || 0} sessions completed
              </p>
            </div>
          </div>

          {/* Peak Usage Hours */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                <Clock size={20} className="text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Peak Usage Hours
              </h2>
            </div>
            <div className="space-y-3">
              {analytics?.peak_hours?.map((hour, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {hour.hour}:00
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {hour.sessions} sessions
                  </span>
                </div>
              )) || (
                <p className="text-gray-400 text-center py-4">No peak hour data available</p>
              )}
            </div>
          </div>
        </div>

        {/* Red Flag Analysis */}
        <div className="card p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center">
              <TrendingUp size={20} className="text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Red Flag Analysis
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <p className="text-3xl font-bold text-red-600 mb-1">
                {analytics?.red_flags?.high || 0}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">High Priority</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
              <p className="text-3xl font-bold text-yellow-600 mb-1">
                {analytics?.red_flags?.medium || 0}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Medium Priority</p>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <p className="text-3xl font-bold text-blue-600 mb-1">
                {analytics?.red_flags?.low || 0}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Low Priority</p>
            </div>
          </div>
        </div>

        {/* Export Button */}
        <div className="flex justify-end">
          <button
            onClick={() => {
              // TODO: Implement export functionality
              console.log('Export analytics');
            }}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-medium hover:from-primary-600 hover:to-primary-700 shadow-md shadow-primary-200 transition-all"
          >
            <Download size={18} />
            Export Report
          </button>
        </div>
      </main>
    </div>
  );
}
