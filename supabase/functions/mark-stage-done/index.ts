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

    const { production_id, stage_key, date, artisans, commission } = await req.json();

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
    const prod = productions.find((p: any) => p.id === production_id);
    if (!prod) {
      return new Response(JSON.stringify({ error: 'Production not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stage = prod.stages?.find((s: any) => s.sk === stage_key);
    if (!stage) {
      return new Response(JSON.stringify({ error: 'Stage not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    stage.date = date;
    stage.artisans = artisans;
    if (commission !== undefined) stage.comm = commission;

    // Auto-complete if all stages done
    const allDone = prod.stages.every((s: any) => s.date);
    if (allDone) prod.status = 'completed';

    await svc.from('app_data').upsert(
      { key: 'productions', value: productions, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
