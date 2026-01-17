import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RateLimitStore {
  [key: string]: { count: number; resetAt: number };
}

const rateLimitStore: RateLimitStore = {};

function checkRateLimit(identifier: string, maxRequests = 100, windowMs = 60000): boolean {
  const now = Date.now();
  const record = rateLimitStore[identifier];

  if (!record || now > record.resetAt) {
    rateLimitStore[identifier] = { count: 1, resetAt: now + windowMs };
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

function validateTicketInput(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push('Title is required');
  } else if (data.title.length > 200) {
    errors.push('Title must not exceed 200 characters');
  }

  if (!data.description || typeof data.description !== 'string' || data.description.trim().length === 0) {
    errors.push('Description is required');
  } else if (data.description.length > 2000) {
    errors.push('Description must not exceed 2000 characters');
  }

  if (data.priority && !['Low', 'Medium', 'High', 'Critical'].includes(data.priority)) {
    errors.push('Priority must be Low, Medium, High, or Critical');
  }

  return { valid: errors.length === 0, errors };
}

async function getUserFromToken(req: Request, supabase: any) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile;
}

async function createAuditLog(supabase: any, ticketId: string, userId: string, action: string, details: string, oldStatus?: string, newStatus?: string) {
  await supabase.from('audit_logs').insert({
    ticket_id: ticketId,
    changed_by: userId,
    action,
    old_status: oldStatus,
    new_status: newStatus,
    details,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const user = await getUserFromToken(req, supabase);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!checkRateLimit(`tickets:${user.id}`, 100, 60000)) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const ticketId = pathParts[pathParts.length - 1];
    const isStatusUpdate = url.pathname.endsWith('/status');

    if (req.method === 'POST') {
      let body;
      try {
        body = await req.json();
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const validation = validateTicketInput(body);
      if (!validation.valid) {
        return new Response(
          JSON.stringify({ error: 'Validation failed', details: validation.errors }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const ticketData: any = {
        title: body.title.trim(),
        description: body.description.trim(),
        priority: body.priority || 'Medium',
        status: 'Open',
        creator_id: user.id,
      };

      if (body.assignee_id) {
        ticketData.assignee_id = body.assignee_id;
      }

      const { data: ticket, error: createError } = await supabase
        .from('tickets')
        .insert(ticketData)
        .select('*')
        .single();

      if (createError) {
        return new Response(
          JSON.stringify({ error: 'Failed to create ticket' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await createAuditLog(
        supabase,
        ticket.id,
        user.id,
        'created',
        `Ticket created by ${user.name}`
      );

      return new Response(
        JSON.stringify({ success: true, ticket }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'GET') {
      if (ticketId && ticketId !== 'tickets') {
        const { data: ticket, error: fetchError } = await supabase
          .from('tickets')
          .select(`
            *,
            creator:user_profiles!tickets_creator_id_fkey(id, name, email, role),
            assignee:user_profiles!tickets_assignee_id_fkey(id, name, email, role)
          `)
          .eq('id', ticketId)
          .single();

        if (fetchError || !ticket) {
          return new Response(
            JSON.stringify({ error: 'Ticket not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: auditLogs } = await supabase
          .from('audit_logs')
          .select(`
            *,
            changed_by_user:user_profiles!audit_logs_changed_by_fkey(id, name, email)
          `)
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: false });

        return new Response(
          JSON.stringify({ success: true, ticket, auditLogs: auditLogs || [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const status = url.searchParams.get('status');
      const priority = url.searchParams.get('priority');
      const startDate = url.searchParams.get('startDate');
      const endDate = url.searchParams.get('endDate');
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = (page - 1) * limit;

      let query = supabase
        .from('tickets')
        .select(`
          *,
          creator:user_profiles!tickets_creator_id_fkey(id, name, email),
          assignee:user_profiles!tickets_assignee_id_fkey(id, name, email)
        `, { count: 'exact' });

      if (status) query = query.eq('status', status);
      if (priority) query = query.eq('priority', priority);
      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);

      const { data: tickets, error: fetchError, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (fetchError) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch tickets' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          tickets: tickets || [],
          pagination: {
            page,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit),
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'PATCH' && isStatusUpdate) {
      const actualTicketId = pathParts[pathParts.length - 2];
      
      let body;
      try {
        body = await req.json();
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { status: newStatus } = body;
      if (!['Open', 'In Progress', 'Sent for Closure', 'Closed'].includes(newStatus)) {
        return new Response(
          JSON.stringify({ error: 'Invalid status' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: ticket, error: fetchError } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', actualTicketId)
        .single();

      if (fetchError || !ticket) {
        return new Response(
          JSON.stringify({ error: 'Ticket not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const oldStatus = ticket.status;

      if (newStatus === 'In Progress' && ticket.assignee_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Only the assignee can move ticket to In Progress' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (newStatus === 'Sent for Closure' && ticket.assignee_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Only the assignee can send ticket for closure' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (newStatus === 'Closed' && user.role !== 'ADMIN') {
        return new Response(
          JSON.stringify({ error: 'Only admins can close tickets' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const updateData: any = { status: newStatus };
      if (newStatus === 'Closed') {
        updateData.closed_date = new Date().toISOString();
      }

      const { data: updatedTicket, error: updateError } = await supabase
        .from('tickets')
        .update(updateData)
        .eq('id', actualTicketId)
        .select('*')
        .single();

      if (updateError) {
        return new Response(
          JSON.stringify({ error: 'Failed to update ticket status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await createAuditLog(
        supabase,
        actualTicketId,
        user.id,
        'status_changed',
        `Status changed from ${oldStatus} to ${newStatus} by ${user.name}`,
        oldStatus,
        newStatus
      );

      if (newStatus === 'Sent for Closure') {
        const { data: admins } = await supabase
          .from('user_profiles')
          .select('email, name')
          .eq('role', 'ADMIN')
          .eq('is_active', true);

        console.log('Ticket sent for closure. Admin notification needed:', {
          ticketId: actualTicketId,
          title: ticket.title,
          admins: admins?.map(a => a.email),
        });
      }

      return new Response(
        JSON.stringify({ success: true, ticket: updatedTicket }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'PUT') {
      let body;
      try {
        body = await req.json();
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: ticket, error: fetchError } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (fetchError || !ticket) {
        return new Response(
          JSON.stringify({ error: 'Ticket not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (ticket.creator_id !== user.id && ticket.assignee_id !== user.id && user.role !== 'ADMIN') {
        return new Response(
          JSON.stringify({ error: 'Not authorized to update this ticket' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const updateData: any = {};
      if (body.title) updateData.title = body.title.trim();
      if (body.description) updateData.description = body.description.trim();
      if (body.priority) updateData.priority = body.priority;
      if (body.assignee_id !== undefined) updateData.assignee_id = body.assignee_id;

      const { data: updatedTicket, error: updateError } = await supabase
        .from('tickets')
        .update(updateData)
        .eq('id', ticketId)
        .select('*')
        .single();

      if (updateError) {
        return new Response(
          JSON.stringify({ error: 'Failed to update ticket' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await createAuditLog(
        supabase,
        ticketId,
        user.id,
        'updated',
        `Ticket updated by ${user.name}`
      );

      return new Response(
        JSON.stringify({ success: true, ticket: updatedTicket }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'DELETE') {
      if (user.role !== 'ADMIN') {
        return new Response(
          JSON.stringify({ error: 'Only admins can delete tickets' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: deleteError } = await supabase
        .from('tickets')
        .delete()
        .eq('id', ticketId);

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: 'Failed to delete ticket' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Ticket deleted successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Tickets error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
