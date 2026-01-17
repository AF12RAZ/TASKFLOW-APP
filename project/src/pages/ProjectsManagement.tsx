import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { Project } from '../types';
import { FolderPlus, Edit2, Trash2, X } from 'lucide-react';

export function ProjectsManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  });

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      navigate('/dashboard');
      return;
    }
    loadProjects();
  }, [user, navigate]);

  const loadProjects = async () => {
    setLoading(true);
    const response = await api.projects.getAll();
    if (response.success && response.data) {
      setProjects(Array.isArray(response.data) ? response.data : []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingProject) {
      const response = await api.projects.update(editingProject.id, formData);
      if (response.success) {
        loadProjects();
        closeModal();
      }
    } else {
      const response = await api.projects.create(formData);
      if (response.success) {
        loadProjects();
        closeModal();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project? This will affect all associated tickets.')) return;
    
    const response = await api.projects.delete(id);
    if (response.success) {
      loadProjects();
    }
  };

  const openCreateModal = () => {
    setEditingProject(null);
    setFormData({ name: '', description: '', color: '#3B82F6' });
    setShowModal(true);
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      color: project.color
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProject(null);
    setFormData({ name: '', description: '', color: '#3B82F6' });
  };

  const colorOptions = [
    { value: '#3B82F6', name: 'Blue' },
    { value: '#10B981', name: 'Green' },
    { value: '#F59E0B', name: 'Orange' },
    { value: '#EF4444', name: 'Red' },
    { value: '#8B5CF6', name: 'Purple' },
    { value: '#EC4899', name: 'Pink' },
    { value: '#6366F1', name: 'Indigo' },
    { value: '#14B8A6', name: 'Teal' }
  ];

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-gray-600">Loading projects...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Projects Management</h1>
              <p className="text-gray-600 mt-2">Manage all projects and their configurations</p>
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FolderPlus className="h-5 w-5" />
              <span>Create Project</span>
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <FolderPlus className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No projects yet</p>
              <p className="text-gray-500 text-sm mt-2">Create your first project to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4"
                  style={{ borderLeftColor: project.color }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{project.name}</h3>
                      {project.description && (
                        <p className="text-gray-600 text-sm">{project.description}</p>
                      )}
                    </div>
                    <div
                      className="w-6 h-6 rounded-full flex-shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                  </div>

                  <div className="text-sm text-gray-500 mb-4">
                    Created by {project.createdBy?.name || 'Unknown'}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(project)}
                      className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingProject ? 'Edit Project' : 'Create New Project'}
                  </h2>
                  <button
                    onClick={closeModal}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={100}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter project name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      maxLength={500}
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Brief description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Color
                    </label>
                    <div className="grid grid-cols-4 gap-3">
                      {colorOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, color: option.value })}
                          className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                            formData.color === option.value
                              ? 'border-gray-800 bg-gray-50'
                              : 'border-gray-200 hover:border-gray-400'
                          }`}
                        >
                          <div
                            className="w-8 h-8 rounded-full"
                            style={{ backgroundColor: option.value }}
                          />
                          <span className="text-xs text-gray-600">{option.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {editingProject ? 'Update Project' : 'Create Project'}
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}