import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { api } from '../utils/api';
import { DashboardStats, RecentActivity } from '../types';
import { FileText, AlertCircle, Clock, CheckCircle, TrendingUp } from 'lucide-react';

export function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.dashboard.getStats();
      if (response.success && response.data) {
        const data = response.data as any;
        if (data.stats) {
          setStats(data.stats);
          setRecentActivity(data.recentActivity || []);
        } else {
          setStats(data);
          setRecentActivity([]);
        }
      } else {
        setError(response.error || 'Failed to load dashboard data');
      }
    } catch (err) {
      setError('Failed to load dashboard data');
    }
    setLoading(false);
  };

  const handleCardClick = (filterType: string, filterValue?: string) => {
    if (filterType === 'all') {
      navigate('/tickets');
    } else if (filterType === 'status' && filterValue) {
      navigate(`/tickets?status=${encodeURIComponent(filterValue)}`);
    } else if (filterType === 'priority' && filterValue) {
      navigate(`/tickets?priority=${encodeURIComponent(filterValue)}`);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'text-red-600 bg-red-50';
      case 'High':
        return 'text-orange-600 bg-orange-50';
      case 'Medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'Low':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'text-blue-600 bg-blue-50';
      case 'In Progress':
        return 'text-yellow-600 bg-yellow-50';
      case 'Sent for Closure':
        return 'text-orange-600 bg-orange-50';
      case 'Closed':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-2">Overview of all tickets and recent activity</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          )}

          {stats ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                <div
                  onClick={() => handleCardClick('all')}
                  className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-600 hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Tickets</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
                    </div>
                    <FileText className="h-10 w-10 text-blue-600 opacity-80" />
                  </div>
                </div>

                <div
                  onClick={() => handleCardClick('status', 'Open')}
                  className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500 hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Open</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stats.byStatus.open}</p>
                    </div>
                    <AlertCircle className="h-10 w-10 text-blue-500 opacity-80" />
                  </div>
                </div>

                <div
                  onClick={() => handleCardClick('status', 'In Progress')}
                  className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500 hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">In Progress</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stats.byStatus.inProgress}</p>
                    </div>
                    <Clock className="h-10 w-10 text-yellow-500 opacity-80" />
                  </div>
                </div>

                <div
                  onClick={() => handleCardClick('status', 'Sent for Closure')}
                  className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500 hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending Closure</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stats.byStatus.sentForClosure}</p>
                    </div>
                    <TrendingUp className="h-10 w-10 text-orange-500 opacity-80" />
                  </div>
                </div>

                <div
                  onClick={() => handleCardClick('status', 'Closed')}
                  className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500 hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Closed</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stats.byStatus.closed}</p>
                    </div>
                    <CheckCircle className="h-10 w-10 text-green-500 opacity-80" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Priority Distribution</h2>
                  <div className="space-y-3">
                    <div
                      onClick={() => handleCardClick('priority', 'Critical')}
                      className="flex items-center justify-between hover:bg-gray-50 p-2 rounded cursor-pointer transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-700">Critical</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-48 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-red-600 h-2 rounded-full"
                            style={{ width: `${stats.total > 0 ? (stats.byPriority.critical / stats.total) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 w-8 text-right">{stats.byPriority.critical}</span>
                      </div>
                    </div>
                    <div
                      onClick={() => handleCardClick('priority', 'High')}
                      className="flex items-center justify-between hover:bg-gray-50 p-2 rounded cursor-pointer transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-700">High</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-48 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-orange-500 h-2 rounded-full"
                            style={{ width: `${stats.total > 0 ? (stats.byPriority.high / stats.total) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 w-8 text-right">{stats.byPriority.high}</span>
                      </div>
                    </div>
                    <div
                      onClick={() => handleCardClick('priority', 'Medium')}
                      className="flex items-center justify-between hover:bg-gray-50 p-2 rounded cursor-pointer transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-700">Medium</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-48 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-yellow-500 h-2 rounded-full"
                            style={{ width: `${stats.total > 0 ? (stats.byPriority.medium / stats.total) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 w-8 text-right">{stats.byPriority.medium}</span>
                      </div>
                    </div>
                    <div
                      onClick={() => handleCardClick('priority', 'Low')}
                      className="flex items-center justify-between hover:bg-gray-50 p-2 rounded cursor-pointer transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-700">Low</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-48 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${stats.total > 0 ? (stats.byPriority.low / stats.total) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 w-8 text-right">{stats.byPriority.low}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
                  <div className="space-y-3">
                    {recentActivity.length === 0 ? (
                      <p className="text-gray-500 text-sm">No recent activity</p>
                    ) : (
                      recentActivity.map((activity) => (
                        <div key={activity.id} className="border-l-2 border-blue-600 pl-4 py-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 line-clamp-1">
                                {activity.title}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                by {activity.creator?.name || 'Unknown'} •{' '}
                                {new Date(activity.created_at).toLocaleString('en-US', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short'
                                })}
                              </p>
                            </div>
                            <div className="flex space-x-2 ml-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(activity.status)}`}>
                                {activity.status}
                              </span>
                              <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(activity.priority)}`}>
                                {activity.priority}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <p className="text-gray-500">No dashboard data available. Create some tickets to see stats!</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
