/**
 * snapshot-prices — Supabase Edge Function
 *
 * Computes the current citywide average price across all mapped bars
 * and inserts one row into price_snapshots. Run daily via cron.
 *
 * Deploy:
 *   supabase functions deploy snapshot-prices
 *
 * Schedule (Supabase Dashboard → Edge Functions → snapshot-prices → Schedule):
 *   0 12 * * *   ← every day at noon UTC
 *
 * Manual invoke:
 *   curl -X POST https://<project>.supabase.co/functions/v1/snapshot-prices \
 *     -H "Authorization: Bearer <service_role_key>"
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// Mirror of the parsePrice logic used on the frontend
function parsePrice(str: string | null): number | null {
  if (!str || str.trim().toLowerCase() === 'ask') return null
  const m = str.match(/\d+(\.\d+)?/)
  return m ? parseFloat(m[0]) : null
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // 1. Fetch all bars that have a price set
  const { data: bars, error: fetchErr } = await supabase
    .from('bars')
    .select('citywide_price')
    .not('citywide_price', 'is', null)

  if (fetchErr) {
    console.error('fetch error:', fetchErr)
    return new Response(JSON.stringify({ error: fetchErr.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 2. Parse prices, drop "Ask" and unparseable values
  const prices = (bars ?? [])
    .map(b => parsePrice(b.citywide_price))
    .filter((p): p is number => p !== null && p > 0)

  if (prices.length === 0) {
    return new Response(
      JSON.stringify({ inserted: false, reason: 'No bars with valid prices.' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // 3. Compute average
  const avg = prices.reduce((s, p) => s + p, 0) / prices.length
  const avg_price = parseFloat(avg.toFixed(2))

  // 4. Insert one snapshot row
  const { error: insertErr } = await supabase
    .from('price_snapshots')
    .insert({ avg_price, bar_count: prices.length })

  if (insertErr) {
    console.error('insert error:', insertErr)
    return new Response(JSON.stringify({ error: insertErr.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  console.log(`snapshot-prices: avg $${avg_price} across ${prices.length} bars`)

  return new Response(
    JSON.stringify({ avg_price, bar_count: prices.length }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
})
