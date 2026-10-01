import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabaseKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = getSupabaseKey()

  if (!url || !key) {
    return Response.json({ env: false, url: Boolean(url), key: Boolean(key), message: 'Faltan variables de entorno de Supabase' })
  }

  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } })
    const { data, error } = await supabase.from('configuracion').select('id').limit(1)

    if (error) {
      return Response.json({
        env: true,
        connected: false,
        code: error.code ?? null,
        message: error.message,
        details: error.details ?? null,
        hint: error.hint ?? null,
      })
    }

    return Response.json({ env: true, connected: true, table: 'configuracion', rows: data?.length ?? 0 })
  } catch (error) {
    return Response.json({
      env: true,
      connected: false,
      message: error instanceof Error ? error.message : 'Error desconocido',
    })
  }
}
