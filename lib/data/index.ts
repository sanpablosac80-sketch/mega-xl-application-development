import 'server-only'
import { connection } from 'next/server'
import type { DataMode, Repository } from '@/lib/types'
import { memoryRepository } from './memory'
import { getSupabase, hasSupabaseEnv, supabaseRepository } from './supabase'

const RECHECK_MS = 30_000
let cached: { mode: DataMode; at: number } | null = null

async function detectMode(): Promise<DataMode> {
  if (!hasSupabaseEnv()) return 'demo'
  try {
    const { error } = await getSupabase()
      .from('configuracion')
      .select('id')
      .limit(1)
      .abortSignal(AbortSignal.timeout(3000))
    return error ? 'demo' : 'supabase'
  } catch {
    return 'demo'
  }
}

export async function getDataMode(): Promise<DataMode> {
  await connection()
  if (cached && (cached.mode === 'supabase' || Date.now() - cached.at < RECHECK_MS)) {
    return cached.mode
  }
  const mode = await detectMode()
  cached = { mode, at: Date.now() }
  return mode
}

export async function getRepository(): Promise<Repository> {
  return (await getDataMode()) === 'supabase' ? supabaseRepository : memoryRepository
}
