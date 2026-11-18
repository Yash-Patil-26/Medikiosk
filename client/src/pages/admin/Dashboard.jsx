import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Activity, FileText, AlertTriangle, TrendingUp, Clock, CheckCircle, XCircle, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import UniversalHeader from '../../components/UniversalHeader.jsx';
import api from '../../services/api.js';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsRes, activityRes, healthRes] = await Promise.all([
        api.get('/admin/dashboard-stats'),
        api.get('/admin/recent-activity'),
        api.get('/admin/system-health')
      ]);
      setStats(statsRes.data);
      setRecentActivity(activityRes.data);
      setSystemHealth(healthRes.data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading) return <LoadingSpinner />;

  const statCards = [
    {
      title: 'Total Patients',
      value: stats?.total_patients || 0,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      textColor: 'text-blue-600 dark:text-blue-400',
      link: '/admin/users?role=patient'
    },
    {
      title: 'Total Doctors',
      value: stats?.total_doctors || 0,
      icon: Activity,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      textColor: 'text-green-600 dark:text-green-400',
      link: '/admin/users?role=doctor'
    },
    {
      title: 'Active Sessions',
      value: stats?.active_sessions || 0,
      icon: Clock,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      textColor: 'text-purple-600 dark:text-purple-400',
      link: '/admin/sessions?status=active'
    },
    {
      title: 'Encounters Today',
      value: stats?.encounters_today || 0,
      icon: FileText,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      textColor: 'text-orange-600 dark:text-orange-400',
      link: '/admin/sessions?status=completed'
    },
    {
      title: 'Red Flags',
      value: stats?.red_flags || 0,
      icon: AlertTriangle,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      textColor: 'text-red-600 dark:text-red-400',
      link: '/admin/sessions?red_flag=true'
    },
    {
      title: 'Total Encounters',
      value: stats?.total_encounters || 0,
      icon: TrendingUp,
      color: 'from-indigo-500 to-indigo-600',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
      textColor: 'text-indigo-600 dark:text-indigo-400',
      link: '/admin/sessions'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50/20 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col">
      <UniversalHeader showLogout={true} />

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Admin Dashboard
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              System overview and quick access to admin functions
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/monitoring')}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-medium hover:from-primary-600 hover:to-primary-700 shadow-md shadow-primary-200 transition-all"
          >
            <Activity size={18} />
            System Health
          </button>
        </div>

        {/* System Health Status */}
        {systemHealth && (
          <div className="card p-6 mb-8 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 border border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  systemHealth.status === 'healthy' 
                    ? 'bg-green-100 dark:bg-green-900/30' 
                    : 'bg-red-100 dark:bg-red-900/30'
                }`}>
                  {systemHealth.status === 'healthy' ? (
                    <CheckCircle size={24} className="text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle size={24} className="text-red-600 dark:text-red-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    System Status: {systemHealth.status === 'healthy' ? 'Healthy' : 'Degraded'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {systemHealth.message || 'All systems operational'}
                  </p>
                </div>
              </div>
              <div className="flex gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{systemHealth.uptime || 'N/A'}</div>
                  <div className="text-gray-500 dark:text-gray-400">Uptime</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{systemHealth.response_time || 'N/A'}</div>
                  <div className="text-gray-500 dark:text-gray-400">Response Time</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <div
              key={index}
              onClick={() => navigate(stat.link)}
              className="card p-6 cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon size={24} className={stat.textColor} />
                </div>
                <TrendingUp size={20} className="text-gray-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                  {stat.value}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  {stat.title}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Activity */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                <Clock size={20} className="text-primary-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Recent Activity
              </h2>
            </div>
            <div className="space-y-4">
              {recentActivity.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No recent activity</p>
              ) : (
                recentActivity.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <Activity size={16} className="text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {activity.action}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {activity.actor_role} • {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => navigate('/admin/users')}
              className="w-full mt-4 px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-50 transition-all"
            >
              View All Users
            </button>
          </div>

          {/* Quick Actions */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                <TrendingUp size={20} className="text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Quick Actions
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => navigate('/admin/users')}
                className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all text-left"
              >
                <Users size={24} className="text-blue-600 mb-2" />
                <p className="font-medium text-gray-900 dark:text-gray-100">User Management</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Manage all accounts</p>
              </button>
              <button
                onClick={() => navigate('/admin/sessions')}
                className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all text-left"
              >
                <Activity size={24} className="text-purple-600 mb-2" />
                <p className="font-medium text-gray-900 dark:text-gray-100">Session Management</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Monitor kiosk sessions</p>
              </button>
              <button
                onClick={() => navigate('/admin/encounters')}
                className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/30 transition-all text-left"
              >
                <FileText size={24} className="text-green-600 mb-2" />
                <p className="font-medium text-gray-900 dark:text-gray-100">Encounter Management</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Monitor clinical encounters</p>
              </button>
              <button
                onClick={() => navigate('/admin/doctors')}
                className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-all text-left"
              >
                <UserPlus size={24} className="text-orange-600 mb-2" />
                <p className="font-medium text-gray-900 dark:text-gray-100">Doctor Management</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Manage medical staff</p>
              </button>
              <button
                onClick={() => navigate('/admin/monitoring')}
                className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-xl hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-all text-left"
              >
                <CheckCircle size={24} className="text-teal-600 mb-2" />
                <p className="font-medium text-gray-900 dark:text-gray-100">System Monitoring</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Health & performance</p>
              </button>
              <button
                onClick={() => navigate('/admin/analytics')}
                className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all text-left"
              >
                <TrendingUp size={24} className="text-indigo-600 mb-2" />
                <p className="font-medium text-gray-900 dark:text-gray-100">Reports & Analytics</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Usage statistics</p>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
