# TaskFlow - Secure Task Approval and Management System

A production-ready, secure internal task approval and management system with role-based access control, comprehensive audit logging, and workflow enforcement.

## Features

### Security
- JWT authentication with 7-day token expiration
- Role-based access control (USER and ADMIN roles)
- Rate limiting on all API endpoints (IP and user-based)
- Strict input validation and sanitization
- Row Level Security (RLS) on all database tables
- Secure password hashing via Supabase Auth
- CORS configuration for frontend access
- Security headers (X-Content-Type-Options, X-Frame-Options)

### Workflow Management
- Strict workflow enforcement:
  - Any authenticated user can create tickets (default status: Open)
  - Only ASSIGNEE can move ticket to "In Progress"
  - Only ASSIGNEE can move ticket to "Sent for Closure"
  - Only ADMIN can move ticket to "Closed"
- Comprehensive audit trail for all ticket changes
- Email notifications to admins when tickets are sent for closure

### User Experience
- Modern, responsive UI built with React and Tailwind CSS
- Real-time dashboard with statistics and recent activity
- Ticket filtering by status and priority
- Pagination for large datasets
- CSV export functionality
- Detailed ticket view with audit logs

## Technology Stack

### Backend
- **Database**: Supabase (PostgreSQL with RLS)
- **API**: Supabase Edge Functions (Deno runtime)
- **Authentication**: Supabase Auth (JWT-based)
- **Rate Limiting**: In-memory rate limiting per endpoint

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **HTTP Client**: Fetch API
- **Build Tool**: Vite

## Project Structure

```
├── src/
│   ├── components/          # Reusable components
│   │   ├── Navbar.tsx
│   │   └── ProtectedRoute.tsx
│   ├── contexts/            # React contexts
│   │   └── AuthContext.tsx  # Authentication state management
│   ├── pages/               # Page components
│   │   ├── Landing.tsx      # Landing page
│   │   ├── Auth.tsx         # Login/Register
│   │   ├── Dashboard.tsx    # Statistics dashboard
│   │   ├── TicketsList.tsx  # Tickets list with filters
│   │   ├── CreateTicket.tsx # Create new ticket
│   │   └── TicketDetail.tsx # Ticket details and audit logs
│   ├── types/               # TypeScript interfaces
│   │   └── index.ts
│   ├── utils/               # Utility functions
│   │   └── api.ts           # API client
│   ├── App.tsx              # Main app with routing
│   └── main.tsx             # Entry point
└── supabase/
    └── migrations/          # Database migrations
```

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- A Supabase account and project

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

To get these values:
1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the "Project URL" and "anon/public" key

### 3. Database Setup

The database schema has already been created via Supabase migrations. The following tables are set up:

- **user_profiles**: Extended user information with roles
- **tickets**: Core ticket/task data
- **audit_logs**: Complete audit trail

All tables have Row Level Security (RLS) enabled with appropriate policies.

### 4. Edge Functions

The following Supabase Edge Functions are deployed:

- **auth-register**: User registration
- **auth-login**: User login
- **auth-me**: Get current user
- **tickets**: Complete ticket CRUD operations
- **dashboard**: Statistics and CSV export

### 5. Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## API Endpoints

### Authentication

#### Register
```
POST /functions/v1/auth-register
Body: { name, email, password, role? }
Rate Limit: 5 requests/minute per IP
```

#### Login
```
POST /functions/v1/auth-login
Body: { email, password }
Rate Limit: 10 requests/minute per IP
Returns: { token, user }
```

#### Get Current User
```
GET /functions/v1/auth-me
Headers: Authorization: Bearer {token}
```

### Tickets

#### Create Ticket
```
POST /functions/v1/tickets
Headers: Authorization: Bearer {token}
Body: { title, description, priority, assignee_id? }
Rate Limit: 100 requests/minute per user
```

#### Get All Tickets
```
GET /functions/v1/tickets?status=&priority=&page=1&limit=20
Headers: Authorization: Bearer {token}
Rate Limit: 100 requests/minute per user
```

#### Get Single Ticket
```
GET /functions/v1/tickets/{id}
Headers: Authorization: Bearer {token}
Returns: Ticket with audit logs
```

#### Update Ticket
```
PUT /functions/v1/tickets/{id}
Headers: Authorization: Bearer {token}
Body: { title?, description?, priority?, assignee_id? }
```

#### Update Ticket Status
```
PATCH /functions/v1/tickets/{id}/status
Headers: Authorization: Bearer {token}
Body: { status }
Enforces workflow rules
```

