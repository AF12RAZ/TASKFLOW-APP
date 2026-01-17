export interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  isActive?: boolean;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  isActive: boolean;
  created_at: string;
  createdBy?: {
    name: string;
    email: string;
  };
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Sent for Closure' | 'Closed';
  creator_id: string;
  assignee_id?: string;
  project_id: string;
  closed_date?: string;
  created_at: string;
  updated_at: string;
  creator?: User;
  assignee?: User;
  project?: Project;
}

export interface AuditLog {
  id: string;
  ticket_id: string;
  action: 'created' | 'status_changed' | 'updated' | 'assigned' | 'deleted';
  old_status?: string;
  new_status?: string;
  details: string;
  created_at: string;
  changed_by?: User;
}

export interface DashboardStats {
  total: number;
  byStatus: {
    open: number;
    inProgress: number;
    sentForClosure: number;
    closed: number;
  };
  byPriority: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

export interface RecentActivity {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  creator?: {
    name: string;
  };
}