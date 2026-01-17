import { createClient } from 'npm:@supabase/supabase-js@2.39.0';
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RateLimitStore {
  [key: string]: { count: number; resetAt: number };
}

const rateLimitStore: RateLimitStore = {};

function checkRateLimit(identifier: string, maxRequests = 50, windowMs = 60000): boolean {
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

function convertToCSV(tickets: any[]): string {
  if (tickets.length === 0) return 'No data';

  const headers = ['ID', 'Title', 'Description', 'Priority', 'Status', 'Creator', 'Assignee', 'Created At', 'Closed Date'];
  const rows = tickets.map(ticket => [
    ticket.id,
    `"${ticket.title.replace(/"/g, '""')}"`,
    `"${ticket.description.replace(/"/g, '""')}"`,
    ticket.priority,
    ticket.status,
    ticket.creator?.name || 'N/A',
    ticket.assignee?.name || 'N/A',
    new Date(ticket.created_at).toLocaleString(),
    ticket.closed_date ? new Date(ticket.closed_date).toLocaleString() : 'N/A',
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    if (!checkRateLimit(`dashboard:${user.id}`, 50, 60000)) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const isExport = url.pathname.includes('/export');

    if (isExport) {
      const status = url.searchParams.get('status');
      const priority = url.searchParams.get('priority');
      const startDate = url.searchParams.get('startDate');
      const endDate = url.searchParams.get('endDate');
      const format = url.searchParams.get('format') || 'csv';

      let query = supabase
        .from('tickets')
        .select(`
          *,
          creator:user_profiles!tickets_creator_id_fkey(id, name, email),
          assignee:user_profiles!tickets_assignee_id_fkey(id, name, email)
        `);

      if (status) query = query.eq('status', status);
      if (priority) query = query.eq('priority', priority);
      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);

      const { data: tickets, error: fetchError } = await query.order('created_at', { ascending: false });

      if (fetchError) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch tickets' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (format === 'json') {
        return new Response(
          JSON.stringify({ success: true, tickets: tickets || [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const csv = convertToCSV(tickets || []);
      return new Response(csv, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="tickets_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    let query = supabase.from('tickets').select('status, priority, id, title, created_at');
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data: tickets, error: fetchError } = await query;

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch statistics' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stats = {
      total: tickets?.length || 0,
      byStatus: {
        open: tickets?.filter(t => t.status === 'Open').length || 0,
        inProgress: tickets?.filter(t => t.status === 'In Progress').length || 0,
        sentForClosure: tickets?.filter(t => t.status === 'Sent for Closure').length || 0,
        closed: tickets?.filter(t => t.status === 'Closed').length || 0,
      },
      byPriority: {
        low: tickets?.filter(t => t.priority === 'Low').length || 0,
        medium: tickets?.filter(t => t.priority === 'Medium').length || 0,
        high: tickets?.filter(t => t.priority === 'High').length || 0,
        critical: tickets?.filter(t => t.priority === 'Critical').length || 0,
      },
    };

    const { data: recentTickets } = await supabase
      .from('tickets')
      .select(`
        id,
        title,
        status,
        priority,
        created_at,
        creator:user_profiles!tickets_creator_id_fkey(name)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    return new Response(
      JSON.stringify({
        success: true,
        stats,
        recentActivity: recentTickets || [],
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Dashboard error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
