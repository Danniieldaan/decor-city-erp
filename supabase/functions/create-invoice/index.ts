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

    const { quote, items } = await req.json();

    // Use service role for writes (bypasses RLS)
    const svc = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch current app_data
    const { data: existing } = await svc
      .from('app_data')
      .select('value')
      .eq('key', 'quotes')
      .single();

    const quotes = existing?.value || [];
    quote.id = (quotes.reduce((max: number, q: any) => Math.max(max, q.id || 0), 0) + 1);
    quote.created_by = user.id;
    quotes.push(quote);

    await svc.from('app_data').upsert(
      { key: 'quotes', value: quotes, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );

    // Handle items
    if (items && items.length) {
      const { data: existingItems } = await svc
        .from('app_data')
        .select('value')
        .eq('key', 'items')
        .single();

      const allItems = existingItems?.value || [];
      items.forEach((item: any) => {
        item.id = (allItems.reduce((max: number, i: any) => Math.max(max, i.id || 0), 0) + 1);
        item.qid = quote.id;
        allItems.push(item);
      });

      await svc.from('app_data').upsert(
        { key: 'items', value: allItems, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
    }

    // Increment IDs
    const { data: existingIds } = await svc
      .from('app_data')
      .select('value')
      .eq('key', 'ids')
      .single();

    const ids = existingIds?.value || {};
    ids.q = (ids.q || 0) + 1;
    ids.i = (ids.i || 0) + (items?.length || 0);

    await svc.from('app_data').upsert(
      { key: 'ids', value: ids, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );

    return new Response(JSON.stringify({ success: true, id: quote.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
