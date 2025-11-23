// Supabase Edge Function: Store Management (create, get, update, delete)
// Endpoint: /store
// Methods: POST (create), GET (get by id), PUT (update), DELETE (delete)
// Requires: Pi Auth (username/uid)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
// @deno-types="https://deno.land/x/supabase_js@2.38.2/mod.d.ts"
import { createClient } from "https://deno.land/x/supabase_js@2.38.2/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Get Supabase env
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: 'Supabase env not set' }), { status: 500, headers: corsHeaders });
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Parse auth header for Pi username/uid (in real use, verify JWT or session)
  const piUsername = req.headers.get('x-pi-username');
  const piUid = req.headers.get('x-pi-uid');
  if (!piUsername || !piUid) {
    return new Response(JSON.stringify({ error: 'Missing Pi Auth headers' }), { status: 401, headers: corsHeaders });
  }

  // Get user id from users table
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('pi_username', piUsername)
    .eq('pi_uuid', piUid)
    .maybeSingle();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: corsHeaders });
  }
  const ownerId = user.id;

  // Route by method
  if (req.method === 'POST') {
    // Create store
    const body = await req.json();
    const { name, description, theme } = body;
    if (!name) {
      return new Response(JSON.stringify({ error: 'Missing store name' }), { status: 400, headers: corsHeaders });
    }
    const { data, error } = await supabase
      .from('stores')
      .insert([{ owner_id: ownerId, name, description, theme }])
      .select()
      .maybeSingle();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }
    return new Response(JSON.stringify(data), { status: 201, headers: corsHeaders });
  }

  if (req.method === 'GET') {
    // Get store by id (from query param)
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing store id' }), { status: 400, headers: corsHeaders });
    }
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) {
      return new Response(JSON.stringify({ error: 'Store not found' }), { status: 404, headers: corsHeaders });
    }
    return new Response(JSON.stringify(data), { status: 200, headers: corsHeaders });
  }

  if (req.method === 'PUT') {
    // Update store (by id)
    const body = await req.json();
    const { id, name, description, theme } = body;
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing store id' }), { status: 400, headers: corsHeaders });
    }
    const { data, error } = await supabase
      .from('stores')
      .update({ name, description, theme })
      .eq('id', id)
      .eq('owner_id', ownerId)
      .select()
      .maybeSingle();
    if (error || !data) {
      return new Response(JSON.stringify({ error: 'Update failed' }), { status: 400, headers: corsHeaders });
    }
    return new Response(JSON.stringify(data), { status: 200, headers: corsHeaders });
  }

  if (req.method === 'DELETE') {
    // Delete store (by id)
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing store id' }), { status: 400, headers: corsHeaders });
    }
    const { error } = await supabase
      .from('stores')
      .delete()
      .eq('id', id)
      .eq('owner_id', ownerId);
    if (error) {
      return new Response(JSON.stringify({ error: 'Delete failed' }), { status: 400, headers: corsHeaders });
    }
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
});
