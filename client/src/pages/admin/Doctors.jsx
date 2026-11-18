import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Search, Activity, Edit, Trash2, Eye, Mail, Phone, Calendar, TrendingUp, Stethoscope } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import UniversalHeader from '../../components/UniversalHeader.jsx';
import api from '../../services/api.js';

export default function DoctorManagement() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/doctors');
      setDoctors(response.data);
    } catch (error) {
      console.error('Failed to load doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filteredDoctors = doctors.filter(d => {
    const matchesSearch = 
      d.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.login_identifier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getActiveBadge = (isActive) => {
    return isActive 
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary-50/20 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col">
      <UniversalHeader showLogout={true} />

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Doctor Management
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Manage doctor accounts and monitor their activity
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/doctor/register')}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-green-700 shadow-md shadow-green-200 transition-all"
            >
              <UserPlus size={18} />
              Add Doctor
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

        {/* Search */}
        <div className="card p-6 mb-6">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search doctors by name, username, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Stethoscope size={24} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {doctors.length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Doctors</p>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Activity size={24} className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {doctors.filter(d => d.active).length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <TrendingUp size={24} className="text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {doctors.reduce((sum, d) => sum + (d.encounters_completed || 0), 0)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Encounters</p>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Calendar size={24} className="text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {doctors.reduce((sum, d) => sum + (d.sessions_assigned || 0), 0)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Sessions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Doctors Table */}
        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Doctor
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Activity
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Registered
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredDoctors.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            <Stethoscope size={32} className="text-gray-300 dark:text-gray-500" />
                          </div>
                          <p className="text-gray-400 dark:text-gray-500 font-medium">No doctors found</p>
                          <p className="text-xs text-gray-300 dark:text-gray-600">
                            Add your first doctor to get started
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredDoctors.map((doctor) => (
                      <tr key={doctor.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold">
                              {doctor.display_name?.charAt(0) || doctor.username?.charAt(0) || 'D'}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                {doctor.display_name || doctor.username}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                @{doctor.username}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {doctor.email && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <Mail size={14} />
                                <span>{doctor.email}</span>
                              </div>
                            )}
                            {doctor.phone && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <Phone size={14} />
                                <span>{doctor.phone}</span>
                              </div>
                            )}
                            {doctor.login_identifier && (
                              <div className="text-xs text-gray-400">
                                ID: {doctor.login_identifier}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getActiveBadge(doctor.active)}`}>
                            {doctor.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                              <TrendingUp size={14} />
                              <span>{doctor.encounters_completed || 0} encounters</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                              <Activity size={14} />
                              <span>{doctor.sessions_assigned || 0} sessions</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Calendar size={14} />
                            <span>{new Date(doctor.created_at).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigate(`/admin/doctors/${doctor.id}`)}
                              className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-all"
                              title="View Details"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => navigate(`/admin/doctors/${doctor.id}/edit`)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                              title="Edit Doctor"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete ${doctor.display_name || doctor.username}?`)) {
                                  // TODO: Implement delete functionality
                                  console.log('Delete doctor:', doctor.id);
                                }
                              }}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                              title="Delete Doctor"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {filteredDoctors.length} of {doctors.length} doctors
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
