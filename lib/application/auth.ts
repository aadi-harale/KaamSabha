'use client';

import { getSupabaseBrowserClient } from '../supabase/client';
import type { AppRole } from './model';

export type AuthIdentity = {
  userId: string;
  role: AppRole;
  memberId: string | null;
  customerName: string | null;
  mode: 'offline' | 'supabase';
};

type DemoAccount = {
  userId: string;
  role: AppRole;
  memberId: string | null;
  customerName: string | null;
  passwordGroup: 'customer' | 'worker' | 'admin';
};

export const demoAccounts: DemoAccount[] = [
  { userId: 'customer01', role: 'customer', memberId: null, customerName: 'Aadi', passwordGroup: 'customer' },
  { userId: 'meena01', role: 'worker', memberId: 'W01', customerName: null, passwordGroup: 'worker' },
  { userId: 'ravi01', role: 'worker', memberId: 'W02', customerName: null, passwordGroup: 'worker' },
  { userId: 'salim01', role: 'worker', memberId: 'W03', customerName: null, passwordGroup: 'worker' },
  { userId: 'sunita01', role: 'worker', memberId: 'W04', customerName: null, passwordGroup: 'worker' },
  { userId: 'anil01', role: 'worker', memberId: 'W05', customerName: null, passwordGroup: 'worker' },
  { userId: 'farida01', role: 'worker', memberId: 'W06', customerName: null, passwordGroup: 'worker' },
  { userId: 'suresh01', role: 'worker', memberId: 'W07', customerName: null, passwordGroup: 'worker' },
  { userId: 'priya01', role: 'worker', memberId: 'W08', customerName: null, passwordGroup: 'worker' },
  { userId: 'rahul01', role: 'worker', memberId: 'W09', customerName: null, passwordGroup: 'worker' },
  { userId: 'asha01', role: 'worker', memberId: 'W10', customerName: null, passwordGroup: 'worker' },
  { userId: 'imran01', role: 'worker', memberId: 'W11', customerName: null, passwordGroup: 'worker' },
  { userId: 'neha01', role: 'worker', memberId: 'W12', customerName: null, passwordGroup: 'worker' },
  { userId: 'admin01', role: 'admin', memberId: null, customerName: null, passwordGroup: 'admin' },
];

const credentialProofs = {
  customer: {
    salt: 'ks-customer-26089',
    hash: '2b2c579cacae7b52439fe73f9b733687b01d43a850b5161419ac9f565c64c372',
  },
  worker: {
    salt: 'ks-worker-26089',
    hash: '95fd9fcaaf19f0e8dfc4c26a818916f513ac325b99273b53f9a653b2a59a5ddc',
  },
  admin: {
    salt: 'ks-admin-26089',
    hash: '4ad2f8324b0f00208273ac86a80316932ea670287eedd3f57d34431f4b6f15c2',
  },
} as const;

const encoder = new TextEncoder();
async function passwordProof(password: string, salt: string) {
  const material = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: encoder.encode(salt),
      iterations: 120_000,
    },
    material,
    256,
  );
  return Array.from(new Uint8Array(bits), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

function equalProof(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index++)
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

export function internalAuthEmail(userId: string) {
  return `${userId.trim().toLowerCase()}@auth.kaamsabha.local`;
}

export function roleLanding(role: AppRole) {
  return role === 'admin' ? '/operations' : `/${role}`;
}

export function canAccessRolePath(role: AppRole, path: string) {
  if (path === '/' || path.startsWith('/demo')) return true;
  if (role === 'customer') return path === '/customer' || path.startsWith('/customer/');
  if (role === 'worker') return path === '/worker' || path.startsWith('/worker/');
  return path === '/admin' || path.startsWith('/admin/') || path === '/operations' || path.startsWith('/operations/') || path === '/governance';
}

async function authenticateOffline(
  userId: string,
  password: string,
  requestedRole: AppRole,
): Promise<AuthIdentity> {
  const account = demoAccounts.find(
    (item) => item.userId === userId && item.role === requestedRole,
  );
  const proof = credentialProofs[account?.passwordGroup ?? requestedRole];
  const calculated = await passwordProof(password, proof.salt);
  if (!account || !equalProof(calculated, proof.hash))
    throw new Error('User ID or password is incorrect for this role.');
  return { ...account, mode: 'offline' };
}

export async function authenticateUser(
  rawUserId: string,
  password: string,
  requestedRole: AppRole,
): Promise<AuthIdentity> {
  const userId = rawUserId.trim().toLowerCase();
  if (!/^[a-z][a-z0-9]{3,31}$/.test(userId) || !password)
    throw new Error('Enter your User ID and password.');
  const client = getSupabaseBrowserClient();
  if (!client) return authenticateOffline(userId, password, requestedRole);

  const { data, error } = await client.auth.signInWithPassword({
    email: internalAuthEmail(userId),
    password,
  });
  if (error || !data.user)
    throw new Error('User ID or password is incorrect for this role.');
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('userid,app_role,customer_id,worker_id')
    .eq('id', data.user.id)
    .single();
  if (profileError || !profile || profile.userid !== userId) {
    await client.auth.signOut();
    throw new Error('Your KAAMSABHA profile could not be loaded.');
  }
  if (profile.app_role !== requestedRole) {
    await client.auth.signOut();
    throw new Error('This account does not have access to the selected role.');
  }
  let memberId: string | null = null;
  if (requestedRole === 'worker') {
    const { data: worker } = await client
      .from('workers')
      .select('member_number')
      .eq('id', profile.worker_id)
      .single();
    memberId = worker?.member_number ?? null;
    if (!memberId) {
      await client.auth.signOut();
      throw new Error('Your worker-member record could not be loaded.');
    }
  }
  return {
    userId,
    role: requestedRole,
    memberId,
    customerName: requestedRole === 'customer' ? userId : null,
    mode: 'supabase',
  };
}

export async function endAuthenticatedSession() {
  const client = getSupabaseBrowserClient();
  if (client) await client.auth.signOut();
}
