const API_BASE_URL = "http://localhost:5000/api";

export interface ApiError {
  error: string;
  details?: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string[];
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const contentType = response.headers.get('content-type');

  if (contentType?.includes('text/csv')) {
    const blob = await response.blob();
    return {
      success: true,
      data: blob as unknown as T,
    };
  }

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: data.message || data.error || 'An error occurred',
      details: data.details,
    };
  }

  if (data.success && data.data) {
    return {
      success: true,
      data: data.data,
    };
  }

  return {
    success: true,
    data: data,
  };
}

export const api = {
  auth: {
    register: async (name: string, email: string, password: string, role?: string) => {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role: role || 'USER' }),
      });
      const result = await handleResponse(response);
      
      if (result.success && result.data) {
        return {
          success: true,
          data: {
            user: result.data,
          }
        };
      }
      return result;
    },

    login: async (email: string, password: string) => {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const result = await handleResponse(response);
      
      if (result.success && result.data) {
        return {
          success: true,
          data: result.data,
        };
      }
      return result;
    },

    me: async () => {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const result = await handleResponse(response);
      
      if (result.success && result.data) {
        return {
          success: true,
          data: {
            user: result.data,
          }
        };
      }
      return result;
    },
  },

  tickets: {
    getAll: async (params?: {
      status?: string;
      priority?: string;
      project?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }) => {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.priority) queryParams.append('priority', params.priority);
      if (params?.project) queryParams.append('project', params.project);
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const queryString = queryParams.toString();
      const url = queryString 
        ? `${API_BASE_URL}/tickets?${queryString}`
        : `${API_BASE_URL}/tickets`;

      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },

    getById: async (id: string) => {
      const response = await fetch(`${API_BASE_URL}/tickets/${id}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },

    create: async (ticket: {
      title: string;
      description: string;
      priority: string;
      assignee_id?: string;
      project_id: string;
    }) => {
      const response = await fetch(`${API_BASE_URL}/tickets`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(ticket),
      });
      return handleResponse(response);
    },

    update: async (id: string, updates: {
      title?: string;
      description?: string;
      priority?: string;
      assignee_id?: string | null;
    }) => {
      const response = await fetch(`${API_BASE_URL}/tickets/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });
      return handleResponse(response);
    },

    updateStatus: async (id: string, status: string) => {
      const response = await fetch(`${API_BASE_URL}/tickets/${id}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });
      return handleResponse(response);
    },

    delete: async (id: string) => {
      const response = await fetch(`${API_BASE_URL}/tickets/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },
  },

  dashboard: {
    getStats: async (params?: { startDate?: string; endDate?: string }) => {
      const queryParams = new URLSearchParams();
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);

      const queryString = queryParams.toString();
      const url = queryString
        ? `${API_BASE_URL}/dashboard?${queryString}`
        : `${API_BASE_URL}/dashboard`;

      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },

    export: async (params?: {
      status?: string;
      priority?: string;
      startDate?: string;
      endDate?: string;
      format?: 'csv' | 'json';
    }) => {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.priority) queryParams.append('priority', params.priority);
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);
      if (params?.format) queryParams.append('format', params.format);

      const queryString = queryParams.toString();
      const url = queryString
        ? `${API_BASE_URL}/dashboard/export?${queryString}`
        : `${API_BASE_URL}/dashboard/export`;

      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },
  },

  users: {
    getAll: async () => {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },

    getActive: async () => {
      const response = await fetch(`${API_BASE_URL}/users/active`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },

    getById: async (id: string) => {
      const response = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },

    getUserTickets: async (id: string, type: 'created' | 'assigned' = 'created') => {
      const response = await fetch(`${API_BASE_URL}/users/${id}/tickets?type=${type}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },

    update: async (id: string, updates: { name?: string }) => {
      const response = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });
      return handleResponse(response);
    },

    changePassword: async (id: string, passwords: { oldPassword: string; newPassword: string }) => {
      const response = await fetch(`${API_BASE_URL}/users/${id}/change-password`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(passwords),
      });
      return handleResponse(response);
    },
  },

  admin: {
    getAllUsers: async () => {
      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },

    toggleStatus: async (id: string) => {
      const response = await fetch(`${API_BASE_URL}/admin/users/${id}/toggle-status`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },

    resetPassword: async (id: string, data: { newPassword: string }) => {
      const response = await fetch(`${API_BASE_URL}/admin/users/${id}/reset-password`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    },

    deleteUser: async (id: string) => {
      const response = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },
  },

  projects: {
    getAll: async () => {
      const response = await fetch(`${API_BASE_URL}/projects`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },

    create: async (project: { name: string; description?: string; color?: string }) => {
      const response = await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(project),
      });
      return handleResponse(response);
    },

    update: async (id: string, updates: { name?: string; description?: string; color?: string; isActive?: boolean }) => {
      const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });
      return handleResponse(response);
    },

    delete: async (id: string) => {
      const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    },
  },
};