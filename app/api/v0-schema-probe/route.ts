export const dynamic = 'force-dynamic'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return Response.json({ env: false })
  const res = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/openapi+json' },
    cache: 'no-store',
  })
  const text = await res.text()
  let spec: Record<string, any> | null = null
  try {
    spec = JSON.parse(text)
  } catch {}
  if (!spec?.definitions) return Response.json({ env: true, status: res.status, body: text.slice(0, 400) })
  const tables = Object.fromEntries(
    Object.entries(spec.definitions as Record<string, any>).map(([t, d]) => [
      t,
      {
        required: d.required ?? [],
        columns: Object.fromEntries(
          Object.entries(d.properties ?? {}).map(([c, p]: [string, any]) => [
            c,
            `${p.format ?? p.type}${p.default !== undefined ? ` default=${p.default}` : ''}${p.enum ? ` enum=${p.enum.join('|')}` : ''}${p.description ? ` | ${String(p.description).replace(/\n/g, ' ')}` : ''}`,
          ]),
        ),
      },
    ]),
  )
  const rpcs = Object.entries(spec.paths as Record<string, any>)
    .filter(([p]) => p.startsWith('/rpc/'))
    .map(([p, v]) => ({ name: p, params: v.post?.parameters?.[0]?.schema?.properties ? Object.keys(v.post.parameters[0].schema.properties) : [] }))
  return Response.json({ env: true, status: res.status, tables, rpcs })
}
