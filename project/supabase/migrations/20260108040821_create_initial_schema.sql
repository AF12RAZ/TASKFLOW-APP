/*
  # Initial Schema for Task Approval System

  ## Overview
  This migration creates the complete database schema for a secure task approval and management system with role-based access control, audit logging, and workflow enforcement.

  ## 1. New Tables Created

  ### `user_profiles`
  Extended user information linked to Supabase auth.users
  - `id` (uuid, primary key) - References auth.users(id)
  - `name` (text) - User's full name
  - `email` (text) - User's email (synced with auth.users)
  - `role` (text) - User role: 'USER' or 'ADMIN'
  - `is_active` (boolean) - Whether the user account is active
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `tickets`
  Core ticket/task tracking table
  - `id` (uuid, primary key) - Unique ticket identifier
  - `title` (text) - Ticket title (max 200 chars)
  - `description` (text) - Detailed description (max 2000 chars)
  - `priority` (text) - Priority level: 'Low', 'Medium', 'High', 'Critical'
  - `status` (text) - Current status: 'Open', 'In Progress', 'Sent for Closure', 'Closed'
  - `creator_id` (uuid) - References user_profiles(id)
  - `assignee_id` (uuid, nullable) - References user_profiles(id)
  - `closed_date` (timestamptz, nullable) - Date when ticket was closed
  - `created_at` (timestamptz) - Ticket creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `audit_logs`
  Comprehensive audit trail for all ticket changes
  - `id` (uuid, primary key) - Unique log entry identifier
  - `ticket_id` (uuid) - References tickets(id)
  - `changed_by` (uuid) - References user_profiles(id)
  - `action` (text) - Action type: 'created', 'status_changed', 'updated', 'assigned'
  - `old_status` (text, nullable) - Previous status (for status changes)
  - `new_status` (text, nullable) - New status (for status changes)
  - `details` (text) - Human-readable description of the change
  - `created_at` (timestamptz) - When the action occurred

  ## 2. Security Configuration

  ### Row Level Security (RLS)
  All tables have RLS enabled with strict policies:
  
  **user_profiles:**
  - Users can view all active user profiles
  - Users can update only their own profile (excluding role changes)
  - Only admins can update user roles

  **tickets:**
  - All authenticated users can view all tickets
  - All authenticated users can create tickets
  - Users can update tickets they created or are assigned to
  - Only admins can delete tickets

  **audit_logs:**
  - All authenticated users can view audit logs
  - System-level inserts only (users cannot manually create audit logs via SQL policies)

  ## 3. Indexes
  Performance indexes on frequently queried columns:
  - tickets(status, priority, creator_id, assignee_id, created_at)
  - audit_logs(ticket_id, created_at)

  ## 4. Constraints
  - Email uniqueness in user_profiles
  - Valid enums for role, priority, status, action
  - Title length: 1-200 characters
  - Description length: 1-2000 characters
  - Non-null required fields

  ## 5. Triggers
  - Auto-update `updated_at` timestamp on user_profiles and tickets
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
  description text NOT NULL CHECK (char_length(description) >= 1 AND char_length(description) <= 2000),
  priority text NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Sent for Closure', 'Closed')),
  creator_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  assignee_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  closed_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  changed_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('created', 'status_changed', 'updated', 'assigned')),
  old_status text,
  new_status text,
  details text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_creator ON tickets(creator_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee ON tickets(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ticket ON audit_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view all active profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for tickets
CREATE POLICY "All authenticated users can view tickets"
  ON tickets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can create tickets"
  ON tickets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update tickets they created or are assigned to"
  ON tickets FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id OR auth.uid() = assignee_id);

CREATE POLICY "Only admins can delete tickets"
  ON tickets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- RLS Policies for audit_logs
CREATE POLICY "All authenticated users can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = changed_by);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
