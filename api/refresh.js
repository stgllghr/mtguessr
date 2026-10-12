// Vercel cron (see vercel.json): once a week, start a fresh deploy. Each deploy rebuilds the
// card data from Scryfall (scripts/refresh-cards.mjs). Needs two environment variables in
// Vercel: DEPLOY_HOOK_URL (Settings → Git → Deploy Hooks) and CRON_SECRET (any random string;
// Vercel sends it with cron requests, so nobody else can trigger deploys).
export async function GET(request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  if (!process.env.DEPLOY_HOOK_URL) return new Response('DEPLOY_HOOK_URL is not set', { status: 500 })
  const res = await fetch(process.env.DEPLOY_HOOK_URL, { method: 'POST' })
  return new Response(res.ok ? 'Redeploy started' : `Deploy hook failed: ${res.status}`, { status: res.ok ? 200 : 502 })
}
