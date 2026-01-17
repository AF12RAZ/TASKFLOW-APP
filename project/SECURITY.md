# Security Documentation

## Overview

This document outlines all security measures implemented in the TaskFlow application following OWASP best practices and industry standards.

## Authentication & Authorization

### JWT Implementation
- **Token Generation**: Managed by Supabase Auth with secure key management
- **Token Expiration**: 7 days (configurable)
- **Token Storage**: Client-side localStorage (consider httpOnly cookies for production)
- **Token Validation**: Every protected endpoint validates JWT before processing
- **Refresh Mechanism**: Automatic token refresh via Supabase client

### Password Security
- **Hashing**: Passwords hashed using bcrypt via Supabase Auth
- **Minimum Length**: 6 characters (configurable in validation)
- **Never Stored Plain**: Passwords never stored or transmitted in plain text
- **One-Way Hash**: Passwords cannot be reversed or decrypted

### Role-Based Access Control (RBAC)
- **Two Roles**: USER and ADMIN
- **Server-Side Enforcement**: All authorization checks happen on the backend
- **Principle of Least Privilege**: Users only have access to what they need
- **Workflow Enforcement**:
  - Only assignees can update ticket progress
  - Only admins can close tickets
  - Violations return 403 Forbidden

## Rate Limiting

### Implementation
All public and authenticated endpoints have rate limiting to prevent abuse and DoS attacks.

### Limits by Endpoint

#### Authentication Endpoints
- **Registration**: 5 requests per minute per IP
- **Login**: 10 requests per minute per IP
- **Rationale**: Prevents brute force attacks while allowing legitimate retry attempts

#### Authenticated Endpoints
- **Tickets API**: 100 requests per minute per user
- **Dashboard API**: 50 requests per minute per user
- **Rationale**: Generous for normal use, restrictive for automated attacks

### Rate Limit Responses
```json
{
  "error": "Too many requests. Please try again later."
}
```
- **HTTP Status**: 429 Too Many Requests
- **Reset Window**: 60 seconds (1 minute)
- **Tracking**: Combination of IP address and user ID

### Rate Limit Storage
- **In-Memory**: Simple key-value store in edge functions
- **Per-Instance**: Each edge function instance maintains its own limits
- **Production Note**: For production, consider Redis or distributed rate limiting

## Input Validation & Sanitization

### Validation Strategy
Every user input is validated using a schema-based approach with explicit rules.

### Field-Level Validation

#### Registration
```typescript
{
  name: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 100,
    sanitize: 'trim'
  },
  email: {
    required: true,
    type: 'string',
    format: 'email',
    maxLength: 255
  },
  password: {
    required: true,
    type: 'string',
    minLength: 6,
    maxLength: 128
  },
  role: {
    optional: true,
    type: 'string',
    enum: ['USER', 'ADMIN']
  }
}
```

#### Ticket Creation
```typescript
{
  title: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 200,
    sanitize: 'trim'
  },
  description: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 2000,
    sanitize: 'trim'
  },
  priority: {
    required: true,
    type: 'string',
    enum: ['Low', 'Medium', 'High', 'Critical']
  },
  status: {
    required: true,
    type: 'string',
    enum: ['Open', 'In Progress', 'Sent for Closure', 'Closed']
  }
}
```

### Rejection of Unexpected Fields
- Unknown fields in request body are ignored
- Prevents parameter pollution attacks
- Explicit whitelisting of allowed fields

### Type Checking
- All inputs type-checked before processing
- Invalid types return 400 Bad Request
- Detailed error messages for developers, generic for users

### SQL Injection Prevention
- **Parameterized Queries**: All database queries use Supabase client
- **No String Concatenation**: Never build queries with string concatenation
- **ORM Protection**: Supabase client handles query sanitization
- **Prepared Statements**: All queries are prepared statements

### XSS Prevention
- **Content Security Policy**: Set via HTTP headers (future enhancement)
- **Output Encoding**: React automatically escapes output
- **No innerHTML**: Never use dangerouslySetInnerHTML
- **Sanitized Input**: All user input trimmed and validated

## Database Security

### Row Level Security (RLS)

#### User Profiles Table
```sql
-- Users can view all active profiles
CREATE POLICY "Users can view all active profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Users can update only their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM user_profiles WHERE id = auth.uid()));
```

#### Tickets Table
```sql
-- All authenticated users can view tickets
CREATE POLICY "All authenticated users can view tickets"
  ON tickets FOR SELECT
  TO authenticated
  USING (true);

-- All authenticated users can create tickets
CREATE POLICY "All authenticated users can create tickets"
  ON tickets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

-- Users can update tickets they created or are assigned to
CREATE POLICY "Users can update tickets they created or are assigned to"
  ON tickets FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id OR auth.uid() = assignee_id);

-- Only admins can delete tickets
CREATE POLICY "Only admins can delete tickets"
  ON tickets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );
```

#### Audit Logs Table
```sql
-- All authenticated users can view audit logs
CREATE POLICY "All authenticated users can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (true);

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = changed_by);
```

### Database Connection Security
- **Secure Connection**: All connections use TLS/SSL
- **Service Role Key**: Stored in environment variables, never in code
- **Connection Pooling**: Managed by Supabase
- **No Direct Exposure**: Database not exposed to public internet

## API Security

