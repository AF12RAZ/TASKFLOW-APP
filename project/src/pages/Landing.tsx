import { Link } from 'react-router-dom';
import { Shield, Bell, Activity, Lock, Users, FileCheck } from 'lucide-react';

export function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <FileCheck className="h-16 w-16 text-blue-600" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            TaskFlow
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Secure Internal Task Approval and Management System
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              to="/auth?mode=login"
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
            >
              Login
            </Link>
            <Link
              to="/auth?mode=register"
              className="px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold border-2 border-blue-600 hover:bg-blue-50 transition-colors shadow-md"
            >
              Register
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3 text-center">
              Enterprise Security
            </h3>
            <p className="text-gray-600 text-center leading-relaxed">
              JWT authentication, role-based access control, and encrypted data storage ensure your tasks are always secure.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Activity className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3 text-center">
              Real-time Tracking
            </h3>
            <p className="text-gray-600 text-center leading-relaxed">
              Monitor ticket progress with comprehensive audit logs and status updates in real-time.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Bell className="h-8 w-8 text-orange-600" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3 text-center">
              Smart Notifications
            </h3>
            <p className="text-gray-600 text-center leading-relaxed">
              Automated notifications keep admins informed when tickets require their attention.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Key Features
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <Lock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Workflow Enforcement</h4>
                <p className="text-gray-600">
                  Strict workflow rules ensure tickets move through proper approval stages with role-based permissions.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Role Management</h4>
                <p className="text-gray-600">
                  Separate user and admin roles with granular permissions for ticket creation and approval.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Complete Audit Trail</h4>
                <p className="text-gray-600">
                  Every action is logged with timestamps and user information for full accountability.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <FileCheck className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Export & Reporting</h4>
                <p className="text-gray-600">
                  Export tickets to CSV with flexible filtering options for analysis and reporting.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-gray-500 text-sm">
            Secure. Reliable. Production-ready.
          </p>
        </div>
      </div>
    </div>
  );
}