#### Delete Ticket (Admin Only)
```
DELETE /functions/v1/tickets/{id}
Headers: Authorization: Bearer {token}
```

### Dashboard

#### Get Statistics
```
GET /functions/v1/dashboard?startDate=&endDate=
Headers: Authorization: Bearer {token}
Rate Limit: 50 requests/minute per user
```

#### Export to CSV
```
GET /functions/v1/dashboard/export?status=&priority=&format=csv
Headers: Authorization: Bearer {token}
Returns: CSV file
```

## Testing Guide

### 1. Register Users

1. Visit `http://localhost:5173`
2. Click "Register"
3. Create an admin user:
   - Name: Admin User
   - Email: admin@example.com
   - Password: password123
   - Role: ADMIN
4. Create a regular user:
   - Name: Test User
   - Email: user@example.com
   - Password: password123
   - Role: USER

### 2. Test Ticket Workflow

#### As Regular User:
1. Login with user@example.com
2. Create a new ticket:
   - Title: "Test Ticket"
   - Description: "Testing the workflow"
   - Priority: High
   - Assign to: Test User
3. Go to ticket details
4. Click "Move to In Progress" (should work - user is assignee)
5. Click "Send for Closure" (should work)
6. Try to click "Close Ticket" (should NOT appear - not admin)

#### As Admin:
1. Logout and login with admin@example.com
2. Go to tickets list
3. Find the ticket sent for closure
4. Open ticket details
5. Click "Close Ticket" (should work - user is admin)
6. Verify the ticket is now closed
7. Check audit logs show all status changes

### 3. Test Filters and Export

1. Create multiple tickets with different statuses and priorities
2. Use status and priority filters on tickets page
3. Click "Export CSV" to download all tickets
4. Verify CSV contains all ticket data

### 4. Test Security

#### Rate Limiting:
- Try to login with wrong credentials 10+ times in 1 minute
- Should receive "Too many requests" error

#### Authorization:
- Create a ticket as User A, assign to User B
- Login as User B
- Try to move the ticket (should fail - User B is not assignee)

#### Workflow Enforcement:
- Create a ticket (status: Open)
- Try to directly close it without going through workflow
- Should be prevented by backend validation

## Security Features Implemented

### Input Validation
- All user inputs validated for type, length, and format
- Email format validation with regex
- Password minimum length: 6 characters
- Title max length: 200 characters
- Description max length: 2000 characters
- Enum validation for priority and status
- Rejection of unexpected fields

### Rate Limiting
- Registration: 5 requests/minute per IP
- Login: 10 requests/minute per IP
- Tickets: 100 requests/minute per user
- Dashboard: 50 requests/minute per user
- Returns 429 status with clear error message

### Authentication & Authorization
- JWT tokens with 7-day expiration
- Tokens stored in localStorage (client-side)
- All protected endpoints verify token validity
- User role checked on backend for admin operations
- Workflow rules enforced server-side

### Database Security
- Row Level Security enabled on all tables
- Users can only see active user profiles
- Tickets visible to all authenticated users
- Only creators, assignees, or admins can update tickets
- Only admins can delete tickets
- Audit logs readable by all, writable only by system

### Data Protection
- Passwords never stored in plain text (handled by Supabase Auth)
- Sensitive data not exposed in API responses
- CORS configured to allow only frontend origin
- SQL injection prevented by parameterized queries

## Production Deployment Checklist

- [ ] Change default JWT secret
- [ ] Configure production CORS origins
- [ ] Set up email SMTP for notifications
- [ ] Enable HTTPS
- [ ] Configure rate limiting for production load
- [ ] Set up monitoring and logging
- [ ] Regular database backups
- [ ] Security audit of edge functions
- [ ] Load testing
- [ ] Set up CI/CD pipeline

## Troubleshooting

### "Unauthorized" Error
- Check if token is present in localStorage
- Verify token hasn't expired (7 days)
- Try logging out and logging in again

### "Too Many Requests" Error
- Wait 60 seconds before trying again
- Rate limits reset every minute

### Tickets Not Loading
- Check browser console for errors
- Verify Supabase connection
- Check network tab for API responses

### Status Update Failed
- Verify you have permission (assignee or admin)
- Check workflow rules are being followed
- Review audit logs for details

## Support

For issues or questions, check the audit logs in the ticket detail view for detailed information about what happened and who made changes.

## License

Internal use only. All rights reserved.