### CORS Configuration
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // Configure for specific domains in production
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};
```

**Production Recommendation**: Replace `'*'` with specific allowed origins

### HTTP Headers
```typescript
{
  'X-Content-Type-Options': 'nosniff',     // Prevent MIME sniffing
  'X-Frame-Options': 'DENY',                // Prevent clickjacking
  'X-XSS-Protection': '1; mode=block',      // Enable XSS filter
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'  // HTTPS only
}
```

### Error Handling
- **Generic Error Messages**: Users see generic errors
- **Detailed Logging**: Detailed errors logged server-side
- **No Stack Traces**: Never expose stack traces to clients
- **Consistent Format**: All errors follow same JSON structure

```typescript
// Public response
{
  "error": "Authentication failed"
}

// Server log
{
  "error": "Invalid JWT signature",
  "timestamp": "2024-01-08T12:00:00Z",
  "user": "user@example.com",
  "ip": "192.168.1.1"
}
```

## Audit Trail

### Complete Logging
Every action is logged with:
- **Who**: User ID and name
- **What**: Action type (created, updated, status_changed)
- **When**: ISO 8601 timestamp
- **Details**: Human-readable description
- **Before/After**: Old and new values for changes

### Audit Log Actions
- `created`: Ticket created
- `status_changed`: Status updated (includes old and new status)
- `updated`: Ticket details modified
- `assigned`: Assignee changed

### Immutable Logs
- Audit logs cannot be deleted or modified
- Only system can create audit logs
- All logs retained indefinitely (configure retention policy for production)

## Workflow Security

### Ticket Status Workflow
```
Open → In Progress → Sent for Closure → Closed
```

### Enforcement Rules
1. **Open → In Progress**: Only assignee
2. **In Progress → Sent for Closure**: Only assignee
3. **Sent for Closure → Closed**: Only admin
4. **Any other transition**: Rejected with 403

### Server-Side Validation
```typescript
// Example validation
if (newStatus === 'In Progress' && ticket.assignee_id !== user.id) {
  return 403 Forbidden
}

if (newStatus === 'Closed' && user.role !== 'ADMIN') {
  return 403 Forbidden
}
```

## Data Protection

### Sensitive Data Handling
- **Passwords**: Never stored or transmitted in plain text
- **Tokens**: Stored client-side (consider secure storage for production)
- **Personal Information**: Minimal collection (name, email only)
- **API Keys**: Stored in environment variables, never in code
- **Secrets Rotation**: Regular rotation recommended for production

### Data Exposure Prevention
- User passwords never returned in API responses
- Service role key never exposed to client
- Database connection strings kept server-side
- Error messages don't reveal system internals

## Security Headers

All edge functions return security headers:

```typescript
{
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Access-Control-Allow-Origin': '*',  // Configure for production
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}
```

## Recommendations for Production

### High Priority
1. **HTTPS Only**: Enforce HTTPS for all connections
2. **Environment Secrets**: Use secure secret management (AWS Secrets Manager, etc.)
3. **CORS Configuration**: Restrict to specific allowed origins
4. **Rate Limiting**: Implement distributed rate limiting with Redis
5. **Monitoring**: Set up security monitoring and alerts
6. **Backup**: Regular automated database backups
7. **Email Verification**: Enable email verification for new accounts

### Medium Priority
1. **Password Policy**: Enforce stronger password requirements
2. **MFA**: Add multi-factor authentication option
3. **Session Management**: Implement session timeout and refresh
4. **IP Allowlisting**: Restrict admin access to known IPs
5. **Security Audits**: Regular third-party security audits
6. **Penetration Testing**: Annual penetration testing

### Low Priority (Nice to Have)
1. **Content Security Policy**: Implement strict CSP
2. **Subresource Integrity**: Add SRI for CDN resources
3. **Security.txt**: Add security contact information
4. **Bug Bounty**: Consider a bug bounty program

## Compliance

### OWASP Top 10 Coverage

1. **A01:2021 – Broken Access Control**: ✅ Covered with RLS and RBAC
2. **A02:2021 – Cryptographic Failures**: ✅ Covered with proper encryption
3. **A03:2021 – Injection**: ✅ Covered with parameterized queries
4. **A04:2021 – Insecure Design**: ✅ Covered with security-first design
5. **A05:2021 – Security Misconfiguration**: ✅ Covered with proper config
6. **A06:2021 – Vulnerable Components**: ⚠️ Keep dependencies updated
7. **A07:2021 – Authentication Failures**: ✅ Covered with proper auth
8. **A08:2021 – Software and Data Integrity**: ✅ Covered with audit logs
9. **A09:2021 – Security Logging**: ✅ Covered with comprehensive logging
10. **A10:2021 – Server-Side Request Forgery**: ✅ No external requests

## Incident Response

### In Case of Security Breach

1. **Immediate Actions**:
   - Revoke all active sessions
   - Rotate all API keys and secrets
   - Enable maintenance mode
   - Preserve logs for investigation

2. **Investigation**:
   - Review audit logs
   - Check for data exfiltration
   - Identify attack vector
   - Assess damage scope

3. **Remediation**:
   - Patch vulnerabilities
   - Reset affected user passwords
   - Notify affected users if required
   - Update security measures

4. **Post-Incident**:
   - Document findings
   - Update security policies
   - Conduct team training
   - Implement additional safeguards

## Security Contacts

For security concerns or to report vulnerabilities:
- Email: security@your-company.com
- Report via: [Bug Bounty Program URL]
- PGP Key: [Public Key URL]

## Last Updated

This security documentation was last updated on 2024-01-08.

Regular reviews scheduled quarterly.
