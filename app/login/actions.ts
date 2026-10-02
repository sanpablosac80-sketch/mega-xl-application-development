'use server'
import { redirect } from 'next/navigation'
import { createAuthClient } from '@/lib/auth/server'
export async function login(formData:FormData){const email=String(formData.get('email')||'').trim();const password=String(formData.get('password')||'');const sb=await createAuthClient();const {error}=await sb.auth.signInWithPassword({email,password});if(error)redirect('/login?error=1');redirect('/')}
export async function logout(){const sb=await createAuthClient();await sb.auth.signOut();redirect('/login')}
