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

    if (!profile || profile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden — admin only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const production = await req.json();

    const svc = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: existing } = await svc
      .from('app_data')
      .select('value')
      .eq('key', 'productions')
      .single();

    const productions = existing?.value || [];
    production.id = (productions.reduce((max: number, p: any) => Math.max(max, p.id || 0), 0) + 1);
    productions.push(production);

    await svc.from('app_data').upsert(
      { key: 'productions', value: productions, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );

    const { data: existingIds } = await svc
      .from('app_data')
      .select('value')
      .eq('key', 'ids')
      .single();
    const ids = existingIds?.value || {};
    ids.p = (ids.p || 0) + 1;
    await svc.from('app_data').upsert(
      { key: 'ids', value: ids, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );

    return new Response(JSON.stringify({ success: true, id: production.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
