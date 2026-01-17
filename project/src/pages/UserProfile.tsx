import { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { AlertCircle, CheckCircle, User as UserIcon, Lock, Mail, Shield } from 'lucide-react';

export function UserProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Name update state
  const [name, setName] = useState(user?.name || '');
  const [updatingName, setUpdatingName] = useState(false);
  
  // Password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Get user ID (handle both id and _id)
  const getUserId = () => {
    if (!user) return '';
    return (user as any)._id || (user as any).id || '';
  };

  useEffect(() => {
    if (user) {
      setName(user.name || '');
    }
  }, [user]);

  const handleNameUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) {
      setError('Name cannot be empty');
      return;
    }

    if (name.trim() === user.name) {
      setError('Name has not changed');
      return;
    }

    const userId = getUserId();
    if (!userId) {
      setError('User ID not found');
      return;
    }

    setUpdatingName(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.users.update(userId, { name: name.trim() });
      
      if (response.success) {
        setSuccess('Name updated successfully');
        // Update the user in context/localStorage
        const updatedUser = { ...user, name: name.trim() };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        // Reload to update context
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setError(response.error || 'Failed to update name');
      }
    } catch (err) {
      setError('Failed to update name. Please try again.');
      console.error('Name update error:', err);
    } finally {
      setUpdatingName(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('All password fields are required');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (oldPassword === newPassword) {
      setError('New password must be different from old password');
      return;
    }

    if (!user) {
      setError('User not found');
      return;
    }

    const userId = getUserId();
    if (!userId) {
      setError('User ID not found');
      return;
    }

    setChangingPassword(true);

    try {
      console.log('Attempting password change for user:', userId);
      
      const response = await api.users.changePassword(userId, {
        oldPassword,
        newPassword,
      });

      console.log('Password change response:', response);

      if (response.success) {
        setSuccess('Password changed successfully! Please use your new password next time you log in.');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        
        // Scroll to top to show success message
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setError(response.error || 'Failed to change password');
      }
    } catch (err: any) {
      console.error('Password change error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to change password. Please try again.';
      setError(errorMessage);
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">User Profile</h1>
            <p className="text-gray-600 mt-2">Manage your account settings</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-green-800">{success}</span>
            </div>
          )}

          <div className="space-y-6">
            {/* Read-only Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                    <p className="text-sm text-gray-900">{user?.email || 'N/A'}</p>
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Role</label>
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                        user?.role === 'ADMIN'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {user?.role || 'USER'}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">Role cannot be changed</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Update Name */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <UserIcon className="h-5 w-5 mr-2 text-blue-600" />
                Update Name
              </h2>
              <form onSubmit={handleNameUpdate}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={updatingName}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="Enter your name"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={updatingName || !name.trim() || name.trim() === user?.name}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {updatingName ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        <span>Update Name</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Change Password */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Lock className="h-5 w-5 mr-2 text-blue-600" />
                Change Password
              </h2>
              <form onSubmit={handlePasswordChange}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="oldPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      id="oldPassword"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      disabled={changingPassword}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="Enter current password"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      id="newPassword"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={changingPassword}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="Enter new password (min 6 characters)"
                      required
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={changingPassword}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="Confirm new password"
                      required
                      minLength={6}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={changingPassword || !oldPassword || !newPassword || !confirmPassword}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {changingPassword ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Changing Password...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" />
                        <span>Change Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}