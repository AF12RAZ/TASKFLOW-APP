import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { Ticket, Project, User } from '../types';
import { useDebounce } from '../hooks/useDebounce';
import { AlertCircle, Download, Eye, ChevronLeft, ChevronRight, Filter, Search } from 'lucide-react';

export function TicketsList() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isAdmin = user?.role === 'ADMIN';
  const [showMyTickets, setShowMyTickets] = useState(false);
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    priority: searchParams.get('priority') || '',
    project: '',
    startDate: '',
    endDate: '',
    userName: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Debounce filters for efficient API calls
  const debouncedFilters = useDebounce(filters, 500);

  useEffect(() => {
    loadProjects();
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  useEffect(() => {
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFilters, pagination.page, showMyTickets]);

  const loadProjects = async () => {
    const response = await api.projects.getAll();
    if (response.success && response.data) {
      setProjects(Array.isArray(response.data) ? response.data : []);
    }
  };

  const loadUsers = async () => {
    const response = await api.users.getAll();
    if (response.success && response.data) {
      setAllUsers(Array.isArray(response.data) ? response.data : []);
    }
  };

  const loadTickets = async () => {
    setLoading(true);
    setError('');
    
    const apiFilters: any = {
      status: debouncedFilters.status || undefined,
      priority: debouncedFilters.priority || undefined,
      project: debouncedFilters.project || undefined,
      startDate: debouncedFilters.startDate || undefined,
      endDate: debouncedFilters.endDate || undefined,
      page: pagination.page,
      limit: pagination.limit,
    };

    const response = await api.tickets.getAll(apiFilters);
    if (response.success && response.data) {
      const data = response.data as any;
      let filteredTickets = data.tickets || [];
      
      // Apply "My Tickets" filter for all users
      if (showMyTickets && user) {
        filteredTickets = filteredTickets.filter((ticket: Ticket) => 
          ticket.creator_id === user.id || ticket.assignee_id === user.id
        );
      }
      
      // Admin-only: Search by user name/email (optimized with early exit)
      if (isAdmin && debouncedFilters.userName && debouncedFilters.userName.trim() !== '') {
        const searchTerm = debouncedFilters.userName.toLowerCase().trim();
        // Pre-compile search terms for better performance
        const searchTerms = searchTerm.split(/\s+/).filter(t => t.length > 0);
        
        filteredTickets = filteredTickets.filter((ticket: Ticket) => {
          // Early exit if no search terms
          if (searchTerms.length === 0) return true;
          
          // Get normalized strings once
          const creatorName = (ticket.creator?.name || '').toLowerCase();
          const assigneeName = (ticket.assignee?.name || '').toLowerCase();
          const creatorEmail = (ticket.creator?.email || '').toLowerCase();
          const assigneeEmail = (ticket.assignee?.email || '').toLowerCase();
          
          // Check if any search term matches any field
          return searchTerms.some(term => 
            creatorName.includes(term) || 
            assigneeName.includes(term) ||
            creatorEmail.includes(term) ||
            assigneeEmail.includes(term)
          );
        });
      }
      
      setTickets(filteredTickets);
      setPagination({
        ...pagination,
        total: !showMyTickets && (!isAdmin || !debouncedFilters.userName)
          ? (data.pagination?.total || filteredTickets.length)
          : filteredTickets.length,
        totalPages: !showMyTickets && (!isAdmin || !debouncedFilters.userName)
          ? (data.pagination?.totalPages || 1)
          : Math.ceil(filteredTickets.length / pagination.limit),
      });
    } else {
      setError(response.error || 'Failed to load tickets');
    }
    setLoading(false);
  };

  const handleExport = async () => {
    const response = await api.dashboard.export({
      ...filters,
      format: 'csv',
    });
    if (response.success && response.data) {
      const blob = response.data as unknown as Blob;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tickets_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'text-red-700 bg-red-100 border-red-200';
      case 'High':
        return 'text-orange-700 bg-orange-100 border-orange-200';
      case 'Medium':
        return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'Low':
        return 'text-green-700 bg-green-100 border-green-200';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'text-blue-700 bg-blue-100 border-blue-200';
      case 'In Progress':
        return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'Sent for Closure':
        return 'text-orange-700 bg-orange-100 border-orange-200';
      case 'Closed':
        return 'text-green-700 bg-green-100 border-green-200';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">All Tickets</h1>
              <p className="text-gray-600 mt-2">
                {showMyTickets 
                  ? 'Showing tickets you created or are assigned to' 
                  : 'View and manage all tickets'}
              </p>
            </div>
            <button
              onClick={handleExport}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md mb-6 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
              {/* My Tickets Filter - Available for ALL users */}
              <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Filter className="h-5 w-5 text-blue-600" />
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showMyTickets}
                    onChange={(e) => {
                      setShowMyTickets(e.target.checked);
                      setPagination({ ...pagination, page: 1 });
                    }}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-blue-900">My Tickets Only</span>
                </label>
              </div>

              {/* Admin-only: Search by User Name */}
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search by User
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Name or email..."
                      value={filters.userName}
                      onChange={(e) => {
                        setFilters({ ...filters, userName: e.target.value });
                        setPagination({ ...pagination, page: 1 });
                      }}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => {
                    setFilters({ ...filters, status: e.target.value });
                    setPagination({ ...pagination, page: 1 });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Sent for Closure">Sent for Closure</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={filters.priority}
                  onChange={(e) => {
                    setFilters({ ...filters, priority: e.target.value });
                    setPagination({ ...pagination, page: 1 });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Priorities</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project
                </label>
                <select
                  value={filters.project}
                  onChange={(e) => {
                    setFilters({ ...filters, project: e.target.value });
                    setPagination({ ...pagination, page: 1 });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Projects</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Date
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => {
                    setFilters({ ...filters, startDate: e.target.value });
                    setPagination({ ...pagination, page: 1 });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To Date
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => {
                    setFilters({ ...filters, endDate: e.target.value });
                    setPagination({ ...pagination, page: 1 });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : tickets.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <p className="text-gray-500">
                {showMyTickets 
                  ? 'No tickets found where you are creator or assignee' 
                  : isAdmin && filters.userName
                  ? 'No tickets found matching the user search'
                  : 'No tickets found'}
              </p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Title
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Project
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Priority
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Creator
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Assignee
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tickets.map((ticket) => (
                        <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900 line-clamp-1">
                              {ticket.title}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {ticket.project?.name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getPriorityColor(ticket.priority)}`}>
                              {ticket.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(ticket.status)}`}>
                              {ticket.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {ticket.creator?.name || 'Unknown'}
                            {ticket.creator_id === user?.id && (
                              <span className="ml-1 text-blue-600">(You)</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {ticket.assignee?.name || 'Unassigned'}
                            {ticket.assignee_id === user?.id && (
                              <span className="ml-1 text-blue-600">(You)</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDateTime(ticket.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <Link
                              to={`/tickets/${ticket.id}`}
                              className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 font-medium"
                            >
                              <Eye className="h-4 w-4" />
                              <span>View</span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{tickets.length}</span> ticket{tickets.length !== 1 ? 's' : ''}
                  {showMyTickets && ' (filtered to your tickets)'}
                  {isAdmin && filters.userName && ` (filtered by user: ${filters.userName})`}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Previous</span>
                  </button>
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
