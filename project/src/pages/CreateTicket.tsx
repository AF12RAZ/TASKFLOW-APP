import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { api } from '../utils/api';
import { User, Project } from '../types';
import { AlertCircle } from 'lucide-react';

export function CreateTicket() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    assignee_id: '',
    project_id: '',
  });
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
    loadProjects();
  }, []);

  const loadUsers = async () => {
    setLoadingUsers(true);
    const response = await api.users.getActive();
    if (response.success && response.data) {
      setUsers(Array.isArray(response.data) ? response.data : []);
    } else {
      setUsers([]);
    }
    setLoadingUsers(false);
  };

  const loadProjects = async () => {
    setLoadingProjects(true);
    const response = await api.projects.getAll();
    if (response.success && response.data) {
      setProjects(Array.isArray(response.data) ? response.data : []);
    } else {
      setProjects([]);
    }
    setLoadingProjects(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.project_id) {
      setError('Please select a project');
      return;
    }

    setLoading(true);

    const ticketData: any = {
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      project_id: formData.project_id,
    };

    if (formData.assignee_id) {
      ticketData.assignee_id = formData.assignee_id;
    }

    const response = await api.tickets.create(ticketData);
    if (response.success) {
      navigate('/tickets');
    } else {
      setError(response.error || 'Failed to create ticket');
    }
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Create New Ticket</h1>
            <p className="text-gray-600 mt-2">Fill in the details to create a new task ticket</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="project_id" className="block text-sm font-medium text-gray-700 mb-2">
                  Project <span className="text-red-600">*</span>
                </label>
                {loadingProjects ? (
                  <div className="text-sm text-gray-500">Loading projects...</div>
                ) : (
                  <select
                    id="project_id"
                    name="project_id"
                    value={formData.project_id}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Select which project this ticket belongs to
                </p>
              </div>

              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Title <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  maxLength={200}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter ticket title (max 200 characters)"
                />
                <p className="text-xs text-gray-500 mt-1">{formData.title.length}/200 characters</p>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  maxLength={2000}
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Describe the ticket in detail (max 2000 characters)"
                />
                <p className="text-xs text-gray-500 mt-1">{formData.description.length}/2000 characters</p>
              </div>

              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div>
                <label htmlFor="assignee_id" className="block text-sm font-medium text-gray-700 mb-2">
                  Assign To
                </label>
                {loadingUsers ? (
                  <div className="text-sm text-gray-500">Loading users...</div>
                ) : (
                  <select
                    id="assignee_id"
                    name="assignee_id"
                    value={formData.assignee_id}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email}) - {u.role}
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  You can assign this ticket to any team member
                </p>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => navigate('/tickets')}
                  className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}