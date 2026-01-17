import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { Ticket, AuditLog, User } from '../types';
import { AlertCircle, Clock, User as UserIcon, Calendar, ArrowRight, CheckCircle, ArrowLeft } from 'lucide-react';

export function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (id) {
      loadTicketDetails();
      loadUsers();
    }
  }, [id]);

  const loadUsers = async () => {
    try {
      const response = await api.users.getActive();
      if (response.success && response.data) {
        const activeUsers = Array.isArray(response.data) 
          ? response.data.filter((u: User) => u.isActive !== false)
          : [];
        setUsers(activeUsers);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const loadTicketDetails = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.tickets.getById(id);
      if (response.success && response.data) {
        const data = response.data as any;
        if (data.ticket) {
          setTicket(data.ticket);
          setAuditLogs(data.auditLogs || []);
        } else {
          setTicket(data as Ticket);
          setAuditLogs([]);
        }
      } else {
        setError(response.error || 'Failed to load ticket');
      }
    } catch (err) {
      setError('Failed to load ticket details');
      console.error('Load ticket error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!id) return;
    setUpdating(true);
    setError('');
    try {
      const response = await api.tickets.updateStatus(id, newStatus);
      if (response.success) {
        await loadTicketDetails();
      } else {
        setError(response.error || 'Failed to update status');
      }
    } catch (err) {
      setError('Failed to update status');
      console.error('Status update error:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleReassign = async (newAssigneeId: string) => {
    if (!id || !ticket || !user) {
      console.error('Missing required data for reassignment:', { id, ticket, user });
      return;
    }

    if (ticket.status === 'Closed') {
      setError('Cannot reassign a closed ticket');
      return;
    }

    // Normalize assignee_id: empty string becomes null, otherwise keep the value
    const targetAssigneeId = (newAssigneeId && newAssigneeId.trim() !== '') ? newAssigneeId : null;
    
    // Check if assignment actually changed (normalize both for comparison)
    const currentAssigneeId = ticket.assignee_id || null;
    if (currentAssigneeId === targetAssigneeId) {
      console.log('No change in assignee, skipping update', { 
        currentAssigneeId: ticket.assignee_id, 
        targetAssigneeId 
      });
      return;
    }

    setUpdating(true);
    setError('');
    
    try {
      console.log('Reassigning ticket:', { 
        ticketId: id, 
        currentAssigneeId, 
        targetAssigneeId,
        payload: { assignee_id: targetAssigneeId }
      });
      
      // Always send assignee_id explicitly, even if null
      const updatePayload: { assignee_id: string | null } = {
        assignee_id: targetAssigneeId
      };
      
      const response = await api.tickets.update(id, updatePayload);
      
      console.log('Reassignment response:', response);
      
      if (response.success) {
        // Clear error and reload ticket details
        setError('');
        await loadTicketDetails();
        console.log('Ticket reassigned successfully');
      } else {
        // Check for specific backend permission errors
        const errorMsg = response.error || response.details?.[0] || 'Failed to reassign ticket';
        if (errorMsg.includes('creator or admin') || errorMsg.includes('403')) {
          setError('Permission denied: Only ticket creator or admin can reassign. The backend requires creator/admin permission.');
        } else {
          setError(errorMsg);
        }
        console.error('Reassignment failed:', errorMsg, response);
      }
    } catch (err) {
      const errorMsg = 'Failed to reassign ticket. Please try again.';
      setError(errorMsg);
      console.error('Reassignment error:', err);
      if (err instanceof Error) {
        console.error('Error details:', err.message, err.stack);
      }
    } finally {
      setUpdating(false);
    }
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const canMoveToInProgress = () => {
    if (!ticket || !user) return false;
    const isCreator = ticket.creator_id === user.id;
    const isAssignee = ticket.assignee_id === user.id;
    const isAdmin = user.role === 'ADMIN';
    return (isCreator || isAssignee || isAdmin) && ticket.status === 'Open';
  };

  const canSendForClosure = () => {
    if (!ticket || !user) return false;
    const isCreator = ticket.creator_id === user.id;
    const isAssignee = ticket.assignee_id === user.id;
    return (isCreator || isAssignee) && ticket.status === 'In Progress';
  };

  const canClose = () => {
    if (!ticket || !user) return false;
    return user.role === 'ADMIN' && ticket.status === 'Sent for Closure';
  };

  const canMoveBackToProgress = () => {
    if (!ticket || !user) return false;
    return user.role === 'ADMIN' && ticket.status === 'Sent for Closure';
  };

  const canReassign = () => {
    if (!ticket || !user) return false;
    return ticket.status !== 'Closed';
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

  if (!ticket) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">Ticket not found</p>
            <button
              onClick={() => navigate('/tickets')}
              className="mt-4 text-blue-600 hover:text-blue-700"
            >
              Back to Tickets
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => navigate('/tickets')}
            className="text-blue-600 hover:text-blue-700 font-medium mb-6"
          >
            ← Back to Tickets
          </button>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow-md p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">{ticket.title}</h1>
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                      <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="prose max-w-none">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start space-x-3">
                    <UserIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Creator</p>
                      <p className="text-sm text-gray-900">{ticket.creator?.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{ticket.creator?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <UserIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Assignee</p>
                      <p className="text-sm text-gray-900">{ticket.assignee?.name || 'Unassigned'}</p>
                      {ticket.assignee && (
                        <p className="text-xs text-gray-500">{ticket.assignee.email}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Created</p>
                      <p className="text-sm text-gray-900">
                        {formatDateTime(ticket.created_at)}
                      </p>
                    </div>
                  </div>

                  {ticket.closed_date && (
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Closed</p>
                        <p className="text-sm text-gray-900">
                          {formatDateTime(ticket.closed_date)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Actions</h3>
                  <div className="flex flex-wrap gap-3">
                    {canMoveToInProgress() && (
                      <button
                        onClick={() => handleStatusUpdate('In Progress')}
                        disabled={updating}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        <Clock className="h-4 w-4" />
                        <span>Start Working (In Progress)</span>
                      </button>
                    )}
                    
                    {canSendForClosure() && (
                      <button
                        onClick={() => handleStatusUpdate('Sent for Closure')}
                        disabled={updating}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        <ArrowRight className="h-4 w-4" />
                        <span>Request Closure</span>
                      </button>
                    )}
                    
                    {canMoveBackToProgress() && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate('In Progress')}
                          disabled={updating}
                          className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          <span>Needs Revision (Back to In Progress)</span>
                        </button>
                        
                        <button
                          onClick={() => handleStatusUpdate('Closed')}
                          disabled={updating}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span>Approve & Close</span>
                        </button>
                      </>
                    )}
                    
                    {!canMoveToInProgress() && !canSendForClosure() && !canClose() && !canMoveBackToProgress() && (
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-600">
                          {ticket.status === 'Closed' ? (
                            <span className="flex items-center text-green-600">
                              <CheckCircle className="h-4 w-4 mr-2" />
                              This ticket is closed
                            </span>
                          ) : (
                            'You don\'t have permission to change the status of this ticket'
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {user?.role === 'ADMIN' && ticket.status === 'Sent for Closure' && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Admin Review:</strong> This ticket is awaiting your approval. 
                        You can either approve and close it, or send it back for revision.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Reassign Ticket</h3>
                <select
                  value={ticket.assignee_id || ''}
                  onChange={(e) => handleReassign(e.target.value)}
                  disabled={updating || !canReassign()}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Unassigned</option>
                  {users.filter((u) => u.isActive !== false).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
                {!canReassign() && (
                  <p className="text-xs text-gray-500 mt-2">
                    Cannot reassign closed tickets
                  </p>
                )}
                {canReassign() && (
                  <p className="text-xs text-gray-500 mt-2">
                    Select a user to reassign this ticket
                  </p>
                )}
                {updating && (
                  <p className="text-xs text-blue-600 mt-2">Updating...</p>
                )}
              </div>

              <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-blue-600" />
                  Activity History
                </h3>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {auditLogs.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No activity recorded yet</p>
                  ) : (
                    auditLogs.map((log) => (
                      <div key={log.id} className="border-l-4 border-blue-500 pl-4 py-2 hover:bg-gray-50 transition-colors">
                        <p className="text-sm font-medium text-gray-900">{log.details}</p>
                        <p className="text-xs text-gray-500 mt-1 flex items-center">
                          <UserIcon className="h-3 w-3 mr-1" />
                          {typeof log.changed_by === 'object' && log.changed_by?.name ? log.changed_by.name : 'System'} • {formatDateTime(log.created_at)}
                        </p>
                        {log.old_status && log.new_status && (
                          <div className="text-xs mt-2 flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded font-medium ${getStatusColor(log.old_status)}`}>
                              {log.old_status}
                            </span>
                            <ArrowRight className="h-3 w-3 text-gray-400" />
                            <span className={`px-2 py-1 rounded font-medium ${getStatusColor(log.new_status)}`}>
                              {log.new_status}
                            </span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
