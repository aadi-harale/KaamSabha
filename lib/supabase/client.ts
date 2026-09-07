'use client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null | undefined;
export function getSupabaseBrowserClient() {
  if (browserClient !== undefined) return browserClient;
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const url = env?.VITE_SUPABASE_URL;
  const key = env?.VITE_SUPABASE_PUBLISHABLE_KEY;
  browserClient = url && key ? createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  }) : null;
  return browserClient;
}

export async function claimDemoRole(role: 'customer' | 'worker' | 'admin', entityId?: string) {
  const client = getSupabaseBrowserClient();
  if (!client) return { mode: 'offline' as const };
  let { data: { session } } = await client.auth.getSession();
  if (!session) {
    const result = await client.auth.signInAnonymously();
    if (result.error || !result.data.session) throw new Error('Demo session could not be created.');
    session = result.data.session;
  }
  const response = await fetch('/api/demo/claim-role', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ role, entityId }),
  });
  if (!response.ok) throw new Error((await response.json() as { error?: string }).error || 'Demo role could not be claimed.');
  return { mode: 'connected' as const };
}
