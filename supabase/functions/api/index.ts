import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Handle request routing
Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // Route to appropriate handler
    if (path.startsWith('/api/products')) {
      return await handleProducts(req, path, method);
    } else if (path.startsWith('/api/proposals')) {
      return await handleProposals(req, path, method);
    } else if (path.startsWith('/api/users')) {
      return await handleUsers(req, path, method);
    } else if (path.startsWith('/api/leads')) {
      return await handleLeads(req, path, method);
    } else if (path === '/api/test') {
      return new Response(JSON.stringify({
        message: 'Edge Function is working!',
        timestamp: new Date().toISOString(),
        supabase_configured: !!supabaseUrl && !!supabaseAnonKey
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not Found', { 
      status: 404, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Products handler
async function handleProducts(req: Request, path: string, method: string) {
  try {
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (method === 'POST') {
      const body = await req.json();
      const { name, description, price, category, unit_type } = body;
      
      if (!name || price === undefined || !category || !unit_type) {
        return new Response(JSON.stringify({ 
          error: 'Missing required fields: name, price, category, unit_type' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data, error } = await supabase
        .from('products')
        .insert([{ name, description, price, category, unit_type }])
        .select();

      if (error) throw error;
      
      return new Response(JSON.stringify(data[0]), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('Products error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to handle products request',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Proposals handler (simplified for space)
async function handleProposals(req: Request, path: string, method: string) {
  if (method === 'GET') {
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get proposals for user
    const { data, error: queryError } = await supabase
      .from('proposals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (queryError) throw queryError;
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return new Response('Method not allowed', { 
    status: 405, 
    headers: corsHeaders 
  });
}

// Users handler (simplified)
async function handleUsers(req: Request, path: string, method: string) {
  return new Response(JSON.stringify({ message: 'Users endpoint' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Leads handler (simplified)
async function handleLeads(req: Request, path: string, method: string) {
  return new Response(JSON.stringify({ message: 'Leads endpoint' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}