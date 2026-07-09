import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'sales')) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const customer = await req.json();

    const svc = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: existing } = await svc
      .from('app_data')
      .select('value')
      .eq('key', 'customers')
      .single();

    const customers = existing?.value || [];
    customer.id = (customers.reduce((max: number, c: any) => Math.max(max, c.id || 0), 0) + 1);
    customer.created_by = user.id;
    customers.push(customer);

    await svc.from('app_data').upsert(
      { key: 'customers', value: customers, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );

    // Increment IDs
    const { data: existingIds } = await svc
      .from('app_data')
      .select('value')
      .eq('key', 'ids')
      .single();
    const ids = existingIds?.value || {};
    ids.c = (ids.c || 0) + 1;
    await svc.from('app_data').upsert(
      { key: 'ids', value: ids, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );

    return new Response(JSON.stringify({ success: true, id: customer.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
