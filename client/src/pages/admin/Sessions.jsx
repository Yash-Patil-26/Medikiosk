import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Activity, Search, Filter, Eye, Trash2, Clock, CheckCircle, XCircle, AlertTriangle, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import UniversalHeader from '../../components/UniversalHeader.jsx';
import api from '../../services/api.js';

export default function SessionManagement() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [redFlagFilter, setRedFlagFilter] = useState(searchParams.get('red_flag') === 'true');

  useEffect(() => {
    loadSessions();
  }, [statusFilter, redFlagFilter]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (redFlagFilter) params.append('red_flag', 'true');
      
      const response = await api.get(`/admin/sessions?${params.toString()}`);
      setSessions(response.data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filteredSessions = sessions.filter(s => {
    const matchesSearch = 
      s.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.patient_id?.toString().includes(searchTerm) ||
      s.id?.toString().includes(searchTerm);
    return matchesSearch;
  });

  const getStatusBadge = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      expired: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      purged: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  };

  const getStatusIcon = (status) => {
    const icons = {
      active: CheckCircle,
      completed: CheckCircle,
      expired: Clock,
      purged: XCircle
    };
    return icons[status] || Clock;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50/20 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col">
      <UniversalHeader showLogout={true} />

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Session Management
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Monitor and manage kiosk sessions
            </p>
          </div>
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-medium hover:from-primary-600 hover:to-primary-700 shadow-md shadow-primary-200 transition-all"
          >
            <Activity size={18} />
            Back to Dashboard
          </button>
        </div>

        {/* Filters and Search */}
        <div className="card p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search sessions by patient name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-gray-100"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="expired">Expired</option>
                <option value="purged">Purged</option>
              </select>
            </div>

            {/* Red Flag Filter */}
            <div className="flex items-center gap-2">
              <AlertTriangle size={20} className="text-gray-400" />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={redFlagFilter}
                  onChange={(e) => setRedFlagFilter(e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Red Flags Only
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Sessions Table */}
        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Session
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Language
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredSessions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            <Activity size={32} className="text-gray-300 dark:text-gray-500" />
                          </div>
                          <p className="text-gray-400 dark:text-gray-500 font-medium">No sessions found</p>
                          <p className="text-xs text-gray-300 dark:text-gray-600">
                            Try adjusting your search or filters
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredSessions.map((session) => {
                      const StatusIcon = getStatusIcon(session.status);
                      return (
                        <tr key={session.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                                <Activity size={20} className="text-primary-600 dark:text-primary-400" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                  Session #{session.id}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {session.current_node_id || 'Not started'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                {session.patient_name?.charAt(0) || 'P'}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                  {session.patient_name || 'Unknown Patient'}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  ID: {session.patient_id}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <StatusIcon size={16} className="text-gray-400" />
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(session.status)}`}>
                                {session.status}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {session.language?.toUpperCase() || 'EN'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <Clock size={14} />
                              <span>{new Date(session.created_at).toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => navigate(`/admin/sessions/${session.id}`)}
                                className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-all"
                                title="View Details"
                              >
                                <Eye size={18} />
                              </button>
                              {session.status === 'active' && (
                                <button
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to purge session #${session.id}?`)) {
                                      // TODO: Implement purge functionality
                                      console.log('Purge session:', session.id);
                                    }
                                  }}
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                  title="Purge Session"
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {filteredSessions.length} of {sessions.length} sessions
                </p>
                <div className="flex gap-2">
                  <button
                    disabled
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    disabled
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
